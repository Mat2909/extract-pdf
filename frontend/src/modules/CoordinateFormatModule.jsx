import React from 'react';
import BaseModule from './BaseModule';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Module de sélection du format de coordonnées
 * Étape intermédiaire entre sélection de zone et OCR
 */
class CoordinateFormatModule extends BaseModule {
  constructor(props) {
    super(props);
    
    this.state = {
      ...this.state,
      selectedArea: null,
      previewImage: null,
      isGeneratingPreview: false,
      coordinateFormat: {
        x: {
          integers: 7,    // Ex: Lambert 1234567
          decimals: 3     // Ex: .890
        },
        y: {
          integers: 7,    // Ex: Lambert 1234567  
          decimals: 3     // Ex: .648
        },
        coordinateType: 'lambert',
        examples: {
          x: '1234567.890',
          y: '1234567.648'
        }
      }
    };
  }

  static defaultConfig = {
    showPreview: true,
    allowCustomFormat: true,
    presetFormats: [
      {
        name: 'Lambert II étendu',
        type: 'lambert',
        x: { integers: 7, decimals: 3 },
        y: { integers: 7, decimals: 3 },
        examples: { x: '1234567.890', y: '1234567.648' }
      },
      {
        name: 'GPS Décimal',
        type: 'gps',
        x: { integers: 2, decimals: 6 },
        y: { integers: 2, decimals: 6 },
        examples: { x: '48.123456', y: '2.654321' }
      },
      {
        name: 'UTM',
        type: 'utm',
        x: { integers: 6, decimals: 3 },
        y: { integers: 7, decimals: 3 },
        examples: { x: '654321.123', y: '5432167.890' }
      }
    ]
  };

  initialize(config) {
    this.config = { ...CoordinateFormatModule.defaultConfig, ...config };
  }

  validateInput(workflowData) {
    console.log('🔍 CoordinateFormatModule validateInput:', workflowData);
    const errors = [];

    const uploadData = workflowData?.upload;
    if (!uploadData?.url) {
      errors.push('Aucun fichier PDF trouvé');
      console.log('❌ Validation: Pas de PDF');
    }

    const pageSelectionData = workflowData?.['page-selection'];
    if (!pageSelectionData?.selectedPages || pageSelectionData.selectedPages.length === 0) {
      errors.push('Aucune page sélectionnée');
      console.log('❌ Validation: Pas de pages sélectionnées');
    }

    // Zone par défaut - pas de validation stricte
    console.log('✅ Validation: Zone par défaut acceptée');

    console.log(`🎯 Validation result: ${errors.length === 0 ? 'VALID' : 'INVALID'}`, errors);
    return {
      valid: errors.length === 0,
      errors
    };
  }

  async process(workflowData) {
    console.log('🚀 CoordinateFormatModule process START');
    const validation = this.validateInput(workflowData);
    
    if (!validation.valid) {
      console.log('❌ Validation échouée:', validation.errors);
      this.setError(validation.errors.join(', '));
      return;
    }

    console.log('✅ Validation OK, démarrage traitement...');
    try {
      this.setLoading(true);

      // Temporaire: zone par défaut pour test
      const defaultArea = {
        x: 10,
        y: 10, 
        width: 80,
        height: 20,
        pageNumber: 1
      };
      
      const areaSelectionData = workflowData['area-selection'] || { selectedArea: defaultArea };
      const uploadData = workflowData.upload;
      
      this.setState({ 
        selectedArea: areaSelectionData.selectedArea 
      });

      // Générer l'aperçu de la zone sélectionnée
      await this.generateAreaPreview(uploadData.url, areaSelectionData.selectedArea);

      // Module prêt - attendre la configuration utilisateur
      this.setData({
        coordinateFormat: this.state.coordinateFormat,
        previewGenerated: true
      });

    } catch (error) {
      this.setError(`Erreur lors de la génération de l'aperçu: ${error.message}`);
    } finally {
      this.setLoading(false);
    }
  }

  async generateAreaPreview(pdfUrl, selectedArea) {
    try {
      this.setState({ isGeneratingPreview: true });
      
      console.log('📸 Génération aperçu zone sélectionnée...');
      
      // Charger le PDF avec PDF.js
      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      const page = await pdf.getPage(selectedArea.pageNumber || 1);
      
      // Scale pour preview (pas besoin d'ultra haute résolution)
      const viewport = page.getViewport({ scale: 2.0 });
      
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Fond blanc
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Render de la page complète
      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;

      // Extraire la zone sélectionnée
      const zoneCanvas = document.createElement('canvas');
      const zoneContext = zoneCanvas.getContext('2d');
      
      // Calculer les dimensions de la zone en pixels
      const zoneWidth = (selectedArea.width / 100) * canvas.width;
      const zoneHeight = (selectedArea.height / 100) * canvas.height;
      const zoneX = (selectedArea.x / 100) * canvas.width;
      const zoneY = (selectedArea.y / 100) * canvas.height;
      
      zoneCanvas.width = zoneWidth;
      zoneCanvas.height = zoneHeight;
      
      // Copier la zone sélectionnée
      zoneContext.drawImage(
        canvas,
        zoneX, zoneY, zoneWidth, zoneHeight,
        0, 0, zoneWidth, zoneHeight
      );

      const previewDataURL = zoneCanvas.toDataURL('image/png', 1.0);
      
      this.setState({ 
        previewImage: previewDataURL,
        isGeneratingPreview: false 
      });
      
      console.log('✅ Aperçu zone généré');
      
    } catch (error) {
      console.error('❌ Erreur génération aperçu:', error);
      this.setState({ isGeneratingPreview: false });
      throw error;
    }
  }

