import { useState, useEffect } from 'react';
import './OCRProcessor.css';
import CoordinateConverter from './CoordinateConverter';
import CoordinatePreview from './CoordinatePreview';
import { COORDINATE_SYSTEMS, normalizeCoordinates } from '../utils/coordinateConverter';

const OCRProcessor = ({ pdfFile, selectedArea, onComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [correctedText, setCorrectedText] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [results, setResults] = useState([]);
  const [showValidation, setShowValidation] = useState(false);
  const [currentImageData, setCurrentImageData] = useState(null);
  const [savedProgress, setSavedProgress] = useState(null);
  const [sourceSystem, setSourceSystem] = useState(COORDINATE_SYSTEMS.LAMBERT2E);
  const [targetSystem, setTargetSystem] = useState(COORDINATE_SYSTEMS.LAMBERT93);
  const [enableConversion, setEnableConversion] = useState(false);

  // Effect to handle image display in validation modal
  useEffect(() => {
    if (showValidation && currentImageData) {
      console.log('Displaying image in validation modal via useEffect');
      const displayImage = () => {
        const container = document.getElementById('validation-preview-container');
        if (container) {
          container.innerHTML = '';
          const img = document.createElement('img');
          img.src = currentImageData;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '200px';
          img.style.border = '2px solid #28a745';
          img.style.borderRadius = '4px';
          img.style.backgroundColor = 'white';
          img.style.display = 'block';
          
          img.onload = () => {
            console.log('Image loaded successfully in validation modal (useEffect)');
          };
          img.onerror = () => {
            console.error('Failed to load image in validation modal (useEffect)');
            container.innerHTML = '<div style="color: red; text-align: center; padding: 20px;">Error loading image</div>';
          };
          
          container.appendChild(img);
        } else {
          console.warn('validation-preview-container not found in useEffect');
        }
      };
      
      // Small delay to ensure DOM is ready
      setTimeout(displayImage, 100);
    }
  }, [showValidation, currentImageData]);

  // Charger le progrès sauvegardé au montage du composant
  useEffect(() => {
    if (pdfFile) {
      const savedKey = `ocr_progress_${pdfFile.filename}`;
      const saved = localStorage.getItem(savedKey);
      if (saved) {
        try {
          const progressData = JSON.parse(saved);
          setSavedProgress(progressData);
          setResults(progressData.results || []);
          console.log('Progrès sauvegardé trouvé:', progressData);
        } catch (e) {
          console.error('Erreur lecture progrès sauvegardé:', e);
        }
      }
    }
  }, [pdfFile]);

  // Sauvegarder le progrès à chaque mise à jour des résultats
  const saveProgress = (newResults, currentPageNum) => {
    if (pdfFile) {
      const progressData = {
        results: newResults,
        lastPage: currentPageNum,
        totalPages: totalPages,
        timestamp: Date.now()
      };
      const savedKey = `ocr_progress_${pdfFile.filename}`;
      localStorage.setItem(savedKey, JSON.stringify(progressData));
      console.log('Progrès sauvegardé:', progressData);
    }
  };

  const startBatchOCR = async () => {
    if (!selectedArea) {
      alert('Veuillez d\'abord sélectionner une zone sur le PDF');
      return;
    }

    console.log('Démarrage OCR batch avec zone:', selectedArea);
    setIsProcessing(true);
    setResults([]);
    
    // Variable locale pour stocker les résultats
    const batchResults = [];
    
    try {
      // Obtenir le nombre réel de pages du PDF
      const pagesCount = await getPDFPageCount();
      setTotalPages(pagesCount);
      console.log(`PDF a ${pagesCount} pages`);
      
      // Déterminer la page de départ (reprise ou début)
      let startPage = 1;
      if (savedProgress && savedProgress.lastPage) {
        const shouldResume = confirm(`Un traitement précédent s'est arrêté à la page ${savedProgress.lastPage}. Voulez-vous reprendre ?`);
        if (shouldResume) {
          startPage = savedProgress.lastPage + 1;
          batchResults.push(...savedProgress.results);
          console.log(`Reprise du traitement à partir de la page ${startPage}`);
        }
      }

      // Traiter les pages
      for (let pageNum = startPage; pageNum <= pagesCount; pageNum++) {
        setCurrentPage(pageNum);
        console.log(`Traitement page ${pageNum}/${pagesCount}...`);
        const pageResult = await processPage(pageNum);
        if (pageResult) {
          batchResults.push(pageResult);
          // Sauvegarder le progrès après chaque page
          saveProgress(batchResults, pageNum);
        }
      }
      
      // Mettre à jour les résultats dans le state
      setResults(batchResults);
      console.log('Tous les résultats collectés:', batchResults);
      
      // Générer le CSV final avec les résultats collectés
      await generateCSV(batchResults);
      console.log('OCR terminé pour toutes les pages');
      
      // Nettoyer le progrès sauvegardé après succès
      if (pdfFile) {
        const savedKey = `ocr_progress_${pdfFile.filename}`;
        localStorage.removeItem(savedKey);
        setSavedProgress(null);
      }
      
    } catch (error) {
      console.error('Erreur OCR batch:', error);
      alert('Erreur lors du traitement OCR: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getPDFPageCount = async () => {
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const pdf = await pdfjsLib.getDocument(pdfFile.path).promise;
      return pdf.numPages;
    } catch (error) {
      console.error('Erreur lecture nombre de pages:', error);
      return 1;
    }
  };

  const processPage = async (pageNumber) => {
    try {
      console.log(`Extraction image page ${pageNumber}...`);
      // Extraire l'image de la zone depuis le PDF côté frontend
      const imageData = await extractImageFromPDF(pageNumber, selectedArea);
      console.log('Image extraite, taille:', imageData.length);
      
      if (!imageData || imageData.length < 100) {
        throw new Error('Échec de l\'extraction de l\'image');
      }
      
      console.log('Envoi à l\'API OCR...');
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData
        })
      });

      const result = await response.json();
      console.log('Réponse OCR:', result);
      
      if (result.success) {
        console.log(`Texte détecté: "${result.text}" (confiance: ${result.confidence}%)`);
        setCorrectedText(result.text);
        setConfidence(result.confidence);
        
        // Set image data first, then show validation modal
        console.log('Setting currentImageData with window.currentOCRImage:', window.currentOCRImage ? 'Available' : 'Missing');
        setCurrentImageData(window.currentOCRImage);
        setShowValidation(true);
        
        // Attendre la validation de l'utilisateur
        const validatedResult = await waitForValidation();
        
        // Extraire les coordonnées et ajouter aux résultats
        const coordinates = await extractCoordinatesWithGeofree(validatedResult.text);
        const newResult = {
          page: pageNumber,
          text: validatedResult.text,
          coordinates: coordinates
        };
        
        console.log('Résultat de la page:', newResult);
        
        // Clean up validation state
        setShowValidation(false);
        setCurrentImageData(null);
        
        // Retourner le résultat pour la collecte dans startBatchOCR
        return newResult;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(`Erreur page ${pageNumber}:`, error);
      throw error;
    }
  };

  const extractImageFromPDF = async (pageNumber, area) => {
    console.log('Extraction avec zone:', area);
    
    // Charger le PDF avec PDF.js
    const pdfjsLib = await import('pdfjs-dist');
    const pdf = await pdfjsLib.getDocument(pdfFile.path).promise;
    const page = await pdf.getPage(pageNumber);
    
    // IMPORTANT: Utiliser le même viewport que dans PDFViewer
    const viewport = page.getViewport({ scale: 3.0 });
    console.log('OCR Viewport dimensions:', viewport.width, 'x', viewport.height);
    
    // Obtenir les dimensions du canvas affiché dans PDFViewer pour comparaison
    const pdfCanvas = document.querySelector('.pdf-canvas');
    if (pdfCanvas) {
      console.log('PDFViewer canvas dimensions:', pdfCanvas.width, 'x', pdfCanvas.height);
      console.log('PDFViewer canvas display size:', pdfCanvas.offsetWidth, 'x', pdfCanvas.offsetHeight);
    }

    // Créer un canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Rendre la page avec fond blanc
    context.fillStyle = 'white';
    context.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: context,
      viewport: viewport,
    }).promise;

    // Calculer les dimensions de la zone
    const x = Math.floor(area.x * viewport.width);
    const y = Math.floor(area.y * viewport.height);
    const width = Math.floor(area.width * viewport.width);
    const height = Math.floor(area.height * viewport.height);
    
    console.log('Zone extraite:', { x, y, width, height });

    // Vérifier que les dimensions sont valides
    if (width < 10 || height < 10) {
      throw new Error('Zone sélectionnée trop petite');
    }

    // Créer un canvas pour la zone avec une taille minimale plus généreuse
    const minWidth = Math.max(width, 300);
    const minHeight = Math.max(height, 150);
    
    const zoneCanvas = document.createElement('canvas');
    const zoneContext = zoneCanvas.getContext('2d');
    zoneCanvas.width = minWidth;
    zoneCanvas.height = minHeight;

    // Fond blanc pour l'OCR
    zoneContext.fillStyle = 'white';
    zoneContext.fillRect(0, 0, minWidth, minHeight);

    // Copier la zone avec mise à l'échelle si nécessaire
    zoneContext.drawImage(
      canvas, 
      x, y, width, height,  // source
      0, 0, minWidth, minHeight  // destination
    );

    console.log('Canvas zone créé:', minWidth, 'x', minHeight);

    // Afficher l'image extraite pour debug
    const dataURL = zoneCanvas.toDataURL('image/png', 1.0);
    console.log('Image base64 générée, taille:', dataURL.length);
    
    // Stocker l'image pour l'affichage dans la modal de validation
    window.currentOCRImage = dataURL;
    console.log('Image stored in window.currentOCRImage, size:', dataURL.length);
    
    return dataURL;
  };

  const waitForValidation = () => {
    return new Promise((resolve) => {
      // Créer une fonction unique pour cette validation
      const validationId = Date.now();
      window[`validateOCR_${validationId}`] = (text) => {
        console.log('Validation reçue:', text);
        resolve({ text });
        delete window[`validateOCR_${validationId}`];
      };
      
      // Stocker l'ID pour le bouton
      window.currentValidationId = validationId;
    });
  };

  const validateOCR = () => {
    console.log('Validation déclenchée avec texte:', correctedText);
    if (window.currentValidationId && window[`validateOCR_${window.currentValidationId}`]) {
      window[`validateOCR_${window.currentValidationId}`](correctedText);
    }
  };

  const handleSystemChange = (newSourceSystem, newTargetSystem) => {
    setSourceSystem(newSourceSystem);
    setTargetSystem(newTargetSystem);
  };

  /**
   * Conversion via grille de transformation NTF (plus précise que deltas fixes)
   */
  /**
   * Conversion via API geofree.fr RÉELLE
   */
  // Fonction basique d'extraction de coordonnées (sans conversion)
  const extractBasicCoordinates = async (text) => {
    const patterns = [
      /(?:Lambert\s*2?\s*)?(?:étendu|etend[iu])\s*:?\s*(\d{4,}(?:[.,]\d+)?)\s*m?[,\s;]+(\d{4,}(?:[.,]\d+)?)\s*m?/i,
      /X\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)[,\s;]+Y\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)/i,
      /E\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)[,\s;]+N\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)/i,
      /(\d{4,}(?:[.,]\d+)?)\s*m?[,\s;]+(\d{4,}(?:[.,]\d+)?)\s*m/i,
      /(\d{1,3}(?:\s\d{3})*[.,]\d+)[,\s;]+(\d{1,3}(?:\s\d{3})*[.,]\d+)/,
      /(\d{4,}[.,]\d+)[,\s;]+(\d{4,}[.,]\d+)/,
      /(\d{5,7}(?:[.,]\d{1,3})?)\s*[\r\n]+\s*(\d{6,8}(?:[.,]\d{1,3})?)/,
      /(\d{5,7}(?:[.,]\d{1,3})?)\s{2,}(\d{6,8}(?:[.,]\d{1,3})?)/,
      /[\(\[]?\s*(\d{5,7}(?:[.,]\d+)?)\s*[,;]\s*(\d{6,8}(?:[.,]\d+)?)\s*[\)\]]?/,
      /(\d{4,}[.,]\d+)\s+(\d{4,}[.,]\d+)/,
      /(\d{4,})[,\s;]+(\d{4,})/,
      /[\(\[]?\s*(\d{4,}(?:[.,]\d+)?)\s*[,;\s]+\s*(\d{4,}(?:[.,]\d+)?)\s*[\)\]]?/,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const normalized = normalizeCoordinates(match[1], match[2]);
          if (normalized.x > 1000 && normalized.y > 1000) {
            return normalized;
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    // Fallback
    const longNumbers = text.match(/\d{4,}(?:[.,]\d+)?/g);
    if (longNumbers && longNumbers.length >= 2) {
      try {
        const normalized = normalizeCoordinates(longNumbers[0], longNumbers[1]);
        return normalized;
      } catch (error) {
        // Ignore
      }
    }
    
    return { x: 0, y: 0 };
  };

  const convertViaGeofree = async (x, y) => {
    console.log('🌐 Conversion via geofree.fr API RÉELLE:', { x, y });
    
    try {
      // Appel direct à l'API geofree.fr depuis le backend
      const response = await fetch('/api/geofree-convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          x: x,
          y: y,
          from: 'L2E', // Lambert II étendu
          to: 'L93'    // Lambert 93
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Résultat geofree.fr:', result);
        
        return {
          x: result.x,
          y: result.y,
          precision: 'geofree_api',
          source: 'geofree.fr API'
        };
      } else {
        throw new Error(`Erreur geofree API: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Erreur geofree.fr:', error);
      throw error;
    }
  };

  // Fonction basique d'extraction de coordonnées (sans conversion)
  const extractBasicCoordinates = async (text) => {
    const patterns = [
      /(?:Lambert\s*2?\s*)?(?:étendu|etend[iu])\s*:?\s*(\d{4,}(?:[.,]\d+)?)\s*m?[,\s;]+(\d{4,}(?:[.,]\d+)?)\s*m?/i,
      /X\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)[,\s;]+Y\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)/i,
      /E\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)[,\s;]+N\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)/i,
      /(\d{4,}(?:[.,]\d+)?)\s*m?[,\s;]+(\d{4,}(?:[.,]\d+)?)\s*m/i,
      /(\d{1,3}(?:\s\d{3})*[.,]\d+)[,\s;]+(\d{1,3}(?:\s\d{3})*[.,]\d+)/,
      /(\d{4,}[.,]\d+)[,\s;]+(\d{4,}[.,]\d+)/,
      /(\d{5,7}(?:[.,]\d{1,3})?)\s*[\r\n]+\s*(\d{6,8}(?:[.,]\d{1,3})?)/,
      /(\d{5,7}(?:[.,]\d{1,3})?)\s{2,}(\d{6,8}(?:[.,]\d{1,3})?)/,
      /[\(\[]?\s*(\d{5,7}(?:[.,]\d+)?)\s*[,;]\s*(\d{6,8}(?:[.,]\d+)?)\s*[\)\]]?/,
      /(\d{4,}[.,]\d+)\s+(\d{4,}[.,]\d+)/,
      /(\d{4,})[,\s;]+(\d{4,})/,
      /[\(\[]?\s*(\d{4,}(?:[.,]\d+)?)\s*[,;\s]+\s*(\d{4,}(?:[.,]\d+)?)\s*[\)\]]?/,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const normalized = normalizeCoordinates(match[1], match[2]);
          if (normalized.x > 1000 && normalized.y > 1000) {
            return normalized;
          }
        } catch (error) {
          continue;
        }
      }
    }
    
    // Fallback
    const longNumbers = text.match(/\d{4,}(?:[.,]\d+)?/g);
    if (longNumbers && longNumbers.length >= 2) {
      try {
        const normalized = normalizeCoordinates(longNumbers[0], longNumbers[1]);
        return normalized;
      } catch (error) {
        // Ignore
      }
    }
    
    return { x: 0, y: 0 };
  };

  // Nouvelle fonction qui FORCE l'utilisation de geofree pour TOUTES les pages
  const extractCoordinatesWithGeofree = async (text) => {
    console.log('🎯 EXTRACTION FORCÉE AVEC GEOFREE pour texte:', text);
    
    // D'abord extraire les coordonnées brutes
    const coords = await extractBasicCoordinates(text);
    
    if (coords.x > 1000 && coords.y > 1000) {
      console.log('🎯 Coordonnées extraites:', coords.x, coords.y);
      
      // TOUJOURS convertir via geofree si la conversion est activée
      if (enableConversion && sourceSystem.id !== targetSystem.id) {
        try {
          console.log('🎯 CONVERSION GEOFREE FORCÉE pour page', currentPage);
          const result = await convertViaGeofree(coords.x, coords.y);
          
          return {
            x: result.x,
            y: result.y,
            originalX: coords.x,
            originalY: coords.y,
            converted: true,
            fromSystem: sourceSystem.name,
            toSystem: targetSystem.name,
            precision: result.precision,
            source: result.source
          };
        } catch (error) {
          console.error('❌ Erreur conversion geofree page', currentPage, ':', error);
          return { x: coords.x, y: coords.y, converted: false, error: error.message };
        }
      }
      
      return { x: coords.x, y: coords.y, converted: false };
    }
    
    return { x: 0, y: 0, converted: false };
  };



  const testSinglePage = async () => {
    if (!selectedArea) {
      alert('Veuillez d\'abord sélectionner une zone sur le PDF');
      return;
    }

    console.log('Test OCR page 1 avec zone:', selectedArea);
    setIsProcessing(true);
    setResults([]);
    
    try {
      setTotalPages(1);
      setCurrentPage(1);
      
      console.log('Test page 1...');
      const pageResult = await processPage(1);
      
      if (pageResult) {
        setResults([pageResult]);
        console.log('Test terminé avec résultat:', pageResult);
      }
      
    } catch (error) {
      console.error('Erreur test OCR:', error);
      alert('Erreur lors du test OCR: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateCSV = async (finalResults = null) => {
    // Utiliser les résultats passés en paramètre ou ceux du state
    const dataToExport = finalResults || results;
    console.log('Génération CSV avec résultats:', dataToExport);
    
    if (!dataToExport || dataToExport.length === 0) {
      alert('Aucun résultat à exporter !');
      return;
    }
    
    // Générer seulement les données, sans headers
    const csvRows = dataToExport.map(result => {
      // Vérifier que les coordonnées existent
      if (!result.coordinates) {
        console.warn('Coordonnées manquantes pour la page:', result.page);
        return `${result.page},undefined,undefined`;
      }
      
      // Utiliser les coordonnées finales (converties si disponibles, sinon originales)
      // Formater avec exactement 2 décimales pour cohérence
      const x = result.coordinates.x ? result.coordinates.x.toFixed(2) : 'undefined';
      const y = result.coordinates.y ? result.coordinates.y.toFixed(2) : 'undefined';
      
      console.log(`CSV ligne ${result.page}:`, { x, y, coords: result.coordinates });
      return `${result.page},${x},${y}`;
    }).join('\n');
    
    const csvContent = csvRows; // Pas de headers
    console.log('Contenu CSV généré:', csvContent);
    
    // Télécharger le fichier CSV avec encodage UTF-8 BOM pour Excel
    const bom = '\uFEFF'; // BOM pour UTF-8
    const csvWithBom = bom + csvContent;
    const blob = new Blob([csvWithBom], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `coordonnees_${new Date().toISOString().slice(0, 10)}_${new Date().toTimeString().slice(0, 8).replace(/:/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    alert(`CSV généré avec ${dataToExport.length} pages !`);
    
    if (onComplete) {
      onComplete(dataToExport);
    }
  };

  const clearSavedProgress = () => {
    if (pdfFile) {
      const savedKey = `ocr_progress_${pdfFile.filename}`;
      localStorage.removeItem(savedKey);
      setSavedProgress(null);
      setResults([]);
      alert('Progrès sauvegardé effacé');
    }
  };

  return (
    <div className="ocr-processor">
      <CoordinateConverter 
        onSystemChange={handleSystemChange}
        initialFromSystem={sourceSystem}
        initialToSystem={targetSystem}
      />
      
      <div className="conversion-toggle">
        <label>
          <input
            type="checkbox"
            checked={enableConversion}
            onChange={(e) => setEnableConversion(e.target.checked)}
          />
          Activer la conversion automatique des coordonnées
        </label>
        {enableConversion && (
          <div className="conversion-info-active">
            ✓ Conversion activée : {sourceSystem.name} → {targetSystem.name}
          </div>
        )}
      </div>

      <div className="ocr-controls">
        {savedProgress && (
          <div className="saved-progress-info">
            <p>⚠️ Traitement interrompu à la page {savedProgress.lastPage}/{savedProgress.totalPages}</p>
            <button 
              onClick={clearSavedProgress}
              className="clear-progress-btn"
              style={{ marginRight: '10px', backgroundColor: '#dc3545', color: 'white' }}
            >
              Effacer progrès
            </button>
          </div>
        )}
        
        <button 
          onClick={() => testSinglePage()}
          disabled={isProcessing || !selectedArea}
          className="test-ocr-btn"
          style={{ marginRight: '10px', backgroundColor: '#17a2b8' }}
        >
          Tester page 1
        </button>
        
        <button 
          onClick={startBatchOCR}
          disabled={isProcessing || !selectedArea}
          className="start-ocr-btn"
        >
          {isProcessing ? 'Traitement en cours...' : savedProgress ? 'Reprendre OCR' : 'Démarrer OCR en série'}
        </button>
        
        {isProcessing && (
          <div className="progress-info">
            <p>Page {currentPage} sur {totalPages}</p>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(currentPage / totalPages) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {showValidation && (
        <div className="validation-modal">
          <div className="validation-content">
            <h3>Validation OCR - Page {currentPage}</h3>
            
            <div className="validation-layout">
              {/* Zone d'aperçu fixe à droite */}
              <div className="preview-zone">
                <div className="zone-preview">
                  <div className="preview-label">Zone extraite:</div>
                  <div id="validation-preview-container">
                    {currentImageData && (
                      <img 
                        src={currentImageData} 
                        alt="Zone extraite"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          border: '2px solid #28a745',
                          borderRadius: '4px',
                          backgroundColor: 'white',
                          display: 'block'
                        }}
                        onLoad={() => console.log('React image loaded successfully')}
                        onError={() => console.error('React image failed to load')}
                      />
                    )}
                  </div>
                </div>
                
                <div className="coordinates-preview">
                  <h4>Coordonnées détectées:</h4>
                  <CoordinatePreview text={correctedText} enableConversion={enableConversion} sourceSystem={sourceSystem} targetSystem={targetSystem} />
                </div>
              </div>
              
              {/* Zone de texte à gauche */}
              <div className="text-zone">
                <div className="confidence-info">
                  Confiance: {confidence.toFixed(1)}%
                </div>
                
                <div className="text-validation">
                  <label>Texte détecté:</label>
                  <textarea
                    value={correctedText}
                    onChange={(e) => {
                      setCorrectedText(e.target.value);
                      // Aperçu en temps réel des coordonnées
                      const coords = extractCoordinates(e.target.value);
                      console.log('Aperçu coordonnées:', coords);
                    }}
                    rows={4}
                    className="correction-input"
                  />
                </div>
                
                <div className="validation-buttons">
                  <button onClick={validateOCR} className="validate-btn">
                    Valider et continuer
                  </button>
                </div>
                
                <p className="help-text">
                  Corrigez le texte si nécessaire et cliquez sur "Valider et continuer"
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="results-preview">
          <h3>Résultats ({results.length} pages)</h3>
          <table className="results-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Texte</th>
                <th>X</th>
                <th>Y</th>
                {enableConversion && <th>Conversion</th>}
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td>{result.page}</td>
                  <td className="text-cell">{result.text}</td>
                  <td>{result.coordinates.x.toFixed(2)}</td>
                  <td>{result.coordinates.y.toFixed(2)}</td>
                  {enableConversion && (
                    <td className="conversion-cell">
                      {result.coordinates.converted ? (
                        <div className="conversion-details">
                          <div className="conversion-status">✓ Converti</div>
                          <div className="original-values">
                            Orig: {result.coordinates.originalX.toFixed(2)}, {result.coordinates.originalY.toFixed(2)}
                          </div>
                          <div className="precision-badge">{result.coordinates.precision}</div>
                        </div>
                      ) : (
                        <span className="no-conversion">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default OCRProcessor;