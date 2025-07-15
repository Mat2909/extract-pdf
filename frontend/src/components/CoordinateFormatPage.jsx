import React, { useState, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Page de configuration du format de coordonnées
 * Layout: Aperçu zone (gauche) + Configuration (droite)
 */
const CoordinateFormatPage = ({ 
  uploadedPDF, 
  selectedArea, 
  selectedPages, 
  onFormatConfigured,
  onBack 
}) => {
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [coordinateFormat, setCoordinateFormat] = useState({
    x: {
      integers: 6,    // Ex: Lambert 654321
      decimals: 3     // Ex: .890
    },
    y: {
      integers: 7,    // Ex: Lambert 1234567  
      decimals: 3     // Ex: .648
    },
    coordinateType: 'lambert',
    examples: {
      x: '654321.890',
      y: '1234567.648'
    }
  });
  const [formatSelected, setFormatSelected] = useState(false);

  // Formats prédéfinis
  const presetFormats = [
    {
      name: 'Lambert II étendu',
      type: 'lambert',
      x: { integers: 6, decimals: 3 },
      y: { integers: 7, decimals: 3 },
      examples: { x: '654321.890', y: '1234567.648' }
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
  ];

  // Générer l'aperçu de la zone sélectionnée
  useEffect(() => {
    if (uploadedPDF && selectedArea) {
      generateAreaPreview();
    }
  }, [uploadedPDF, selectedArea]);

  const generateAreaPreview = async () => {
    try {
      setIsGeneratingPreview(true);
      
      console.log('📸 Génération aperçu zone sélectionnée...');
      console.log('📊 uploadedPDF:', uploadedPDF);
      console.log('📊 selectedArea:', selectedArea);
      console.log('📊 selectedPages:', selectedPages);
      
      // Vérification détaillée des données
      if (!uploadedPDF || !uploadedPDF.path) {
        throw new Error('uploadedPDF ou uploadedPDF.path manquant');
      }
      
      if (!selectedArea || !selectedArea.x || !selectedArea.y || !selectedArea.width || !selectedArea.height) {
        throw new Error('selectedArea incomplete: ' + JSON.stringify(selectedArea));
      }
      
      console.log('📄 Chargement PDF depuis:', uploadedPDF.path);
      
      // Charger le PDF avec PDF.js
      const pdf = await pdfjsLib.getDocument(uploadedPDF.path).promise;
      const pageNumber = selectedArea.pageNumber || selectedPages[0] || 1;
      console.log('📄 Chargement page:', pageNumber);
      const page = await pdf.getPage(pageNumber);
      
      console.log('✅ Page chargée avec succès');
      
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
      // selectedArea est déjà en format 0-1, pas besoin de diviser par 100
      const zoneWidth = selectedArea.width * canvas.width;
      const zoneHeight = selectedArea.height * canvas.height;
      const zoneX = selectedArea.x * canvas.width;
      const zoneY = selectedArea.y * canvas.height;
      
      console.log('📏 Dimensions calculées:');
      console.log('  Canvas:', canvas.width, 'x', canvas.height);
      console.log('  Zone relative:', selectedArea);
      console.log('  Zone pixels:', {x: zoneX, y: zoneY, width: zoneWidth, height: zoneHeight});
      
      // Validation des dimensions minimales
      if (zoneWidth < 10 || zoneHeight < 10) {
        throw new Error(`Zone trop petite: ${zoneWidth}x${zoneHeight} pixels`);
      }
      
      zoneCanvas.width = Math.max(zoneWidth, 10);
      zoneCanvas.height = Math.max(zoneHeight, 10);
      
      // Copier la zone sélectionnée
      zoneContext.drawImage(
        canvas,
        zoneX, zoneY, zoneWidth, zoneHeight,
        0, 0, zoneWidth, zoneHeight
      );

      const previewDataURL = zoneCanvas.toDataURL('image/png', 1.0);
      
      console.log('📸 Image générée, taille data URL:', previewDataURL.length);
      console.log('📸 Données image (début):', previewDataURL.substring(0, 50));
      
      // Validation de l'image générée
      if (previewDataURL.length < 100 || !previewDataURL.startsWith('data:image/png;base64,')) {
        throw new Error(`Image générée invalide: ${previewDataURL.length} chars, début: ${previewDataURL.substring(0, 20)}`);
      }
      
      setPreviewImage(previewDataURL);
      setIsGeneratingPreview(false);
      
      console.log('✅ Aperçu zone généré et setPreviewImage appelé');
      
    } catch (error) {
      console.error('❌ Erreur génération aperçu:', error);
      setIsGeneratingPreview(false);
    }
  };

  // Gestionnaires d'événements
  const handlePresetSelect = (preset) => {
    setCoordinateFormat({
      ...preset,
      coordinateType: preset.type
    });
    setFormatSelected(true);
  };

  const handleCustomFormatChange = (axis, field, value) => {
    const newFormat = { ...coordinateFormat };
    newFormat[axis][field] = parseInt(value) || 0;
    
    // Mettre à jour les exemples
    newFormat.examples = generateExamples(newFormat);
    
    setCoordinateFormat(newFormat);
    setFormatSelected(true);
  };

  const generateExamples = (format) => {
    const xIntegers = '1'.repeat(format.x.integers);
    const xDecimals = '2'.repeat(format.x.decimals);
    const yIntegers = '3'.repeat(format.y.integers);
    const yDecimals = '4'.repeat(format.y.decimals);
    
    return {
      x: format.x.decimals > 0 ? `${xIntegers}.${xDecimals}` : xIntegers,
      y: format.y.decimals > 0 ? `${yIntegers}.${yDecimals}` : yIntegers
    };
  };

  const handleValidateFormat = () => {
    // Créer la configuration complète
    const formatConfig = {
      ...coordinateFormat,
      timestamp: Date.now()
    };
    
    console.log('✅ Format coordonnées configuré:', formatConfig);
    
    // Notifier le parent que la configuration est terminée
    onFormatConfigured(formatConfig);
  };

  return (
    <div className="step-page">
      <div className="max-w-7xl mx-auto">
        {/* En-tête */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            Étape 4 : Configuration du format de coordonnées
          </h2>
          <p className="text-gray-600">
            Configurez le format attendu pour les coordonnées X/Y afin d'améliorer la détection OCR
          </p>
        </div>
        
        {/* Layout 2 colonnes : Aperçu GAUCHE, Configuration DROITE */}
        <div className="flex flex-row gap-8 items-start">
          {/* GAUCHE : Aperçu zone */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-1/2 flex-shrink-0">
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
                  onLoad={() => console.log('✅ Image preview chargée avec succès')}
                  onError={(e) => console.error('❌ Erreur chargement image preview:', e)}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded">
                <div className="text-center">
                  <p className="text-gray-500 mb-2">Aucun aperçu disponible</p>
                  <button
                    onClick={generateAreaPreview}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Réessayer
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* DROITE : Configuration format */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 w-1/2 flex-shrink-0">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              ⚙️ Configuration du format
            </h3>
            
            {/* Formats prédéfinis */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Formats prédéfinis :</h4>
              <div className="space-y-2">
                {presetFormats.map((preset, index) => (
                  <button
                    key={index}
                    onClick={() => handlePresetSelect(preset)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors relative ${
                      coordinateFormat.coordinateType === preset.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">{preset.name}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          X: {preset.examples.x} • Y: {preset.examples.y}
                        </div>
                      </div>
                      
                      {/* Case de coche verte sur le format sélectionné */}
                      {coordinateFormat.coordinateType === preset.type && (
                        <div className="flex-shrink-0 ml-3">
                          <div style={{ 
                            width: '20px',
                            height: '20px',
                            backgroundColor: '#22c55e',
                            border: '2px solid #16a34a',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                          }}>
                            ✓
                          </div>
                        </div>
                      )}
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
                      onChange={(e) => handleCustomFormatChange('x', 'integers', e.target.value)}
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
                      onChange={(e) => handleCustomFormatChange('x', 'decimals', e.target.value)}
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
                      onChange={(e) => handleCustomFormatChange('y', 'integers', e.target.value)}
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
                      onChange={(e) => handleCustomFormatChange('y', 'decimals', e.target.value)}
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
          </div>
        </div>
        
        {/* Boutons de navigation uniformes */}
        <div className="flex justify-center items-center gap-6 mt-8">
          {/* Bouton Précédent */}
          <button
            onClick={onBack}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5"
            title="Retour à l'étape précédente"
          >
            <span className="text-xl font-bold">←</span>
          </button>
          
          {/* Bouton Suivant */}
          <button
            onClick={handleValidateFormat}
            disabled={!formatSelected}
            className={`flex items-center justify-center w-14 h-14 rounded-full shadow-md hover:shadow-lg transition-all duration-200 transform hover:-translate-y-0.5 ${
              formatSelected
                ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
            title={formatSelected ? "Continuer vers l'OCR" : "Sélectionnez un format pour continuer"}
          >
            <span className="text-xl font-bold">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoordinateFormatPage;