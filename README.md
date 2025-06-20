# 🚀 Outil d'Extraction PDF OCR

✅ Connected to GitHub & Vercel

Outil web pour extraire automatiquement les coordonnées Lambert depuis les documents PDF et les exporter en format Excel.

## Architecture

- **Backend** : Node.js/Express avec Tesseract.js pour l'OCR et pdf2pic pour la conversion PDF en images
- **Frontend** : React avec Vite, react-dropzone pour l'upload, et Tailwind CSS pour le styling
- **Structure** : Monorepo avec dossiers `backend/` et `frontend/`

## ⚡ Installation Rapide

### Option 1 : Installation Automatique (Recommandée)
```bash
git clone [votre-repo] extract-pdf-tool
cd extract-pdf-tool
./install.sh
```

### Option 2 : Docker Manuel
```bash
docker-compose up -d
```

### Option 3 : Installation Locale
```bash
# Backend
cd backend && npm install && node index.js

# Frontend  
cd frontend && npm install && npm run dev
```

## 🌐 Accès

- **Application :** http://localhost:3001
- **API :** http://localhost:5001

## ✨ Fonctionnalités

- ✅ Upload PDF avec validation
- ✅ Sélection multiple de pages
- ✅ Zone d'extraction avec zoom
- ✅ OCR avec validation manuelle
- ✅ Export Excel automatique
- ✅ Gestion des erreurs
- ✅ Sauvegarde progression
- ✅ Interface responsive

## 📖 Documentation

- **👤 Guide Utilisateur :** [README_UTILISATEUR.md](README_UTILISATEUR.md)
- **🚀 Guide Diffusion :** [GUIDE_DIFFUSION.md](GUIDE_DIFFUSION.md)
- **📦 Package Diffusion :** [PACKAGE_DIFFUSION.md](PACKAGE_DIFFUSION.md)

## 🛠️ Technologies

- **Frontend :** React, Vite, PDF.js
- **Backend :** Node.js, Express, Tesseract.js
- **Export :** XLSX, coordonnées Lambert
- **Déploiement :** Docker, Docker Compose

## 📋 Workflow

1. **Upload** → Sélection du fichier PDF
2. **Pages** → Choix des pages à traiter
3. **Zone** → Définition de la zone d'extraction
4. **OCR** → Reconnaissance et validation du texte
5. **Excel** → Export automatique des coordonnées

## 🎯 Format de Sortie

```excel
Colonne A : nom_page
Colonne B : X (coordonnée Est)
Colonne C : Y (coordonnée Nord)
```

## ⚙️ Configuration

Copiez `.env.example` vers `.env` pour personnaliser :
- Ports d'écoute
- Taille max fichiers
- Timeout OCR
- Dossiers de stockage

## 🔧 Commandes Utiles

```bash
# Démarrage
docker-compose up -d

# Arrêt
docker-compose down

# Logs
docker-compose logs -f

# Rebuild
docker-compose up -d --build

# Statut
docker-compose ps
```

## Structure du projet

```
Extract-pdf/
├── backend/
│   ├── index.js              # Serveur Express principal
│   ├── package.json          # Dépendances backend
│   ├── .env                  # Variables d'environnement
│   └── Dockerfile            # Configuration Docker backend
├── frontend/
│   ├── src/
│   │   ├── App.jsx           # Composant principal React
│   │   ├── main.jsx          # Point d'entrée React
│   │   └── index.css         # Styles Tailwind
│   ├── package.json          # Dépendances frontend
│   ├── vite.config.js        # Configuration Vite
│   ├── tailwind.config.js    # Configuration Tailwind
│   ├── Dockerfile            # Configuration Docker frontend
│   └── nginx.conf            # Configuration Nginx
├── docker-compose.yml        # Orchestration Docker
├── .gitignore               # Fichiers à ignorer par Git
└── README.md                # Ce fichier
```

## API Endpoints

### POST /api/upload
Upload et traitement d'un fichier PDF

**Paramètres :**
- `pdf` : Fichier PDF (multipart/form-data)

**Réponse :**
```json
{
  "success": true,
  "text": "Texte extrait du PDF...",
  "pageCount": 3,
  "filename": "document.pdf"
}
```

### GET /api/health
Vérification de l'état de l'API

**Réponse :**
```json
{
  "status": "OK",
  "message": "PDF OCR API is running"
}
```

## Technologies utilisées

### Backend
- Express.js - Framework web
- Multer - Gestion des uploads
- Tesseract.js - OCR (reconnaissance optique de caractères)
- pdf2pic - Conversion PDF vers images
- CORS - Gestion des requêtes cross-origin
- dotenv - Variables d'environnement

### Frontend
- React 18 - Framework frontend
- Vite - Build tool et dev server
- react-dropzone - Composant de glisser-déposer
- Tailwind CSS - Framework CSS
- Axios - Client HTTP

## Variables d'environnement

### Backend (.env)
```
PORT=5000
NODE_ENV=development
UPLOAD_DIR=uploads
```

## Limitations

- Taille maximale des fichiers : 10MB
- Formats supportés : PDF uniquement
- Langues OCR : Français et Anglais
- Les fichiers uploadés sont automatiquement supprimés après traitement

## Développement

### Scripts disponibles

**Backend :**
- `npm start` : Démarrer le serveur en production
- `npm run dev` : Démarrer le serveur en développement avec nodemon

**Frontend :**
- `npm run dev` : Démarrer le serveur de développement Vite
- `npm run build` : Construire l'application pour la production
- `npm run preview` : Prévisualiser la build de production

## 🆘 Support

### Problèmes Courants
- **Port occupé :** Changer les ports dans `docker-compose.yml`
- **PDF non reconnu :** Vérifier format et taille < 10MB
- **OCR échoue :** Améliorer qualité PDF ou zoom

### Debug
```bash
# Logs détaillés
docker-compose logs backend
docker-compose logs frontend

# Redémarrage complet
docker-compose down && docker-compose up -d
```

## 📞 Contact

- **Développeur :** [Votre nom]
- **Email :** [votre-email]
- **Version :** 1.0.0

## Contribution

1. Fork le projet
2. Créer une branche pour votre fonctionnalité
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

## Licence

MIT License