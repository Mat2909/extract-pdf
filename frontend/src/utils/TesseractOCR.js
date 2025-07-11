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
      
      // Configuration HAUTE PRÉCISION pour images vectorielles parfaites
      await this.worker.setParameters({
        // Caractères complets pour reconnaissance parfaite
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,+-:éèàùç() \n\t',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        
        // OPTIMISATIONS pour images vectorielles PARFAITES
        preserve_interword_spaces: '1',
        tessedit_do_invert: '0',
        tessedit_write_images: '0',
        
        // Garder les dictionnaires pour meilleure précision sur images nettes
        load_system_dawg: '0',     // Pas de dictionnaire général
        load_freq_dawg: '0',       // Pas de fréquences
        load_unambig_dawg: '1',    // GARDER les caractères non-ambigus (9 vs 3)
        load_punc_dawg: '1',       // GARDER la ponctuation (points)
        load_number_dawg: '1',     // GARDER les chiffres
        load_bigram_dawg: '0',     // Pas de bigrammes
        
        // STRICTE précision pour images nettes (pas de tolérance)
        classify_enable_learning: '0',
        classify_enable_adaptive_matcher: '1',
        classify_use_pre_adapted_templates: '1',
        
        // Paramètres STRICTS pour images parfaites
        textord_really_old_xheight: '0',
        textord_min_xheight: '8',              // Plus strict que 5
        textord_noise_rejwords: '1',           // Rejeter les mots douteux
        textord_noise_rejrows: '1',            // Rejeter les lignes douteuses
        
        // Seuils STRICTS pour images parfaites (haute qualité exigée)
        tessedit_good_quality_unrej: '1.2',    // Plus strict (vs 0.8)
        tessedit_quality_rej: '0.2',           // Rejeter basse qualité
        
        // Paramètres optimisés pour contraste parfait
        classify_norm_adj_midpoint: '128',     // Valeur standard pour contraste parfait
        classify_norm_adj_curl: '8',           // Valeur plus stricte
        textord_noise_sizefraction: '0.25',    // Plus strict sur tailles
        textord_noise_translimit: '8',         // Limite plus stricte
        
        // Optimisations spéciales pour images vectorielles
        edges_use_new_outline_complexity: '1',
        edges_debug: '0',
        textord_debug_tabfind: '0',
        
        // Améliorer distinction 9/3, 6/5, etc.
        classify_debug_level: '0',
        classify_learning_debug_level: '0',
        matcher_debug_level: '0',
        
        // Espacement optimisé pour texte vectoriel
        tosp_old_to_method: '1',
        tosp_old_to_bug_fix: '1',
        tosp_enough_space_samples_for_median: '3',
        tosp_redo_kern_limit: '10'
      });
      
      this.isInitialized = true;
      console.log('✅ Tesseract.js prêt !');
      
    } catch (error) {
      console.error('❌ Erreur initialisation Tesseract:', error);
      throw error;
    }
  }

  /**
   * Pré-traitement OPTIMISÉ pour images vectorielles haute qualité
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
    
    // Augmentation modérée pour images vectorielles (déjà nettes)
    const scale = 1.8; // Plus modéré car images déjà parfaites
    canvas.width = width * scale;
    canvas.height = height * scale;
    
    // Rendu PARFAIT pour images vectorielles
    ctx.imageSmoothingEnabled = false; // Pas de lissage sur du vectoriel
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    // Traitement MINIMAL pour images vectorielles (déjà parfaites)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Seuil PRÉCIS pour images vectorielles (contraste parfait)
    const threshold = 128; // Seuil standard pour noir/blanc parfait
    
    // Traitement simple : juste nettoyer le seuil noir/blanc
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      // Calculer la luminosité
      const brightness = (r + g + b) / 3;
      
      if (brightness > threshold) {
        // BLANC PUR
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
      } else {
        // NOIR PUR 
        data[i] = 0;
        data[i + 1] = 0;
        data[i + 2] = 0;
      }
    }
    
    // PAS de post-traitement agressif car images vectorielles déjà parfaites
    ctx.putImageData(imageData, 0, 0);
    
    console.log(`🎯 Image vectorielle optimisée: ${width}x${height} → ${canvas.width}x${canvas.height}`);
    return canvas;
  }

  /**
   * Post-traitement PRUDENT pour corriger UNIQUEMENT les points décimaux évidents
   * @param {string} text - Texte OCR brut
   * @returns {string} - Texte corrigé
   */
  static fixDecimalPoints(text) {
    console.log('🔧 Correction PRUDENTE des points décimaux...');
    console.log('📝 Texte avant correction:', text);
    
    let correctedText = text;
    
    // SEULEMENT des corrections TRÈS SÛRES et CONSERVATRICES
    
    // Pattern 1: Corriger UNIQUEMENT les virgules entre chiffres (très sûr)
    // Ex: "123,456" → "123.456"
    correctedText = correctedText.replace(/(\d),(\d)/g, '$1.$2');
    
    // Pattern 2: Corriger les caractères spéciaux ÉVIDENTS comme séparateurs
    // Ex: "123°456" → "123.456", "123·456" → "123.456" 
    // MAIS SEULEMENT entre chiffres
    correctedText = correctedText.replace(/(\d)[°·•‧⋅](\d)/g, '$1.$2');
    
    // Pattern 3: Corriger les doubles points (sûr)
    correctedText = correctedText.replace(/\.{2,}/g, '.');
    
    // Pattern 4: UNIQUEMENT corriger O en 0 dans des contextes numériques évidents
    // Ex: "12O.456" → "120.456" mais PAS "Lambert" → "Lamoert"
    correctedText = correctedText.replace(/(\d)[Oo](\d)/g, '$1' + '0' + '$2');
    correctedText = correctedText.replace(/(\d)[Oo]\.(\d)/g, '$1' + '0' + '.$2');
    
    // C'EST TOUT ! Plus de corrections agressives
    
    if (correctedText !== text) {
      console.log('✅ Texte après correction PRUDENTE:', correctedText);
      console.log('🎯 Corrections conservatrices appliquées');
    } else {
      console.log('ℹ️ Aucune correction nécessaire');
    }
    
    return correctedText;
  }

  /**
   * Reconnaissance OCR sur une image avec pré-traitement ET post-traitement
   * @param {string|HTMLCanvasElement|HTMLImageElement} image - Image à traiter
   * @returns {Promise<{text: string, confidence: number}>}
   */
  static async recognize(image) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🔍 Démarrage OCR local avec optimisations points décimaux...');
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
      
      // Pré-traitement spécialisé pour les points
      const enhancedImage = this.preprocessImage(processedImage);
      
      // OCR avec image optimisée
      const { data: { text, confidence } } = await this.worker.recognize(enhancedImage);
      
      // Post-traitement pour corriger les points manqués
      const correctedText = this.fixDecimalPoints(text);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ OCR terminé en ${processingTime}ms`);
      console.log(`📊 Confiance: ${confidence}%`);
      console.log(`📝 Texte final: "${correctedText.trim()}"`);

      return {
        text: correctedText.trim(),
        confidence: confidence / 100, // Normaliser 0-1
        processingTime,
        originalText: text.trim() // Garder l'original pour debug
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