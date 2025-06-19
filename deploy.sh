#!/bin/bash

# 🚀 Script de Déploiement - Outil Extraction PDF OCR
# Usage: ./deploy.sh [production|development]

set -e

MODE=${1:-development}
echo "🚀 Déploiement en mode: $MODE"

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}▶️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérification des prérequis
print_step "Vérification des prérequis..."

if ! command -v docker &> /dev/null; then
    print_error "Docker n'est pas installé!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose n'est pas installé!"
    exit 1
fi

print_success "Docker et Docker Compose sont installés"

# Arrêt des conteneurs existants
print_step "Arrêt des conteneurs existants..."
docker-compose down 2>/dev/null || true

# Construction des images
print_step "Construction des images Docker..."
docker-compose build --no-cache

# Nettoyage des images orphelines
print_step "Nettoyage des images obsolètes..."
docker image prune -f

# Démarrage des services
print_step "Démarrage des services..."
if [ "$MODE" = "production" ]; then
    docker-compose up -d
    print_success "Services démarrés en mode production (arrière-plan)"
else
    print_warning "Mode développement - les logs seront affichés (Ctrl+C pour arrêter)"
    docker-compose up
fi

# Vérification de l'état des services
if [ "$MODE" = "production" ]; then
    print_step "Vérification de l'état des services..."
    
    sleep 5
    
    # Test du backend
    if curl -s http://localhost:5001/api/health > /dev/null; then
        print_success "Backend opérationnel (port 5001)"
    else
        print_error "Backend non accessible"
        exit 1
    fi
    
    # Test du frontend
    if curl -s http://localhost:3001 > /dev/null; then
        print_success "Frontend opérationnel (port 3001)"
    else
        print_error "Frontend non accessible"
        exit 1
    fi
    
    echo ""
    echo "🎉 Déploiement terminé avec succès!"
    echo ""
    echo "📱 Accès à l'application:"
    echo "   Frontend: http://localhost:3001"
    echo "   Backend:  http://localhost:5001"
    echo ""
    echo "🔧 Commandes utiles:"
    echo "   Logs:     docker-compose logs -f"
    echo "   Arrêt:    docker-compose down"
    echo "   Restart:  docker-compose restart"
    echo ""
fi