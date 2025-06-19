# 🚀 Guide de Diffusion - Outil d'Extraction PDF OCR

## 📋 Options de Diffusion

### 🐳 **Option 1 : Docker (Recommandée)**
**Avantages :** Simple, portable, fonctionne sur tous les OS
**Pour qui :** Équipes avec Docker installé

#### Installation pour les collègues :
1. **Prérequis :** Docker Desktop installé
2. **Lancement :**
   ```bash
   git clone [votre-repo]
   cd Extract-pdf
   docker-compose up -d
   ```
3. **Accès :** http://localhost:3001

---

### 🌐 **Option 2 : Serveur Web (Production)**
**Avantages :** Accès via navigateur, aucune installation
**Pour qui :** Utilisation en entreprise

#### Déploiement sur serveur :
- VPS/serveur dédié avec Docker
- Accès via URL : http://votre-serveur.com
- Configuration SSL possible

---

### 💻 **Option 3 : Installation Locale**
**Avantages :** Performance optimale
**Pour qui :** Utilisateurs techniques

#### Instructions d'installation :
1. Node.js 18+ installé
2. Cloner le projet
3. Backend : `npm install && node index.js`
4. Frontend : `npm install && npm run dev`

---

## 🎯 Recommandation par Contexte

| Contexte | Solution | Effort |
|----------|----------|--------|
| **Équipe technique** | Docker | ⭐ Facile |
| **Entreprise** | Serveur web | ⭐⭐ Moyen |
| **Usage personnel** | Installation locale | ⭐⭐⭐ Expert |

---

## 📦 Package de Diffusion

### Contenu à partager :
- [ ] Code source complet
- [ ] Docker-compose.yml
- [ ] Guide d'installation
- [ ] Documentation utilisateur

### Fichiers essentiels :
```
Extract-pdf/
├── docker-compose.yml     # Lancement automatique
├── GUIDE_DIFFUSION.md     # Ce fichier
├── README_UTILISATEUR.md  # Guide utilisateur
├── frontend/              # Interface web
├── backend/               # API et OCR
└── .env.example          # Configuration
```

---

## ⚙️ Configuration Avancée

### Variables d'environnement :
```env
# Backend
PORT=5001
NODE_ENV=production
UPLOAD_MAX_SIZE=10MB

# Frontend
VITE_API_URL=http://localhost:5001
```

### Personnalisation :
- Logo d'entreprise dans `/frontend/public/`
- Couleurs dans `/frontend/src/App.css`
- Limites de fichiers dans `/backend/index.js`

---

## 🔒 Sécurité

### Points d'attention :
- [ ] Pas d'exposition directe sur Internet sans authentification
- [ ] Limitation des tailles de fichiers
- [ ] Nettoyage automatique des fichiers temporaires
- [ ] HTTPS en production

### Recommandations :
- Utiliser derrière un VPN d'entreprise
- Configurer un reverse proxy (nginx)
- Implémenter une authentification si nécessaire

---

## 🚀 Déploiement Rapide

### Pour tester immédiatement :
```bash
# Cloner le projet
git clone [votre-repo]
cd Extract-pdf

# Lancer avec Docker
docker-compose up -d

# Accéder à l'application
open http://localhost:3001
```

### Pour production :
1. Serveur avec Docker installé
2. Configurer les ports (80/443)
3. Ajouter SSL avec Let's Encrypt
4. Configurer les sauvegardes

---

## 📞 Support

### En cas de problème :
1. Vérifier les logs : `docker-compose logs`
2. Redémarrer : `docker-compose restart`
3. Mise à jour : `git pull && docker-compose up -d --build`

### Contact : [votre-email]