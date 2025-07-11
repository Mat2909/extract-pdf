import Tesseract from 'tesseract.js';

/**
 * OCR local avec Tesseract.js - GRATUIT et ILLIMITÉ !
 * Plus de timeout, plus de limite, plus de dépendance externe
 */
export class TesseractOCR {
  static worker = null;
  static isInitialized = false;

  /**
   * Initialise le worker Tesseract (à faire une seule fois)
   */
  static async initialize() {
    if (this.isInitialized) return;
    
    console.log('🤖 Initialisation Tesseract.js...');
    
    try {
      // Créer un worker avec français + anglais
      this.worker = await Tesseract.createWorker('fra+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`📖 OCR en cours: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      // Configuration HAUTE PRÉCISION pour coordonnées et texte technique
      await this.worker.setParameters({
        // Améliorer la reconnaissance des caractères
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,+-=()[]XY \n\t',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        
        // Améliorations de précision
        preserve_interword_spaces: '1',
        tessedit_do_invert: '0',
        tessedit_write_images: '0',
        
        // Optimisations OCR Engine
        load_system_dawg: '0',
        load_freq_dawg: '0',
        load_unambig_dawg: '0',
        load_punc_dawg: '0',
        load_number_dawg: '1', // Garder les chiffres
        load_bigram_dawg: '0',
        
        // Améliorer la détection des chiffres et coordonnées
        classify_enable_learning: '0',
        classify_enable_adaptive_matcher: '1',
        classify_use_pre_adapted_templates: '1',
        
        // Qualité d'image
        textord_really_old_xheight: '1',
        textord_min_xheight: '10',
        
        // Seuils de confiance
        tessedit_good_quality_unrej: '1.1',
        tessedit_quality_rej: '0.0'
      });
      
      this.isInitialized = true;
      console.log('✅ Tesseract.js prêt !');
      
    } catch (error) {
      console.error('❌ Erreur initialisation Tesseract:', error);
      throw error;
    }
  }

  /**
   * Pré-traitement d'image pour améliorer la précision OCR
   * @param {HTMLImageElement|HTMLCanvasElement} image 
   * @returns {HTMLCanvasElement}
   */
  static preprocessImage(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Déterminer les dimensions source
    let width, height;
    if (image instanceof HTMLImageElement) {
      width = image.naturalWidth || image.width;
      height = image.naturalHeight || image.height;
    } else {
      width = image.width;
      height = image.height;
    }
    
    // Augmenter la résolution pour améliorer la précision
    const scale = 1.5; // Augmentation de 50%
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    // Améliorer la qualité de rendu
    ctx.imageSmoothingEnabled = false; // Pas de lissage pour les textes nets
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Appliquer des filtres pour améliorer la lisibilité
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Améliorer le contraste et la netteté
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculer la luminosité
      const brightness = (r + g + b) / 3;
      
      // Augmenter le contraste (seuil adaptatif)
      const threshold = 128;
      const factor = 1.2; // Facteur de contraste
      
      if (brightness > threshold) {
        // Éclaircir les zones claires
        data[i] = Math.min(255, r * factor);
        data[i + 1] = Math.min(255, g * factor);
        data[i + 2] = Math.min(255, b * factor);
      } else {
        // Assombrir les zones sombres
        data[i] = Math.max(0, r / factor);
        data[i + 1] = Math.max(0, g / factor);
        data[i + 2] = Math.max(0, b / factor);
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
    
    console.log(`🖼️ Image pré-traitée: ${width}x${height} → ${canvas.width}x${canvas.height}`);
    return canvas;
  }

  /**
   * Reconnaissance OCR sur une image avec pré-traitement
   * @param {string|HTMLCanvasElement|HTMLImageElement} image - Image à traiter
   * @returns {Promise<{text: string, confidence: number}>}
   */
  static async recognize(image) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🔍 Démarrage OCR local avec pré-traitement...');
    const startTime = Date.now();

    try {
      // Convertir en Image si c'est une string base64
      let processedImage = image;
      if (typeof image === 'string') {
        const img = new Image();
        img.src = image;
        await new Promise(resolve => img.onload = resolve);
        processedImage = img;
      }
      
      // Pré-traitement pour améliorer la précision
      const enhancedImage = this.preprocessImage(processedImage);
      
      // OCR avec image améliorée
      const { data: { text, confidence } } = await this.worker.recognize(enhancedImage);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ OCR terminé en ${processingTime}ms`);
      console.log(`📊 Confiance: ${confidence}%`);
      console.log(`📝 Texte reconnu: "${text.trim()}"`);

      return {
        text: text.trim(),
        confidence: confidence / 100, // Normaliser 0-1
        processingTime
      };

    } catch (error) {
      console.error('❌ Erreur OCR:', error);
      throw new Error(`Erreur OCR local: ${error.message}`);
    }
  }

  /**
   * Reconnaissance ULTRA-PRÉCISE pour coordonnées géographiques
   * @param {string|HTMLCanvasElement|HTMLImageElement} image 
   * @returns {Promise<{text: string, confidence: number, coordinates: Array}>}
   */
  static async recognizeCoordinates(image) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Configuration ULTRA-SPÉCIALISÉE pour coordonnées
    console.log('🎯 Configuration spéciale coordonnées...');
    await this.worker.setParameters({
      // Caractères autorisés: chiffres, points, virgules, +/-, X, Y, espaces
      tessedit_char_whitelist: '0123456789.,+-XY ',
      
      // Mode de segmentation optimisé pour coordonnées
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_TEXTLINE,
      
      // Optimisations numériques
      classify_bln_numeric_mode: '1',
      numeric_restriction: '1',
      
      // Désactiver la correction orthographique (inutile pour les chiffres)
      load_system_dawg: '0',
      load_freq_dawg: '0',
      load_unambig_dawg: '0',
      load_punc_dawg: '0',
      load_number_dawg: '1', // Garder les chiffres
      load_bigram_dawg: '0',
      
      // Améliorer la reconnaissance des chiffres
      classify_enable_adaptive_matcher: '1',
      classify_use_pre_adapted_templates: '1',
      
      // Seuils très stricts pour les coordonnées
      tessedit_good_quality_unrej: '1.3',
      tessedit_quality_rej: '0.0'
    });

    // OCR avec pré-traitement spécialisé
    const result = await this.recognize(image);
    
    // Extraction intelligente des coordonnées avec patterns multiples
    const patterns = [
      /([XY]?\s*[+-]?\d+[.,]\d+)/gi,           // Format standard: X123.456
      /(\d+[.,]\d+\s*[+-]?\d+[.,]\d+)/gi,     // Format: 123.456 789.012
      /([+-]?\d{6,}\.\d{3})/gi,               // Format Lambert: 654321.123
      /([XY]\s*[=:]\s*\d+[.,]\d+)/gi          // Format: X = 123.456
    ];
    
    let coordinates = [];
    
    // Essayer tous les patterns
    for (const pattern of patterns) {
      const matches = result.text.match(pattern) || [];
      coordinates = coordinates.concat(matches.map(coord => 
        coord.trim()
             .replace(',', '.')
             .replace(/[XY]\s*[=:]\s*/, '') // Nettoyer X= ou Y:
             .trim()
      ));
    }
    
    // Dédupliquer et valider
    coordinates = [...new Set(coordinates)]
      .filter(coord => {
        const num = parseFloat(coord);
        return !isNaN(num) && num > 0; // Coordonnées positives valides
      });

    console.log(`🎯 Coordonnées extraites: ${coordinates.length} trouvées`);
    
    // Restaurer la configuration générale
    await this.worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,+-=()[]XY \n\t',
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      classify_bln_numeric_mode: '0',
      numeric_restriction: '0'
    });

    return {
      ...result,
      coordinates,
      coordinateCount: coordinates.length
    };
  }

  /**
   * Nettoie les ressources (à appeler à la fermeture de l'app)
   */
  static async terminate() {
    if (this.worker) {
      console.log('🔄 Fermeture Tesseract.js...');
      await this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
      console.log('✅ Tesseract.js fermé');
    }
  }

  /**
   * Vérifie si Tesseract est disponible
   */
  static isAvailable() {
    return typeof Tesseract !== 'undefined';
  }

  /**
   * Traitement en batch de plusieurs images
   * @param {Array} images - Array d'images à traiter
   * @param {Function} onProgress - Callback de progression
   * @returns {Promise<Array>}
   */
  static async recognizeBatch(images, onProgress = null) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const results = [];
    
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      console.log(`📖 Traitement image ${i + 1}/${images.length}...`);
      
      try {
        const result = await this.recognize(image);
        results.push({
          success: true,
          pageIndex: i,
          ...result
        });
      } catch (error) {
        console.error(`❌ Erreur page ${i + 1}:`, error);
        results.push({
          success: false,
          pageIndex: i,
          error: error.message
        });
      }

      // Callback de progression
      if (onProgress) {
        onProgress(i + 1, images.length, results[i]);
      }
    }

    return results;
  }
}

// Auto-initialisation au chargement du module
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    TesseractOCR.initialize().catch(console.error);
  });

  // Nettoyage à la fermeture
  window.addEventListener('beforeunload', () => {
    TesseractOCR.terminate();
  });
}

export default TesseractOCR;