#!/bin/bash

# 🚀 Installation Automatique - Outil Extraction PDF OCR
# Compatible : Ubuntu, macOS, Windows (WSL)

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

echo "🚀 Installation Outil Extraction PDF OCR"
echo "========================================="

# Détection de l'OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi

print_step "OS détecté: $OS"

# Installation Docker selon l'OS
install_docker() {
    if command -v docker &> /dev/null; then
        print_success "Docker déjà installé"
        return
    fi

    print_step "Installation de Docker..."
    
    case $OS in
        "linux")
            # Ubuntu/Debian
            sudo apt update
            sudo apt install -y docker.io docker-compose
            sudo systemctl start docker
            sudo systemctl enable docker
            sudo usermod -aG docker $USER
            ;;
        "macos")
            print_warning "Sur macOS, installez Docker Desktop manuellement :"
            print_warning "https://docs.docker.com/desktop/install/mac-install/"
            exit 1
            ;;
        "windows")
            print_warning "Sur Windows, installez Docker Desktop manuellement :"
            print_warning "https://docs.docker.com/desktop/install/windows-install/"
            exit 1
            ;;
    esac
}

# Clonage du projet (si pas déjà fait)
setup_project() {
    if [ ! -f "docker-compose.yml" ]; then
        print_error "Fichier docker-compose.yml non trouvé!"
        print_warning "Assurez-vous d'être dans le dossier du projet"
        exit 1
    fi
    print_success "Projet trouvé"
}

# Installation et démarrage
main() {
    print_step "Vérification du projet..."
    setup_project
    
    print_step "Vérification de Docker..."
    if ! command -v docker &> /dev/null; then
        install_docker
        print_warning "⚠️  Vous devez redémarrer votre session après installation Docker"
        print_warning "Puis relancer : ./install.sh"
        exit 0
    fi
    
    print_step "Vérification de Docker Compose..."
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose non trouvé!"
        exit 1
    fi
    
    print_step "Construction et démarrage des services..."
    docker-compose down 2>/dev/null || true
    docker-compose build
    docker-compose up -d
    
    print_step "Vérification des services..."
    sleep 10
    
    # Test des services
    if curl -s http://localhost:5001/api/health > /dev/null 2>&1; then
        print_success "Backend opérationnel"
    else
        print_error "Backend non accessible"
        print_warning "Vérifiez les logs: docker-compose logs backend"
    fi
    
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        print_success "Frontend opérationnel"
    else
        print_error "Frontend non accessible"
        print_warning "Vérifiez les logs: docker-compose logs frontend"
    fi
    
    echo ""
    echo "🎉 Installation terminée!"
    echo ""
    echo "📱 Accès à l'application:"
    echo "   🌐 http://localhost:3001"
    echo ""
    echo "🔧 Commandes utiles:"
    echo "   📊 État:     docker-compose ps"
    echo "   📝 Logs:     docker-compose logs -f"
    echo "   🔄 Restart:  docker-compose restart"
    echo "   ⏹️  Arrêt:    docker-compose down"
    echo ""
}

main "$@"