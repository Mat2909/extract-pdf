import { useState, useEffect } from 'react';
import './OCRProcessor.css';
import CoordinateConverter from './CoordinateConverter';
import CoordinatePreview from './CoordinatePreview';
import { COORDINATE_SYSTEMS, normalizeCoordinates } from '../utils/coordinateConverter';
import * as XLSX from 'xlsx';

// Fonction utilitaire pour forcer le format avec point décimal
const forceDecimalPoint = (num) => {
  if (typeof num !== 'number' || isNaN(num)) return '0';
  // Convertir en string avec 3 décimales en format US (avec point)
  return num.toLocaleString('en-US', { 
    minimumFractionDigits: 3, 
    maximumFractionDigits: 3,
    useGrouping: false 
  });
};

const OCRProcessor = ({ pdfFile, selectedArea, selectedPages, onComplete }) => {
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
  const [enableConversion, setEnableConversion] = useState(true);
  const [isCancelled, setIsCancelled] = useState(false);

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
  const saveProgress = (newResults, lastProcessedIndex) => {
    if (pdfFile) {
      const progressData = {
        results: newResults,
        lastProcessedIndex: lastProcessedIndex,
        selectedPages: selectedPages,
        totalPages: totalPages,
        timestamp: Date.now()
      };
      const savedKey = `ocr_progress_${pdfFile.filename}`;
      localStorage.setItem(savedKey, JSON.stringify(progressData));
      console.log('Progrès sauvegardé:', progressData);
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

  // SOLUTION SIMPLE : Extraction coordonnées brutes sans conversion
  const extractCoordinatesSimple = async (text) => {
    console.log('🎯 EXTRACTION SIMPLE pour texte:', text);
    
    // Extraire les coordonnées brutes
    const coords = await extractBasicCoordinates(text);
    
    if (coords.x > 1000 && coords.y > 1000) {
      console.log('✅ Coordonnées extraites:', coords.x, coords.y);
      return { 
        x: coords.x, 
        y: coords.y, 
        converted: false,
        system: 'Coordonnées détectées' 
      };
    }
    
    return { x: 0, y: 0, converted: false, system: 'Aucune' };
  };

  const startBatchOCR = async () => {
    if (!selectedArea) {
      alert('Veuillez d\'abord sélectionner une zone sur le PDF');
      return;
    }

    if (!selectedPages || selectedPages.length === 0) {
      alert('Veuillez sélectionner au moins une page à traiter');
      return;
    }

    console.log('Démarrage OCR batch avec zone:', selectedArea);
    console.log('Pages sélectionnées:', selectedPages);
    setIsProcessing(true);
    setResults([]);
    
    // Variable locale pour stocker les résultats
    const batchResults = [];
    
    try {
      // Utiliser les pages sélectionnées au lieu de toutes les pages
      const pagesToProcess = selectedPages.sort((a, b) => a - b);
      setTotalPages(pagesToProcess.length);
      console.log(`Traitement de ${pagesToProcess.length} pages sélectionnées:`, pagesToProcess);
      
      // Déterminer la page de départ (reprise ou début)
      let startIndex = 0;
      if (savedProgress && savedProgress.lastProcessedIndex !== undefined) {
        const shouldResume = confirm(`Un traitement précédent s'est arrêté à l'index ${savedProgress.lastProcessedIndex}. Voulez-vous reprendre ?`);
        if (shouldResume) {
          startIndex = savedProgress.lastProcessedIndex + 1;
          batchResults.push(...savedProgress.results);
          console.log(`Reprise du traitement à partir de l'index ${startIndex}`);
        }
      }

      // Traiter les pages sélectionnées
      for (let i = startIndex; i < pagesToProcess.length; i++) {
        // Vérifier si l'utilisateur a annulé
        if (isCancelled) {
          console.log('Traitement annulé par l\'utilisateur');
          alert('Traitement annulé. Progression sauvegardée.');
          return;
        }
        
        const pageNum = pagesToProcess[i];
        setCurrentPage(i + 1); // Pour l'affichage du progrès
        console.log(`Traitement page ${pageNum} (${i + 1}/${pagesToProcess.length})...`);
        const pageResult = await processPage(pageNum);
        if (pageResult) {
          batchResults.push(pageResult);
          // Sauvegarder le progrès après chaque page
          saveProgress(batchResults, i);
        }
      }
      
      // Mettre à jour les résultats dans le state
      setResults(batchResults);
      console.log('Tous les résultats collectés:', batchResults);
      
      // Générer le fichier Excel final avec les résultats collectés
      await generateExcel(batchResults);
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
      setIsCancelled(false);
    }
  };
  
  const cancelOCR = () => {
    setIsCancelled(true);
    console.log('Annulation demandée...');
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

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erreur API OCR:', errorText);
        throw new Error(`Erreur API OCR: ${response.status} - ${errorText}`);
      }

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
        const coordinates = await extractCoordinatesSimple(validatedResult.text);
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
    
    // Scale équilibrée pour OCR (vitesse vs qualité)
    const ocrScale = 3.0; // ✅ Compromis performance/qualité
    const viewport = page.getViewport({ scale: ocrScale });
    console.log('OCR Viewport dimensions (scale 3x):', viewport.width, 'x', viewport.height);
    
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

    // Taille optimale pour OCR (équilibre performance/qualité)
    const minWidth = Math.max(width, 450); // ✅ Compromis taille/qualité
    const minHeight = Math.max(height, 225);
    
    const zoneCanvas = document.createElement('canvas');
    const zoneContext = zoneCanvas.getContext('2d');
    zoneCanvas.width = minWidth;
    zoneCanvas.height = minHeight;

    // ✅ Fond blanc pur pour contraste maximal
    zoneContext.fillStyle = '#FFFFFF';
    zoneContext.fillRect(0, 0, minWidth, minHeight);

    // ✅ Amélioration qualité avec antialiasing
    zoneContext.imageSmoothingEnabled = true;
    zoneContext.imageSmoothingQuality = 'high';

    // Copier la zone avec mise à l'échelle optimisée
    zoneContext.drawImage(
      canvas, 
      x, y, width, height,  // source
      0, 0, minWidth, minHeight  // destination - agrandie pour OCR
    );

    console.log('Canvas zone créé:', minWidth, 'x', minHeight);

    // Format JPEG haute qualité pour OCR (compromis taille/qualité)
    const dataURL = zoneCanvas.toDataURL('image/jpeg', 0.95); // JPEG 95% qualité
    console.log('Image OCR haute qualité générée, taille:', dataURL.length, 'dimensions:', minWidth, 'x', minHeight);
    
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

  const testSinglePage = async () => {
    if (!selectedArea) {
      alert('Veuillez d\'abord sélectionner une zone sur le PDF');
      return;
    }

    if (!selectedPages || selectedPages.length === 0) {
      alert('Veuillez sélectionner au moins une page à traiter');
      return;
    }

    const firstPage = Math.min(...selectedPages);
    console.log(`Test OCR première page sélectionnée (${firstPage}) avec zone:`, selectedArea);
    setIsProcessing(true);
    setResults([]);
    
    try {
      setTotalPages(1);
      setCurrentPage(1);
      
      console.log(`Test page ${firstPage}...`);
      const pageResult = await processPage(firstPage);
      
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

  const generateExcel = async (finalResults = null) => {
    // Utiliser les résultats passés en paramètre ou ceux du state
    const dataToExport = finalResults || results;
    console.log('Génération Excel avec résultats:', dataToExport);
    
    if (!dataToExport || dataToExport.length === 0) {
      alert('Aucun résultat à exporter !');
      return;
    }
    
    // Nom du fichier PDF (sans extension) - utiliser originalName pour éviter le préfixe timestamp
    const pdfName = pdfFile.originalName ? 
      pdfFile.originalName.replace('.pdf', '') : 
      (pdfFile.filename ? pdfFile.filename.replace('.pdf', '') : 'document');
    
    // Créer les données pour Excel - Format demandé : nom_page, X, Y
    // APPROCHE RADICALE : Forcer les coordonnées en STRING avec points dès le départ
    const excelData = dataToExport.map(result => {
      // Vérifier que les coordonnées existent
      if (!result.coordinates) {
        console.warn('Coordonnées manquantes pour la page:', result.page);
        return [
          `${pdfName}_${result.page}`, // Colonne A : nom_page
          "0.000", // Colonne B : X en string
          "0.000"  // Colonne C : Y en string
        ];
      }
      
      // EXTRACTION BRUTALE ET CONVERSION FORCÉE
      let xRaw = result.coordinates.x;
      let yRaw = result.coordinates.y;
      
      // Convertir en string et forcer les points décimaux
      let xString = String(xRaw).replace(/,/g, '.');
      let yString = String(yRaw).replace(/,/g, '.');
      
      // Ajouter .000 si pas de décimales
      if (!xString.includes('.')) xString += '.000';
      if (!yString.includes('.')) yString += '.000';
      
      // S'assurer qu'on a exactement 3 décimales
      const xParts = xString.split('.');
      const yParts = yString.split('.');
      
      const xFinal = xParts[0] + '.' + (xParts[1] || '000').padEnd(3, '0').substring(0, 3);
      const yFinal = yParts[0] + '.' + (yParts[1] || '000').padEnd(3, '0').substring(0, 3);
      
      console.log(`🔧 CONVERSION FORCÉE Page ${result.page}:`);
      console.log(`  Raw: X=${xRaw}, Y=${yRaw}`);
      console.log(`  String: X="${xString}", Y="${yString}"`);
      console.log(`  Final: X="${xFinal}", Y="${yFinal}"`);
      
      return [
        `${pdfName}_${result.page}`, // Colonne A : nom_page
        xFinal, // Colonne B : X en string avec point décimal
        yFinal  // Colonne C : Y en string avec point décimal
      ];
    });
    
    // Créer le workbook et la worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData); // Données avec strings formatées
    
    console.log('📊 Worksheet créée avec strings formatées (points décimaux forcés)');
    
    // Ajouter la worksheet au workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Coordonnées');
    
    // Générer le fichier Excel
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    // Télécharger le fichier
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `${pdfName}_coordonnees_${new Date().toISOString().slice(0, 10)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    alert(`✅ Fichier Excel généré avec ${dataToExport.length} pages !\n\nFormat : Colonne A = nom_page, B = X, C = Y\n💡 Coordonnées en Lambert II étendu.`);
    
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

  // Fonction synchrone pour extraction de coordonnées basique
  const extractBasicCoordinatesSync = (text) => {
    const patterns = [
      /(?:Lambert\s*2?\s*)?(?:étendu|etend[iu])\s*:?\s*(\d{4,}(?:[.,]\d+)?)\s*m?[,\s;]+(\d{4,}(?:[.,]\d+)?)\s*m?/i,
      /X\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)[,\s;]+Y\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)/i,
      /E\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)[,\s;]+N\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)/i,
      /(\d{4,}(?:[.,]\d+)?)\s*m?[,\s;]+(\d{4,}(?:[.,]\d+)?)\s*m/i,
      /(\d{4,}[.,]\d+)[,\s;]+(\d{4,}[.,]\d+)/,
      /(\d{4,})[,\s;]+(\d{4,})/,
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

  // Composant simple pour afficher les coordonnées
  const SimpleCoordinateDisplay = ({ text }) => {
    const coords = extractBasicCoordinatesSync(text);
    
    if (coords && coords.x > 1000 && coords.y > 1000) {
      return (
        <div className="coords-display">
          <div className="standard-coords">
            <span className="coord-label">Lambert II étendu :</span>
            <span className="coord-x">X: {coords.x ? forceDecimalPoint(coords.x) : 'N/A'}</span>
            <span className="coord-y">Y: {coords.y ? forceDecimalPoint(coords.y) : 'N/A'}</span>
          </div>
        </div>
      );
    }
    
    return (
      <div className="coords-display">
        <span className="coord-warning">⚠️ Aucune coordonnée détectée</span>
      </div>
    );
  };

  return (
    <div className="ocr-processor">
      <div className="extraction-info">
        <h3>🎯 Extraction de coordonnées PDF</h3>
        <p>Cette application extrait automatiquement les coordonnées depuis vos documents PDF.</p>
        <p><strong>Format de sortie :</strong> Fichier Excel (.xlsx) avec coordonnées prêtes à utiliser</p>
        
        {selectedPages && selectedPages.length > 0 && (
          <div className="pages-selected-info" style={{
            backgroundColor: '#d1ecf1',
            border: '1px solid #bee5eb',
            borderRadius: '4px',
            padding: '10px',
            marginTop: '10px'
          }}>
            <strong>📄 Pages sélectionnées :</strong> {selectedPages.join(', ')} 
            <span style={{ color: '#6c757d', marginLeft: '10px' }}>
              ({selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} à traiter)
            </span>
          </div>
        )}
      </div>

      <div className="ocr-controls">
        {savedProgress && (
          <div className="saved-progress-info">
            <p>⚠️ Traitement interrompu à l'index {savedProgress.lastProcessedIndex}/{savedProgress.totalPages || 'N/A'}</p>
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
            <p style={{ marginTop: '10px', fontSize: '14px', color: '#6c757d' }}>
              💡 Vous pouvez annuler le traitement depuis la fenêtre de validation
            </p>
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
                  <SimpleCoordinateDisplay text={correctedText} />
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
                    }}
                    rows={4}
                    className="correction-input"
                  />
                </div>
                
                <div className="validation-buttons">
                  <button onClick={validateOCR} className="validate-btn" style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    marginRight: '10px'
                  }}>
                    ✓ Valider et continuer
                  </button>
                  
                  <button 
                    onClick={() => {
                      setIsCancelled(true);
                      setShowValidation(false);
                      setCurrentImageData(null);
                      alert('Traitement annulé. La progression a été sauvegardée.');
                    }}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    ✖ Annuler le traitement
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
          <h3>📊 Résultats ({results.length} pages)</h3>
          <p><strong>Système :</strong> Lambert II étendu</p>
          <p><strong>Format Excel :</strong> Colonne A = nom_page, B = X, C = Y (sans en-têtes)</p>
          <table className="results-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Texte OCR</th>
                <th>X (L2E)</th>
                <th>Y (L2E)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index}>
                  <td>{result.page}</td>
                  <td className="text-cell" title={result.text}>{result.text.length > 50 ? result.text.substring(0, 50) + '...' : result.text}</td>
                  <td>{result.coordinates.x ? forceDecimalPoint(result.coordinates.x) : 'N/A'}</td>
                  <td>{result.coordinates.y ? forceDecimalPoint(result.coordinates.y) : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button 
            onClick={() => generateExcel(results)}
            className="export-excel-btn"
            style={{ 
              marginTop: '10px', 
              backgroundColor: '#28a745', 
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            📊 Télécharger Excel
          </button>
        </div>
      )}
    </div>
  );
};

export default OCRProcessor;