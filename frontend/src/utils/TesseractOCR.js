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
      
      // Configuration optimisée pour coordonnées et texte technique
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,+-=()[] \n\t',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK, // Bloc de texte unique
        preserve_interword_spaces: '1',
        tessedit_do_invert: '0'
      });
      
      this.isInitialized = true;
      console.log('✅ Tesseract.js prêt !');
      
    } catch (error) {
      console.error('❌ Erreur initialisation Tesseract:', error);
      throw error;
    }
  }

  /**
   * Reconnaissance OCR sur une image
   * @param {string|HTMLCanvasElement|HTMLImageElement} image - Image à traiter
   * @returns {Promise<{text: string, confidence: number}>}
   */
  static async recognize(image) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    console.log('🔍 Démarrage OCR local...');
    const startTime = Date.now();

    try {
      const { data: { text, confidence } } = await this.worker.recognize(image);
      
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
   * Reconnaissance optimisée pour coordonnées géographiques
   * @param {string|HTMLCanvasElement|HTMLImageElement} image 
   * @returns {Promise<{text: string, confidence: number, coordinates: Array}>}
   */
  static async recognizeCoordinates(image) {
    // Configuration spéciale pour coordonnées
    if (this.worker) {
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789.,+-XY ',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
        classify_bln_numeric_mode: '1'
      });
    }

    const result = await this.recognize(image);
    
    // Extraire les coordonnées du texte
    const coordinatePattern = /([XY]?\s*[+-]?\d+[.,]\d+)/gi;
    const coordinates = (result.text.match(coordinatePattern) || [])
      .map(coord => coord.trim().replace(',', '.'));

    // Restaurer la configuration générale
    if (this.worker) {
      await this.worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,+-=()[] \n\t',
        tesseract_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK
      });
    }

    return {
      ...result,
      coordinates
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