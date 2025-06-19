# 📖 Guide Utilisateur - Extraction PDF OCR

## 🎯 Présentation

Cet outil permet d'extraire automatiquement les coordonnées Lambert depuis vos documents PDF et de les exporter en format Excel.

---

## 🚀 Accès à l'Application

### Via Docker (Recommandé)
```bash
docker-compose up -d
```
**Accès :** http://localhost:3001

### Via Installation Locale
**Frontend :** http://localhost:3000  
**Backend :** http://localhost:5001

---

## 📝 Guide d'Utilisation

### Étape 1 : Sélection du PDF
1. Cliquez sur "Choisir un fichier"
2. Sélectionnez votre PDF contenant les coordonnées
3. Cliquez sur "Valider et continuer"

### Étape 2 : Sélection des Pages
**Option A - Rapide :**
- Cliquez sur "Sélectionner toutes les pages"

**Option B - Manuelle :**
- Décochez les pages sans coordonnées
- Cliquez sur "Valider pages sélectionnées"

### Étape 3 : Zone d'Extraction
1. **Naviguez** dans le PDF avec les boutons ← →
2. **Zoomez** si nécessaire (50% à 300%)
3. **Sélectionnez** la zone contenant les coordonnées :
   - Cliquez et glissez sur la zone
   - Vérifiez la sélection (elle reste visible)
   - Cliquez sur "✓ Valider cette zone"

### Étape 4 : Traitement OCR
1. **Test optionnel :** "Tester page 1" pour vérifier
2. **Lancement :** "Démarrer OCR en série"
3. **Validation :** Pour chaque page détectée :
   - Vérifiez le texte OCR
   - Corrigez si nécessaire
   - Cliquez "✓ Valider et continuer"
   - Ou "✖ Annuler le traitement" pour arrêter

### Étape 5 : Export Excel
- Le fichier se télécharge automatiquement
- Format : `nomfichier_coordonnees_YYYY-MM-DD.xlsx`
- Colonnes : A=nom_page, B=X, C=Y

---

## 💡 Conseils d'Utilisation

### 📄 Préparation des PDF
- **Qualité :** PDF de bonne résolution recommandée
- **Format :** A4, A3, A0 supportés
- **Taille :** Maximum 10 MB
- **Type :** PDF avec texte (pas seulement image)

### 🎯 Sélection de Zone
- **Précision :** Sélectionnez uniquement la zone avec coordonnées
- **Zoom :** Utilisez le zoom pour les petits textes
- **Position :** La zone doit contenir "X Y" ou "Lambert"
- **Validation :** Prenez le temps de vérifier avant validation

### 🔍 OCR et Correction
- **Vérification :** Toujours vérifier le texte détecté
- **Correction :** Corrigez les erreurs de reconnaissance
- **Format :** Les coordonnées doivent être "XXXXXX.XXX YYYYYYY.XXX"
- **Annulation :** Possible à tout moment via le bouton rouge

---

## 📊 Format de Sortie

### Fichier Excel Généré
```
Colonne A : nom_page (ex: "plan_architecte_1")
Colonne B : X (coordonnée Est)
Colonne C : Y (coordonnée Nord)
```

### Système de Coordonnées
- **Entrée :** Lambert II étendu (détecté automatiquement)
- **Sortie :** Coordonnées brutes prêtes pour conversion externe
- **Format :** Nombres avec 3 décimales (point décimal)

---

## ⚠️ Résolution des Problèmes

### Problèmes Courants

**"PDF non reconnu"**
- Vérifiez que c'est bien un fichier .pdf
- Taille < 10 MB

**"Aucune coordonnée détectée"**
- Zone trop petite → Agrandissez la sélection
- Texte illisible → Zoomez avant sélection
- PDF image → OCR peut échouer sur images de mauvaise qualité

**"Erreur de traitement"**
- Actualisez la page (F5)
- Relancez l'application
- Vérifiez que le backend fonctionne

**"Site inaccessible"**
- Docker : `docker-compose restart`
- Local : Redémarrer frontend/backend

### Performance
- **Temps :** ~5-10 secondes par page selon complexité
- **Mémoire :** Fermer autres applications si lent
- **Réseau :** Connexion locale, pas d'Internet requis

---

## 🔄 Fonctionnalités Avancées

### Reprise de Traitement
- L'outil sauvegarde automatiquement le progrès
- En cas d'arrêt, possibilité de reprendre où on s'est arrêté
- Bouton "Effacer progrès" pour repartir à zéro

### Navigation
- **Précédent :** Retour aux étapes antérieures
- **Nouvelle extraction :** Remise à zéro complète
- **Zoom :** Molette souris ou boutons +/-

### Gestion des Pages
- Prévisualisation de toutes les pages
- Sélection/désélection individuelles
- Compteur de pages sélectionnées

---

## 📞 Support

### Auto-diagnostic
1. Tester avec un PDF simple d'abord
2. Vérifier les logs navigateur (F12)
3. Redémarrer l'application

### Contact
- Email : [votre-email]
- Documentation : README_TECHNIQUE.md