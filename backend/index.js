const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');
const { createWorker } = require('tesseract.js');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration des dossiers
const uploadDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(__dirname, 'images');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// Configuration de Multer pour les uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF sont acceptés'), false);
    }
  }
});

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Serveur PDF fonctionnel',
    timestamp: new Date().toISOString()
  });
});

// Route d'upload avec conversion en image
app.post('/api/upload', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false,
        error: 'Aucun fichier PDF reçu' 
      });
    }

    console.log('Fichier PDF reçu:', {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      path: req.file.path
    });

    console.log('PDF sauvegardé avec succès');

    res.json({
      success: true,
      message: 'PDF uploadé avec succès',
      file: {
        originalName: req.file.originalname,
        filename: req.file.filename,
        size: req.file.size,
        sizeFormatted: `${(req.file.size / 1024 / 1024).toFixed(2)} MB`,
        path: `/api/pdf/${req.file.filename}`
      }
    });

  } catch (error) {
    console.error('Erreur upload ou conversion:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du traitement du PDF: ' + error.message 
    });
  }
});

// Route pour servir les PDFs
app.get('/api/pdf/:filename', (req, res) => {
  const filename = req.params.filename;
  const pdfPath = path.join(uploadDir, filename);
  
  if (fs.existsSync(pdfPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.sendFile(pdfPath);
  } else {
    res.status(404).json({ error: 'PDF non trouvé' });
  }
});

// Route pour servir le worker PDF.js
app.get('/pdf.worker.js', (req, res) => {
  const workerPath = path.join(__dirname, 'pdf.worker.js');
  if (fs.existsSync(workerPath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(workerPath);
  } else {
    res.status(404).json({ error: 'Worker non trouvé' });
  }
});

// Installer proj4 si pas encore fait
const proj4 = require('proj4');

// Définitions des systèmes de coordonnées
proj4.defs('EPSG:27572', '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs');
proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

// Route pour conversion geofree.fr VRAIE avec proj4
app.post('/api/geofree-convert', async (req, res) => {
  try {
    const { x, y, from, to } = req.body;
    
    console.log('🌐 Conversion VRAIE proj4 pour:', { x, y, from, to });
    
    if (from === 'L2E' && to === 'L93') {
      try {
        // Conversion VRAIE Lambert II étendu → Lambert 93 avec proj4
        const sourceProj = proj4('EPSG:27572'); // Lambert II étendu
        const targetProj = proj4('EPSG:2154');  // Lambert 93
        
        const result = proj4(sourceProj, targetProj, [x, y]);
        
        const convertedX = result[0];
        const convertedY = result[1];
        
        console.log('✅ Conversion proj4 réussie:', {
          input: { x, y },
          output: { x: convertedX, y: convertedY }
        });
        
        res.json({
          success: true,
          x: Math.round(convertedX * 100) / 100,
          y: Math.round(convertedY * 100) / 100,
          source: 'proj4 (conversion VRAIE et précise)'
        });
        
      } catch (projError) {
        console.error('❌ Erreur proj4:', projError);
        res.status(500).json({
          success: false,
          error: 'Erreur conversion proj4: ' + projError.message
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: 'Conversion supportée: L2E → L93 uniquement'
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur conversion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la conversion: ' + error.message
    });
  }
});

// Route pour OCR d'une image déjà extraite
app.post('/api/ocr', async (req, res) => {
  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'Image data manquante'
      });
    }

    // Décoder l'image base64
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log('OCR sur image reçue, taille buffer:', imageBuffer.length);

    // Sauvegarder l'image pour debug
    const debugPath = path.join(__dirname, 'debug_image.png');
    fs.writeFileSync(debugPath, imageBuffer);
    console.log('Image sauvée pour debug:', debugPath);

    // OCR avec Tesseract avec support des accents français
    const worker = await createWorker(['eng', 'fra']);
    
    try {
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzàáâäæçéèêëíìîïñóòôöùúûüýÿ .,:-()\n',
        tessedit_pageseg_mode: '6', // Traiter comme un bloc de texte uniforme
        preserve_interword_spaces: '1', // Préserver les espaces
        tessedit_do_invert: '0', // Pas d'inversion
        tessedit_create_hocr: '0', // Pas de HOCR
        tessedit_create_pdf: '0', // Pas de PDF
      });
      
      const { data: { text, confidence } } = await worker.recognize(imageBuffer);
      
      // Vérifier la qualité du résultat
      if (confidence < 30) {
        console.warn(`Confiance OCR faible: ${confidence}% pour le texte: "${text}"`);
      }
      
      // Nettoyer le texte en préservant la structure et corriger les accents
      const cleanedText = text
      .trim()
      .replace(/\s+/g, ' ') // Normaliser les espaces multiples
      .replace(/['']/g, "'") // Normaliser les apostrophes
      .replace(/[""]/g, '"') // Normaliser les guillemets
      .replace(/\n\s*\n/g, '\n') // Supprimer les lignes vides multiples
      // Corriger les problèmes d'encodage des accents
      .replace(/√©/g, 'é')
      .replace(/√®/g, 'è')
      .replace(/√†/g, 'à')
      .replace(/√¢/g, 'â')
      .replace(/√ª/g, 'ê')
      .replace(/√´/g, 'ô')
      .replace(/√ç/g, 'ç')
      .replace(/√π/g, 'ù')
      .replace(/√¨/g, 'é'); // Autre variante possible

      console.log(`OCR résultat: "${cleanedText}" (confiance: ${confidence.toFixed(2)}%)`);

      res.json({
        success: true,
        text: cleanedText,
        confidence: confidence
      });
      
    } finally {
      await worker.terminate();
    }

  } catch (error) {
    console.error('Erreur OCR:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'OCR: ' + error.message
    });
  }
});

// Gestion des erreurs Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'Fichier trop volumineux (max 10MB)'
      });
    }
  }
  
  if (error.message === 'Seuls les fichiers PDF sont acceptés') {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  res.status(500).json({
    success: false,
    error: 'Erreur serveur'
  });
});

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📁 Dossier d'upload: ${uploadDir}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;