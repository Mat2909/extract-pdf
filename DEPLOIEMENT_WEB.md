#!/bin/bash

# 🚀 Déploiement VPS - PDF Extract Tool
# Usage: curl -sSL [URL-de-ce-script] | bash

set -e

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "${BLUE}▶️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🚀 Déploiement PDF Extract Tool sur VPS"
echo "======================================="

# Variables (à personnaliser)
DOMAIN=${1:-"pdf-extract.local"}
EMAIL=${2:-"admin@example.com"}
REPO_URL=${3:-"https://github.com/votre-user/Extract-pdf.git"}

print_step "Configuration:"
echo "  - Domaine: $DOMAIN"
echo "  - Email: $EMAIL"
echo "  - Repo: $REPO_URL"

# Mise à jour système
print_step "Mise à jour du système..."
apt update && apt upgrade -y

# Installation Docker
print_step "Installation Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_success "Docker installé"
else
    print_success "Docker déjà installé"
fi

# Installation Docker Compose
print_step "Installation Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installé"
else
    print_success "Docker Compose déjà installé"
fi

# Clonage du projet
print_step "Clonage du projet..."
if [ -d "/opt/pdf-extract" ]; then
    cd /opt/pdf-extract
    git pull origin main
    print_success "Projet mis à jour"
else
    git clone $REPO_URL /opt/pdf-extract
    cd /opt/pdf-extract
    print_success "Projet cloné"
fi

# Configuration réseau
print_step "Configuration firewall..."
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443
print_success "Firewall configuré"

# Réseau Docker pour proxy
print_step "Configuration réseau Docker..."
docker network create nginx-proxy 2>/dev/null || true

# Nginx Proxy pour domaines et SSL
print_step "Déploiement proxy Nginx..."
cat > docker-compose.proxy.yml << EOF
version: '3.8'
services:
  nginx-proxy:
    image: nginxproxy/nginx-proxy:alpine
    container_name: nginx-proxy
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock:ro
      - nginx-certs:/etc/nginx/certs
      - nginx-vhost:/etc/nginx/vhost.d
      - nginx-html:/usr/share/nginx/html
    networks:
      - nginx-proxy
    restart: unless-stopped

  acme-companion:
    image: nginxproxy/acme-companion
    container_name: nginx-proxy-acme
    environment:
      - DEFAULT_EMAIL=$EMAIL
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - nginx-certs:/etc/nginx/certs
      - nginx-vhost:/etc/nginx/vhost.d
      - nginx-html:/usr/share/nginx/html
      - nginx-acme:/etc/acme.sh
    depends_on:
      - nginx-proxy
    networks:
      - nginx-proxy
    restart: unless-stopped

networks:
  nginx-proxy:
    external: true

volumes:
  nginx-certs:
  nginx-vhost:
  nginx-html:
  nginx-acme:
EOF

docker-compose -f docker-compose.proxy.yml up -d
print_success "Proxy Nginx déployé"

# Configuration application
print_step "Configuration de l'application..."
cat > docker-compose.prod.yml << EOF
version: '3.8'
services:
  frontend:
    build: ./frontend
    environment:
      - VIRTUAL_HOST=$DOMAIN
      - LETSENCRYPT_HOST=$DOMAIN
      - LETSENCRYPT_EMAIL=$EMAIL
    networks:
      - nginx-proxy
      - app-network
    restart: unless-stopped
    depends_on:
      - backend

  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - CORS_ORIGIN=https://$DOMAIN
      - PORT=5001
    volumes:
      - pdf-uploads:/app/uploads
    networks:
      - app-network
    restart: unless-stopped

networks:
  nginx-proxy:
    external: true
  app-network:
    internal: true

volumes:
  pdf-uploads:
EOF

# Déploiement de l'application
print_step "Déploiement de l'application..."
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
docker-compose -f docker-compose.prod.yml up -d --build

# Attente démarrage
print_step "Vérification du déploiement..."
sleep 30

# Test de santé
if curl -f -s "https://$DOMAIN/api/health" > /dev/null 2>&1; then
    print_success "Application déployée avec succès!"
elif curl -f -s "http://$DOMAIN/api/health" > /dev/null 2>&1; then
    print_warning "Application accessible en HTTP (SSL en cours)"
else
    print_error "Erreur de déploiement"
    print_warning "Vérifiez les logs: docker-compose -f docker-compose.prod.yml logs"
fi

# Création script de mise à jour
cat > /opt/pdf-extract/update.sh << 'EOF'
#!/bin/bash
cd /opt/pdf-extract
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
echo "✅ Mise à jour terminée"
EOF
chmod +x /opt/pdf-extract/update.sh

# Tâche cron de nettoyage
print_step "Configuration maintenance..."
(crontab -l 2>/dev/null; echo "0 2 * * * docker system prune -f > /dev/null 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 3 * * 0 cd /opt/pdf-extract && docker-compose -f docker-compose.prod.yml exec backend find /app/uploads -type f -mtime +7 -delete > /dev/null 2>&1") | crontab -

echo ""
echo "🎉 Déploiement terminé avec succès!"
echo ""
echo "📱 Accès à l'application:"
echo "   🌐 https://$DOMAIN"
echo "   📊 Status: https://$DOMAIN/api/health"
echo ""
echo "🔧 Gestion:"
echo "   📝 Logs: docker-compose -f /opt/pdf-extract/docker-compose.prod.yml logs -f"
echo "   🔄 Update: /opt/pdf-extract/update.sh"
echo "   ⏹️  Stop: docker-compose -f /opt/pdf-extract/docker-compose.prod.yml down"
echo ""
echo "📧 Email à envoyer aux utilisateurs:"
echo "   Sujet: 🚀 Outil PDF Extract disponible"
echo "   Corps: Accédez à l'outil via https://$DOMAIN"
echo "   (Aucune installation requise, ajoutez simplement en favori)"
echo ""