#!/bin/bash

# 🌐 Installation Web PDF Extract Tool
# Usage: curl -sSL [URL] | bash -s domaine.com email@domain.com

set -e

DOMAIN=${1:-"pdf-extract.local"}
EMAIL=${2:-"admin@example.com"}
REPO_URL="https://github.com/votre-user/Extract-pdf.git"

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

cat << "EOF"
  ____  ____  _____   _____      _                  _   
 |  _ \|  _ \|  ___| | ____|_  _| |_ _ __ __ _  ___| |_ 
 | |_) | | | | |_    |  _| \ \/ / __| '__/ _` |/ __| __|
 |  __/| |_| |  _|   | |___ >  <| |_| | | (_| | (__| |_ 
 |_|   |____/|_|     |_____/_/\_\\__|_|  \__,_|\___|\__|
                                                        
🚀 Installation Web - Aucune installation utilisateur requise !
EOF

echo ""
print_step "Configuration du déploiement"
echo "  Domaine: $DOMAIN"
echo "  Email: $EMAIL"
echo ""

# Vérification des prérequis
if [ "$EUID" -ne 0 ]; then
    print_error "Ce script doit être exécuté en tant que root"
    echo "Utilisez: sudo bash ou connectez-vous en root"
    exit 1
fi

# Détection de l'OS
if [ -f /etc/ubuntu-release ] || [ -f /etc/debian_version ]; then
    OS="ubuntu"
elif [ -f /etc/centos-release ] || [ -f /etc/redhat-release ]; then
    OS="centos"
else
    print_warning "OS non détecté, tentative avec Ubuntu..."
    OS="ubuntu"
fi

print_step "OS détecté: $OS"

# Mise à jour système
print_step "Mise à jour du système..."
if [ "$OS" = "ubuntu" ]; then
    apt update && apt upgrade -y
    apt install -y curl git ufw
else
    yum update -y
    yum install -y curl git firewalld
fi

# Installation Docker
install_docker() {
    print_step "Installation Docker..."
    if command -v docker >/dev/null 2>&1; then
        print_success "Docker déjà installé"
    else
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl enable docker
        systemctl start docker
        rm get-docker.sh
        print_success "Docker installé"
    fi
    
    # Docker Compose
    if command -v docker-compose >/dev/null 2>&1; then
        print_success "Docker Compose déjà installé"
    else
        COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
        curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose installé"
    fi
}

# Configuration réseau
configure_firewall() {
    print_step "Configuration du firewall..."
    if [ "$OS" = "ubuntu" ]; then
        ufw --force enable
        ufw allow ssh
        ufw allow 80
        ufw allow 443
    else
        systemctl enable firewalld
        systemctl start firewalld
        firewall-cmd --permanent --add-service=ssh
        firewall-cmd --permanent --add-service=http
        firewall-cmd --permanent --add-service=https
        firewall-cmd --reload
    fi
    print_success "Firewall configuré"
}

# Déploiement de l'application
deploy_app() {
    print_step "Déploiement de l'application..."
    
    # Clonage du projet
    if [ -d "/opt/pdf-extract" ]; then
        cd /opt/pdf-extract
        git pull origin main
    else
        git clone $REPO_URL /opt/pdf-extract
        cd /opt/pdf-extract
    fi
    
    # Réseau Docker
    docker network create nginx-proxy 2>/dev/null || true
    
    # Configuration Nginx Proxy avec SSL
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

    # Configuration de l'application
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

    # Démarrage des services
    docker-compose -f docker-compose.proxy.yml up -d
    docker-compose -f docker-compose.prod.yml down 2>/dev/null || true
    docker-compose -f docker-compose.prod.yml up -d --build
    
    print_success "Application déployée"
}

# Vérification du déploiement
verify_deployment() {
    print_step "Vérification du déploiement..."
    sleep 30
    
    if curl -f -s "https://$DOMAIN/api/health" >/dev/null 2>&1; then
        print_success "Déploiement HTTPS réussi!"
        FINAL_URL="https://$DOMAIN"
    elif curl -f -s "http://$DOMAIN/api/health" >/dev/null 2>&1; then
        print_warning "Application accessible en HTTP (SSL en cours d'activation)"
        FINAL_URL="http://$DOMAIN"
    else
        print_error "Erreur de déploiement"
        echo "Vérifiez les logs: docker-compose -f /opt/pdf-extract/docker-compose.prod.yml logs"
        exit 1
    fi
}

# Configuration maintenance
setup_maintenance() {
    print_step "Configuration de la maintenance..."
    
    # Script de mise à jour
    cat > /opt/pdf-extract/update.sh << 'EOF'
#!/bin/bash
cd /opt/pdf-extract
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build
echo "✅ Mise à jour terminée"
EOF
    chmod +x /opt/pdf-extract/update.sh
    
    # Nettoyage automatique
    (crontab -l 2>/dev/null; echo "0 2 * * * docker system prune -f >/dev/null 2>&1") | crontab -
    (crontab -l 2>/dev/null; echo "0 3 * * 0 find /opt/pdf-extract -name '*.pdf' -mtime +7 -delete >/dev/null 2>&1") | crontab -
    
    print_success "Maintenance configurée"
}

# Affichage final
show_final_info() {
    echo ""
    echo "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS !"
    echo "====================================="
    echo ""
    echo "📱 ACCÈS À L'APPLICATION :"
    echo "   🌐 URL: $FINAL_URL"
    echo "   🔧 Health: $FINAL_URL/api/health"
    echo ""
    echo "👥 POUR VOS COLLÈGUES :"
    echo "   📧 Envoyez-leur simplement l'URL: $FINAL_URL"
    echo "   📌 Ils peuvent l'ajouter en favori (Ctrl+D)"
    echo "   ✅ Aucune installation requise de leur côté"
    echo ""
    echo "🔧 GESTION DE L'APPLICATION :"
    echo "   📝 Logs: docker-compose -f /opt/pdf-extract/docker-compose.prod.yml logs -f"
    echo "   🔄 Mise à jour: /opt/pdf-extract/update.sh"
    echo "   ⏹️  Arrêt: docker-compose -f /opt/pdf-extract/docker-compose.prod.yml down"
    echo "   🔄 Redémarrage: docker-compose -f /opt/pdf-extract/docker-compose.prod.yml restart"
    echo ""
    echo "📧 EMAIL TYPE POUR VOS COLLÈGUES :"
    echo "-----------------------------------"
    echo "Objet: 🚀 Outil PDF Extract disponible"
    echo ""
    echo "Bonjour,"
    echo ""
    echo "L'outil d'extraction PDF est maintenant en ligne :"
    echo "$FINAL_URL"
    echo ""
    echo "✨ Fonctionnalités :"
    echo "- Upload PDF → Export Excel automatique"
    echo "- Aucune installation requise"
    echo "- Accès via simple navigateur"
    echo ""
    echo "📌 Ajoutez le lien en favori pour un accès rapide !"
    echo ""
    echo "Bonne utilisation !"
    echo "-----------------------------------"
    echo ""
    
    if [ "$DOMAIN" = "pdf-extract.local" ]; then
        print_warning "⚠️  Vous utilisez un domaine local (.local)"
        print_warning "Pour un accès externe, configurez un vrai domaine pointant vers cette IP"
    fi
}

# Exécution principale
main() {
    install_docker
    configure_firewall
    deploy_app
    verify_deployment
    setup_maintenance
    show_final_info
}

# Lancement
main "$@"