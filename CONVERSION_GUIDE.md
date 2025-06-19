# 🎯 Guide de Conversion Lambert II étendu → Lambert 93

## Votre CSV contient des coordonnées en Lambert II étendu (L2E)

### Option 1 : IGN Géoportail (Recommandé - Gratuit)
1. Aller sur https://geodesie.ign.fr/fiches/pdf/transfo.pdf
2. Ou utiliser l'outil en ligne https://geodesie.ign.fr/index.php?page=transfo
3. Charger votre CSV et convertir en lot

### Option 2 : QGIS (Logiciel gratuit - Idéal pour gros volumes)
1. Télécharger QGIS : https://qgis.org/
2. Importer votre CSV : "Couche" > "Ajouter une couche" > "Texte délimité"
3. Définir le système source : EPSG:27572 (Lambert II étendu)
4. Reprojeter vers EPSG:2154 (Lambert 93) : "Vecteur" > "Outils de gestion de données" > "Reprojeter une couche"
5. Exporter en CSV

### Option 3 : geofree.fr (Manuel - Petits volumes)
1. Aller sur http://geofree.fr/gf/coordinateconv.asp
2. Copier-coller vos coordonnées une par une
3. Système source : Lambert II étendu
4. Système cible : Lambert 93

### Option 4 : Outil en ligne proj4 
1. Utiliser https://epsg.io/transform
2. Source : EPSG:27572 (Lambert II étendu)
3. Target : EPSG:2154 (Lambert 93)

## Format de vos coordonnées dans le CSV :
- **Colonne X_Lambert2E** : Coordonnée X en Lambert II étendu
- **Colonne Y_Lambert2E** : Coordonnée Y en Lambert II étendu  
- **Résultat attendu** : Coordonnées en Lambert 93 (RGF93)

## Exemple de conversion :
- **L2E** : X=594368.498, Y=1843413.039
- **L93** : X≈640784, Y≈6277337

## ⚡ Recommandation :
Pour des volumes importants (>50 points), utilisez **QGIS** qui peut traiter tout le CSV d'un coup.