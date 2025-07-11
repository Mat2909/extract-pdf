import React from 'react';
import BaseModule from './BaseModule';
import TesseractOCR from '../utils/TesseractOCR';
import OCRConfigDialog from '../components/OCRConfigDialog';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Module de traitement OCR
 * Traite les pages sélectionnées et extrait le texte
 */
class OCRProcessingModule extends BaseModule {
  constructor(props) {
    super(props);
    
    this.state = {
      ...this.state,
      isProcessing: false,
      currentPage: 0,
      totalPages: 0,
      results: [],
      showValidation: false,
      currentImageData: null,
      correctedText: '',
      confidence: 0,
      isCancelled: false,
      showConfigDialog: false,
      ocrConfig: { decimals: 3, coordinateType: 'lambert', autoFix: true }
    };
  }

  static defaultConfig = {
    engine: 'tesseract.js',
    language: 'fra+eng',
    scale: 3.0,
    batchMode: true,
    validationRequired: true
  };

  initialize(config) {
    this.config = { ...OCRProcessingModule.defaultConfig, ...config };
  }

  validateInput(workflowData) {
    const errors = [];

    const uploadData = workflowData?.upload;
    if (!uploadData?.url) {
      errors.push('Aucun fichier PDF trouvé');
    }

    const pageData = workflowData?.['page-selection'];
    if (!pageData?.selectedPages || pageData.selectedPages.length === 0) {
      errors.push('Aucune page sélectionnée');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async process(workflowData) {
    const validation = this.validateInput(workflowData);
    
    if (!validation.valid) {
      this.setError(validation.errors.join(', '));
      return;
    }

    try {
      this.setLoading(true);
      this.setState({ 
        isProcessing: true,
        isCancelled: false,
        results: []
      });

      const pageData = workflowData['page-selection'];
      const selectedPages = pageData.selectedPages;
      
      this.setState({ 
        totalPages: selectedPages.length,
        currentPage: 0 
      });

      const results = [];

      // Traiter chaque page sélectionnée
      for (let i = 0; i < selectedPages.length; i++) {
        if (this.state.isCancelled) {
          break;
        }

        const pageNum = selectedPages[i];
        this.setState({ currentPage: i + 1 });

        try {
          const pageResult = await this.processPage(pageNum, workflowData);
          if (pageResult) {
            results.push(pageResult);
            this.setState({ results: [...results] });
          }
        } catch (error) {
          console.error(`Erreur page ${pageNum}:`, error);
          // Continuer avec les autres pages
        }
      }

      if (!this.state.isCancelled) {
        this.setData({
          results: results,
          totalProcessed: results.length,
          selectedPages: selectedPages
        });
      }

    } catch (error) {
      this.setError(`Erreur lors du traitement OCR: ${error.message}`);
    } finally {
      this.setState({ 
        isProcessing: false,
        showValidation: false 
      });
      this.setLoading(false);
    }
  }

  async processPage(pageNumber, workflowData) {
    try {
      const uploadData = workflowData.upload;
      
      // Extraire l'image de la page
      const imageData = await this.extractImageFromPDF(pageNumber, uploadData.url);
      
      // 🚀 Traitement OCR local avec Tesseract.js - GRATUIT et ILLIMITÉ !
      console.log('🚀 Démarrage OCR local avec Tesseract.js...');
      
      // Convertir base64 en image pour Tesseract
      const img = new Image();
      img.src = imageData;
      await new Promise(resolve => img.onload = resolve);
      
      // Traitement OCR local
      const ocrResult = await TesseractOCR.recognize(img);
      
      // Format compatible avec l'ancien système
      const result = {
        success: true,
        text: ocrResult.text,
        confidence: Math.round(ocrResult.confidence * 100), // Convertir 0-1 vers 0-100
        processingTime: ocrResult.processingTime
      };
      
      console.log('✅ OCR local terminé:', result);
      
      if (result.success) {
        this.setState({
          correctedText: result.text,
          confidence: result.confidence,
          currentImageData: window.currentOCRImage
        });

        // Si validation requise, montrer la modal
        if (this.config.validationRequired) {
          this.setState({ showValidation: true });
          const validatedResult = await this.waitForValidation();
          
          return {
            page: pageNumber,
            text: validatedResult.text,
            confidence: result.confidence,
            originalText: result.text
          };
        } else {
          // Traitement automatique
          return {
            page: pageNumber,
            text: result.text,
            confidence: result.confidence
          };
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Erreur traitement page ${pageNumber}:`, error);
      throw error;
    }
  }

  async extractImageFromPDF(pageNumber, pdfUrl) {
    // Charger le PDF avec PDF.js
    const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
    const page = await pdf.getPage(pageNumber);
    
    // Scale élevée pour OCR
    const viewport = page.getViewport({ scale: this.config.scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Fond blanc
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Retourner la page complète pour l'instant (zone sélection sera ajoutée plus tard)
    const dataURL = canvas.toDataURL('image/png', 1.0);
    
    // Stocker pour la validation
    window.currentOCRImage = dataURL;
    
    return dataURL;
  }

  waitForValidation() {
    return new Promise((resolve) => {
      const validationId = Date.now();
      window[`validateOCR_${validationId}`] = (text) => {
        resolve({ text });
        delete window[`validateOCR_${validationId}`];
      };
      
      window.currentValidationId = validationId;
    });
  }

  // Gestionnaires d'événements
  handleStartProcessing = () => {
    this.setState({ showConfigDialog: true });
  };

  handleConfigConfirm = (config) => {
    this.setState({ 
      showConfigDialog: false,
      ocrConfig: config 
    });
    // Stocker la config globalement pour l'OCR
    window.currentOCRConfig = config;
    this.process(this.props.workflowData);
  };

  handleConfigCancel = () => {
    this.setState({ showConfigDialog: false });
  };

  handleCancelProcessing = () => {
    this.setState({ 
      isCancelled: true,
      isProcessing: false,
      showValidation: false 
    });
  };

  handleValidateOCR = () => {
    if (window.currentValidationId && window[`validateOCR_${window.currentValidationId}`]) {
      window[`validateOCR_${window.currentValidationId}`](this.state.correctedText);
      this.setState({ showValidation: false });
    }
  };

  handleTextChange = (e) => {
    this.setState({ correctedText: e.target.value });
  };

  renderContent() {
    const { isProcessing, currentPage, totalPages, results, showValidation, showConfigDialog } = this.state;

    if (showConfigDialog) {
      return (
        <>
          {this.renderStartView()}
          <OCRConfigDialog
            isOpen={showConfigDialog}
            onClose={this.handleConfigCancel}
            onConfirm={this.handleConfigConfirm}
          />
        </>
      );
    }

    if (showValidation) {
      return this.renderValidationModal();
    }

    if (isProcessing) {
      return this.renderProcessingView();
    }

    if (results.length > 0) {
      return this.renderResults();
    }

    return this.renderStartView();
  }

  renderStartView() {
    const workflowData = this.props.workflowData || {};
    const pageData = workflowData['page-selection'];
    const selectedPages = pageData?.selectedPages || [];

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            🧠 OCR Intelligent avec Détection Automatique
          </h3>
          
          <div className="space-y-3 text-sm text-blue-700">
            <div className="flex justify-between">
              <span>Pages à traiter:</span>
              <span className="font-medium">{selectedPages.length} pages</span>
            </div>
            <div className="flex justify-between">
              <span>Pages sélectionnées:</span>
              <span className="font-medium">{selectedPages.join(', ')}</span>
            </div>
            <div className="flex justify-between">
              <span>Moteur OCR:</span>
              <span className="font-medium">{this.config.engine} + IA</span>
            </div>
            <div className="flex justify-between">
              <span>Correction points:</span>
              <span className="font-medium text-green-600">Intelligente</span>
            </div>
            <div className="flex justify-between">
              <span>Validation:</span>
              <span className="font-medium">
                {this.config.validationRequired ? 'Manuelle' : 'Automatique'}
              </span>
            </div>
          </div>
          
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-600">
              ✨ <strong>Nouveau :</strong> Configuration intelligente pour détecter automatiquement les points décimaux manqués dans vos coordonnées !
            </p>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={this.handleStartProcessing}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Démarrer le traitement OCR
          </button>
        </div>
      </div>
    );
  }

  renderProcessingView() {
    const { currentPage, totalPages } = this.state;
    const progress = totalPages > 0 ? Math.round((currentPage / totalPages) * 100) : 0;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-lg font-medium text-gray-900">
            Traitement en cours...
          </div>
          <div className="text-sm text-gray-500 mt-1">
            Page {currentPage} sur {totalPages}
          </div>
        </div>

        <div className="bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <div className="text-center text-sm text-gray-500">
          {progress}% terminé
        </div>

        <div className="text-center">
          <button
            onClick={this.handleCancelProcessing}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Annuler
          </button>
        </div>
      </div>
    );
  }

  renderValidationModal() {
    const { correctedText, confidence, currentImageData } = this.state;

    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-yellow-900 mb-4">
            Validation du texte OCR
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image extraite */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Zone extraite:</h4>
              {currentImageData && (
                <img 
                  src={currentImageData} 
                  alt="Zone extraite"
                  className="max-w-full max-h-48 border border-gray-300 rounded"
                />
              )}
            </div>
            
            {/* Texte détecté */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-medium text-gray-700">Texte détecté:</h4>
                <span className="text-xs text-gray-500">Confiance: {confidence.toFixed(1)}%</span>
              </div>
              
              <textarea
                value={correctedText}
                onChange={this.handleTextChange}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-md text-sm"
                placeholder="Corrigez le texte si nécessaire..."
              />
            </div>
          </div>
          
          <div className="flex justify-between mt-6">
            <button
              onClick={this.handleCancelProcessing}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler le traitement
            </button>
            
            <button
              onClick={this.handleValidateOCR}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              Valider et continuer
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderResults() {
    const { results } = this.state;

    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Traitement OCR terminé
              </h3>
              <div className="mt-2 text-sm text-green-700">
                {results.length} page(s) traitée(s) avec succès
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Résultats OCR</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Page
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Texte extrait
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Confiance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((result, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.page}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md">
                      <div className="truncate" title={result.text}>
                        {result.text.length > 100 ? `${result.text.substring(0, 100)}...` : result.text}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.confidence?.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  renderFooterActions() {
    const { isProcessing, results } = this.state;

    if (isProcessing) {
      return (
        <button
          onClick={this.handleCancelProcessing}
          className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          Annuler
        </button>
      );
    }

    if (results.length === 0 && !this.state.isCompleted) {
      return (
        <button
          onClick={this.handleStartProcessing}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          Démarrer OCR
        </button>
      );
    }

    return null;
  }
}

export default OCRProcessingModule;