  // Gestionnaires d'événements
  handlePresetSelect = (preset) => {
    this.setState({
      coordinateFormat: {
        ...preset,
        coordinateType: preset.type
      }
    });
  };

  handleCustomFormatChange = (axis, field, value) => {
    const newFormat = { ...this.state.coordinateFormat };
    newFormat[axis][field] = parseInt(value) || 0;
    
    // Mettre à jour les exemples
    newFormat.examples = this.generateExamples(newFormat);
    
    this.setState({ coordinateFormat: newFormat });
  };

  generateExamples = (format) => {
    const xIntegers = '1'.repeat(format.x.integers);
    const xDecimals = '2'.repeat(format.x.decimals);
    const yIntegers = '3'.repeat(format.y.integers);
    const yDecimals = '4'.repeat(format.y.decimals);
    
    return {
      x: format.x.decimals > 0 ? `${xIntegers}.${xDecimals}` : xIntegers,
      y: format.y.decimals > 0 ? `${yIntegers}.${yDecimals}` : yIntegers
    };
  };

  handleValidateFormat = () => {
    // Stocker la configuration pour l'OCR
    const formatConfig = {
      ...this.state.coordinateFormat,
      timestamp: Date.now()
    };
    
    // Stocker globalement pour l'OCR
    window.currentCoordinateFormat = formatConfig;
    
    // Marquer le module comme terminé avec la configuration
    this.setData({
      coordinateFormat: formatConfig,
      completed: true
    });
    
    console.log('✅ Format coordonnées configuré:', formatConfig);
  };

  renderContent() {
    const { previewImage, isGeneratingPreview, coordinateFormat } = this.state;

    if (this.state.isLoading && !previewImage) {
      return this.renderLoadingView();
    }

    return (
      <div className="coordinate-format-container">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
          {/* Aperçu de la zone - Gauche */}
          <div className="preview-section">
            <div className="bg-white border border-gray-200 rounded-lg p-6 h-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                📸 Aperçu de la zone sélectionnée
              </h3>
              
              {isGeneratingPreview ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-500">Génération de l'aperçu...</p>
                  </div>
                </div>
              ) : previewImage ? (
                <div className="preview-image-container">
                  <img 
                    src={previewImage} 
                    alt="Zone sélectionnée"
                    className="max-w-full max-h-96 border border-gray-300 rounded shadow-sm mx-auto block"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Zone qui sera analysée par l'OCR
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
                  <p className="text-gray-500">Aucun aperçu disponible</p>
                </div>
              )}
            </div>
          </div>

          {/* Configuration format - Droite */}
          <div className="format-config-section">
            <div className="bg-white border border-gray-200 rounded-lg p-6 h-full">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                ⚙️ Configuration du format de coordonnées
              </h3>
              
              {/* Formats prédéfinis */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Formats prédéfinis :</h4>
                <div className="space-y-2">
                  {this.config.presetFormats.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => this.handlePresetSelect(preset)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        coordinateFormat.coordinateType === preset.type
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-sm">{preset.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        X: {preset.examples.x} • Y: {preset.examples.y}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Configuration personnalisée */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Configuration personnalisée :</h4>
                
                {/* Configuration X */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordonnée X
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nb entiers</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={coordinateFormat.x.integers}
                        onChange={(e) => this.handleCustomFormatChange('x', 'integers', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nb décimales</label>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        value={coordinateFormat.x.decimals}
                        onChange={(e) => this.handleCustomFormatChange('x', 'decimals', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Exemple: <code className="bg-white px-1 rounded">{coordinateFormat.examples.x}</code>
                  </div>
                </div>

                {/* Configuration Y */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coordonnée Y
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nb entiers</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={coordinateFormat.y.integers}
                        onChange={(e) => this.handleCustomFormatChange('y', 'integers', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Nb décimales</label>
                      <input
                        type="number"
                        min="0"
                        max="8"
                        value={coordinateFormat.y.decimals}
                        onChange={(e) => this.handleCustomFormatChange('y', 'decimals', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-600">
                    Exemple: <code className="bg-white px-1 rounded">{coordinateFormat.examples.y}</code>
                  </div>
                </div>
              </div>

              {/* Aperçu de la détection */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  🔍 Détection automatique configurée :
                </h4>
                <div className="text-xs text-blue-800 space-y-1">
                  <div>• <code>"123456 789"</code> → <code>"{coordinateFormat.examples.x}"</code></div>
                  <div>• <code>"1234567890"</code> → <code>"{coordinateFormat.examples.x}"</code></div>
                  <div>• <code>"123456."</code> → <code>"{coordinateFormat.examples.x}"</code></div>
                </div>
              </div>

              {/* Bouton validation */}
              <div className="text-center">
                <button
                  onClick={this.handleValidateFormat}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  ✅ Valider le format
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderLoadingView() {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Préparation du module de configuration
        </h3>
        <p className="text-gray-500">
          Génération de l'aperçu de la zone sélectionnée...
        </p>
      </div>
    );
  }

  renderFooterActions() {
    if (this.state.isCompleted) {
      return (
        <div className="flex items-center text-green-600">
          <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Format de coordonnées configuré
        </div>
      );
    }

    if (this.state.previewImage) {
      return (
        <button
          onClick={this.handleValidateFormat}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
        >
          Valider le format
        </button>
      );
    }

    return null;
  }
}

export default CoordinateFormatModule;