# PDF OCR Extractor V2 - Architecture Modulaire

## Vue d'ensemble

La version 2 de l'application introduit une architecture modulaire et configurable permettant de créer facilement de nouveaux profils métier avec des workflows personnalisés.

## Architecture

### Structure des dossiers

```
src/
├── data/                     # Configuration temporaire (remplacera la BDD)
│   └── appConfig.json       # Configuration des modules et profils
├── modules/                 # Modules réutilisables
│   ├── BaseModule.jsx       # Classe de base pour tous les modules
│   ├── UploadModule.jsx     # Module d'upload de fichiers
│   ├── PageSelectionModule.jsx
│   ├── ZoneSelectionModule.jsx
│   ├── OCRProcessingModule.jsx
│   ├── CoordinateExtractionModule.jsx
│   ├── ValidationModule.jsx
│   └── ExportModule.jsx
├── profiles/                # Configurations spécifiques aux profils
├── utils/                   # Utilitaires et gestionnaires
│   ├── profileManager.js    # Gestionnaire des profils
│   ├── WorkflowEngine.js    # Moteur de workflow
│   └── admin/               # Outils d'administration
├── components/              # Composants UI réutilisables
│   └── admin/               # Interface d'administration
├── AppV2.jsx               # Application principale V2
└── main-v2.jsx             # Point d'entrée V2
```

## Concepts clés

### 1. Modules

Les modules sont des composants autonomes qui peuvent être :
- **Activés/désactivés** selon les profils
- **Configurés** individuellement
- **Enchaînés** dans différents ordres
- **Réutilisés** dans plusieurs profils

#### Modules disponibles :
- `UPLOAD` : Téléchargement de fichiers PDF
- `PAGE_SELECTION` : Sélection des pages à traiter
- `ZONE_SELECTION` : Définition des zones d'extraction
- `OCR_PROCESSING` : Traitement OCR
- `COORDINATE_EXTRACTION` : Extraction de coordonnées
- `VALIDATION` : Validation manuelle des résultats
- `EXPORT` : Export des données

### 2. Profils

Les profils définissent :
- **Quels modules** utiliser
- **Dans quel ordre** les exécuter
- **Avec quelle configuration**

#### Profils actuels :
- **GrDF** : Workflow complet avec extraction de coordonnées Lambert
- **SFR** : Workflow simplifié sans sélection de zone

### 3. WorkflowEngine

Le moteur de workflow :
- **Orchestre** l'exécution des modules
- **Gère** les transitions entre étapes
- **Stocke** les données inter-modules
- **Calcule** la progression

### 4. ProfileManager

Le gestionnaire de profils :
- **Charge** les configurations
- **Valide** les profils
- **Gère** les permissions utilisateur
- **Permet** la création/modification (admin)

## Configuration

### Format de configuration (appConfig.json)

```json
{
  "modules": {
    "MODULE_ID": {
      "id": "module-id",
      "name": "Nom du module",
      "description": "Description",
      "component": "ComponentName",
      "required": false,
      "config": { ... }
    }
  },
  "profiles": {
    "PROFILE_ID": {
      "id": "profile-id",
      "name": "Nom du profil",
      "modules": ["MODULE_1", "MODULE_2"],
      "config": { ... }
    }
  }
}
```

### Création d'un nouveau profil

```javascript
// Pour les administrateurs
profileManager.createProfile({
  id: 'orange',
  name: 'Orange',
  description: 'Opérateur télécom',
  modules: ['UPLOAD', 'OCR_PROCESSING', 'EXPORT'],
  config: {
    coordinateSystem: 'WGS84',
    exportFormat: 'csv'
  }
});
```

## Utilisation

### Développement

```bash
# Démarrer l'application V2
npm run dev -- --mode v2

# Ou modifier vite.config.js pour pointer vers main-v2.jsx
```

### Tests

```bash
# Tester un profil spécifique
workflowEngine.initialize('grdf');

# Valider une configuration
profileManager.validateProfile(profileData);
```

## Extensibilité

### Ajouter un nouveau module

1. Créer le composant en héritant de `BaseModule`
2. L'enregistrer dans `WorkflowEngine`
3. L'ajouter à la configuration JSON
4. L'utiliser dans les profils

### Ajouter un nouveau profil

1. Définir la configuration dans `appConfig.json`
2. Ou utiliser `profileManager.createProfile()` (admin)

## Permissions

### Utilisateur standard
- Utiliser les profils existants
- Exporter ses données
- Voir ses résultats

### Administrateur
- Créer/modifier/supprimer des profils
- Gérer les modules
- Accéder à toutes les données
- Importer/exporter la configuration

## Migration depuis V1

L'ancienne version reste accessible. La V2 est une réécriture complète avec :
- ✅ Architecture modulaire
- ✅ Système de profils
- ✅ Gestion des permissions
- ✅ Configuration flexible
- ✅ Interface professionnelle

## Prochaines étapes

1. **Implémentation des modules manquants**
2. **Interface d'administration**
3. **Base de données** (remplacer appConfig.json)
4. **Authentification** utilisateur
5. **API REST** pour la gestion
6. **Tests unitaires** et d'intégration