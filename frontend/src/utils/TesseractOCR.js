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
      // Créer un worker avec français + anglais ET paramètres d'initialisation
      this.worker = await Tesseract.createWorker('fra+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            console.log(`📖 OCR en cours: ${Math.round(m.progress * 100)}%`);
          }
        },
        // PARAMÈTRES D'INITIALISATION (obligatoires ici)
        load_system_dawg: false,
        load_freq_dawg: false,
        load_unambig_dawg: true,    // Pour éviter 9→3
        load_punc_dawg: true,       // Pour les points
        load_number_dawg: true,     // Pour les chiffres
        load_bigram_dawg: false
      });
      
      // Configuration ÉQUILIBRÉE pour reconnaissance fiable
      await this.worker.setParameters({
        // Caractères autorisés complets
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,+-:()éèàùç ',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        
        // Optimisations pour images vectorielles
        preserve_interword_spaces: '1',
        tessedit_do_invert: '0',
        tessedit_write_images: '0',
        
        // Paramètres équilibrés
        classify_enable_learning: '0',
        classify_enable_adaptive_matcher: '1',
        classify_use_pre_adapted_templates: '1',
        
        // Paramètres modérés
        textord_min_xheight: '6',
        textord_noise_rejwords: '0',
        textord_noise_rejrows: '0',
        
        // Qualité équilibrée
        tessedit_good_quality_unrej: '1.0',
        tessedit_quality_rej: '0.0',
        
        // Contraste standard
        classify_norm_adj_midpoint: '96',
        classify_norm_adj_curl: '2',
        
        // Espacement standard
        tosp_old_to_method: '0',
        tosp_old_to_bug_fix: '1'
      });
      
      this.isInitialized = true;
      console.log('✅ Tesseract.js prêt !');
      
    } catch (error) {
      console.error('❌ Erreur initialisation Tesseract:', error);
      throw error;
    }
  }

  /**
   * Pré-traitement SPÉCIALISÉ points décimaux pour images vectorielles
   * @param {HTMLImageElement|HTMLCanvasElement} image 
   * @returns {HTMLCanvasElement}
   */
  static preprocessImage(image) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Déterminer les dimensions source avec validation
    let width, height;
    if (image instanceof HTMLImageElement) {
      width = image.naturalWidth || image.width;
      height = image.naturalHeight || image.height;
    } else {
      width = image.width;
      height = image.height;
    }
    
    // VALIDATION pour éviter divide by zero
    if (!width || !height || width < 10 || height < 10) {
      console.warn('⚠️ Dimensions invalides, utilisation image originale');
      // Retourner image originale sans traitement
      canvas.width = Math.max(width || 100, 100);
      canvas.height = Math.max(height || 100, 100);
      if (width > 0 && height > 0) {
        ctx.drawImage(image, 0, 0);
      }
      return canvas;
    }
    
    // Échelle optimisée pour qualité/vitesse
    const scale = 3.0; // Équilibre optimal pour plans vectorisés
    canvas.width = Math.floor(width * scale);
    canvas.height = Math.floor(height * scale);
    
    // Validation finale des dimensions
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = Math.max(canvas.width, 100);
      canvas.height = Math.max(canvas.height, 100);
    }
    
    // Rendu sécurisé
    ctx.imageSmoothingEnabled = false;
    try {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.warn('⚠️ Erreur rendu image, utilisation simplifiée:', error);
      // Fallback: fond blanc avec cadre noir
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'black';
      ctx.strokeRect(1, 1, canvas.width-2, canvas.height-2);
      return canvas;
    }
    
    // Traitement SPÉCIALISÉ pour AMPLIFIER les points décimaux
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // PHASE 1: Seuillage noir/blanc strict
      for (let i = 0; i < data.length; i += 4) {
        const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
        
        if (brightness > 128) {
          data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
        } else {
          data[i] = 0; data[i + 1] = 0; data[i + 2] = 0;
        }
      }
      
      // PHASE 2: DÉTECTION et AMPLIFICATION des points décimaux
      const amplifiedData = new Uint8ClampedArray(data);
      
      for (let y = 2; y < canvas.height - 2; y++) {
        for (let x = 2; x < canvas.width - 2; x++) {
          const idx = (y * canvas.width + x) * 4;
          
          // Si pixel noir (texte potentiel)
          if (data[idx] < 128) {
            // Vérifier si c'est un POINT isolé (petit élément rond)
            let blackNeighbors = 0;
            let neighborPattern = [];
            
            // Analyser zone 5x5 autour du pixel
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const nIdx = ((y + dy) * canvas.width + (x + dx)) * 4;
                if (data[nIdx] < 128) {
                  blackNeighbors++;
                  neighborPattern.push({x: dx, y: dy});
                }
              }
            }
            
            // Si c'est un petit élément isolé (probable point décimal)
            if (blackNeighbors >= 2 && blackNeighbors <= 8) {
              console.log(`🔍 Point potentiel détecté en (${x},${y}) avec ${blackNeighbors} voisins`);
              
              // AMPLIFIER cette zone (faire un point plus gros)
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const ampIdx = ((y + dy) * canvas.width + (x + dx)) * 4;
                  if (ampIdx >= 0 && ampIdx < amplifiedData.length) {
                    amplifiedData[ampIdx] = 0;     // R
                    amplifiedData[ampIdx + 1] = 0; // G  
                    amplifiedData[ampIdx + 2] = 0; // B
                  }
                }
              }
            }
          }
        }
      }
      
      // Appliquer les améliorations
      ctx.putImageData(new ImageData(amplifiedData, canvas.width, canvas.height), 0, 0);
      
    } catch (error) {
      console.warn('⚠️ Erreur traitement spécialisé, fallback simple:', error);
    }
    
    console.log(`🎯 Image sécurisée: ${width}x${height} → ${canvas.width}x${canvas.height}`);
    return canvas;
  }

  /**
   * Post-traitement INTELLIGENT avec analyse de patterns
   * @param {string} text - Texte OCR brut
   * @param {Object} config - Configuration {decimals: number, coordinateType: string}
   * @returns {string} - Texte corrigé intelligemment
   */
  static fixDecimalPoints(text, config = { decimals: 3, coordinateType: 'lambert' }) {
    console.log('🧠 Correction INTELLIGENTE avec analyse de patterns...');
    console.log('📝 Texte avant correction:', text);
    console.log('⚙️ Config:', config);
    
    let correctedText = text;
    
    // Étape 1: Corrections de base (sûres)
    correctedText = correctedText.replace(/(\d),(\d)/g, '$1.$2'); // Virgules → points
    correctedText = correctedText.replace(/(\d)[°·•‧⋅](\d)/g, '$1.$2'); // Caractères spéciaux
    correctedText = correctedText.replace(/(\d)[Oo](\d)/g, '$1' + '0' + '$2'); // O → 0
    correctedText = correctedText.replace(/\.{2,}/g, '.'); // Doubles points
    
    // Étape 2: ANALYSE INTELLIGENTE des patterns numériques
    const patterns = this.analyzeNumericPatterns(correctedText, config);
    
    // Étape 3: Application des corrections intelligentes
    correctedText = this.applyIntelligentCorrections(correctedText, patterns, config);
    
    if (correctedText !== text) {
      console.log('✅ Texte après correction INTELLIGENTE:', correctedText);
      console.log('🎯 Corrections de patterns appliquées');
    } else {
      console.log('ℹ️ Aucune correction de pattern nécessaire');
    }
    
    return correctedText;
  }
  
  /**
   * Analyse les patterns numériques pour détecter les coordonnées malformées
   * @param {string} text - Texte à analyser
   * @param {Object} config - Configuration
   * @returns {Array} - Patterns détectés
   */
  static analyzeNumericPatterns(text, config) {
    const patterns = [];
    
    // Regex pour détecter différents patterns suspects
    const suspectPatterns = [
      // Pattern 1: "123456 789" (espace au lieu du point)
      {
        regex: /(\d{6,7})\s+(\d{3})/g,
        type: 'space_separated',
        description: 'Coordonnées séparées par espace au lieu de point'
      },
      // Pattern 2: "1234567890" (point complètement absent)
      {
        regex: /(\d{6,7})(\d{3})(?![\d\.])/g,
        type: 'no_separator',
        description: 'Coordonnées sans séparateur décimal'
      },
      // Pattern 3: "123456." (point en fin sans décimales)
      {
        regex: /(\d{6,7})\.(?!\d)/g,
        type: 'trailing_dot',
        description: 'Point sans décimales'
      }
    ];
    
    suspectPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.regex.exec(text)) !== null) {
        patterns.push({
          type: pattern.type,
          description: pattern.description,
          original: match[0],
          start: match.index,
          end: match.index + match[0].length,
          groups: match.slice(1),
          config: config
        });
      }
    });
    
    console.log(`🔍 ${patterns.length} patterns suspects détectés:`, patterns);
    return patterns;
  }
  
  /**
   * Applique les corrections intelligentes basées sur les patterns détectés
   * @param {string} text - Texte original
   * @param {Array} patterns - Patterns détectés
   * @param {Object} config - Configuration
   * @returns {string} - Texte corrigé
   */
  static applyIntelligentCorrections(text, patterns, config) {
    let correctedText = text;
    
    // Trier les patterns par position (de la fin vers le début pour éviter les décalages)
    patterns.sort((a, b) => b.start - a.start);
    
    patterns.forEach(pattern => {
      let replacement = '';
      
      switch (pattern.type) {
        case 'space_separated':
          // "123456 789" → "123456.789"
          replacement = `${pattern.groups[0]}.${pattern.groups[1]}`;
          console.log(`🔧 Correction espace: "${pattern.original}" → "${replacement}"`);
          break;
          
        case 'no_separator':
          // "1234567890" → "1234567.890" (selon config.decimals)
          const integral = pattern.groups[0];
          const decimal = pattern.groups[1];
          if (decimal.length === config.decimals) {
            replacement = `${integral}.${decimal}`;
            console.log(`🔧 Correction point manqué: "${pattern.original}" → "${replacement}"`);
          } else {
            replacement = pattern.original; // Pas de correction si longueur incorrecte
          }
          break;
          
        case 'trailing_dot':
          // "123456." → "123456.000" (selon config.decimals)
          const zeros = '0'.repeat(config.decimals);
          replacement = `${pattern.groups[0]}.${zeros}`;
          console.log(`🔧 Correction point final: "${pattern.original}" → "${replacement}"`);
          break;
          
        default:
          replacement = pattern.original;
      }
      
      // Appliquer la correction
      if (replacement !== pattern.original) {
        correctedText = correctedText.substring(0, pattern.start) + 
                      replacement + 
                      correctedText.substring(pattern.end);
      }
    });
    
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
      
      // Post-traitement INTELLIGENT avec configuration
      const ocrConfig = window.currentOCRConfig || { decimals: 3, coordinateType: 'lambert' };
      const correctedText = this.fixDecimalPoints(text, ocrConfig);
      
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