import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './PDFViewer.css';

// Configuration worker avec fallback robuste pour Vercel
const configurePDFWorker = () => {
  // Try local worker first (for Vercel build)
  const localWorkerPath = '/pdf.worker.js';
  const cdnWorkerPath = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  
  // En production, utiliser le worker local copyé dans public/
  if (import.meta.env.PROD) {
    console.log('🔧 Production: Using local PDF worker');
    pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
  } else {
    console.log('🔧 Development: Using CDN PDF worker');
    pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerPath;
  }
};

// Configurer le worker au chargement
configurePDFWorker();

const PDFViewer = ({ pdfUrl, onAreaSelect, onPagesChange, currentStep, onStepChange, onTotalPagesChange, selectedPages = [] }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPageNum, setCurrentPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1.0);
  const [pagesToKeep, setPagesToKeep] = useState(new Set());
  const [showPageManager, setShowPageManager] = useState(false);
  const [pagesValidated, setPagesValidated] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [validatedPages, setValidatedPages] = useState([]);
  const [temporarySelection, setTemporarySelection] = useState(null);

  useEffect(() => {
    if (pdfUrl) {
      loadPDF();
    }
  }, [pdfUrl]);

  // Effet pour afficher la première page sélectionnée à l'étape 3
  useEffect(() => {
    if (currentStep === 3 && selectedPages.length > 0 && pdfDocument) {
      const firstSelectedPage = Math.min(...selectedPages);
      if (firstSelectedPage !== currentPageNum) {
        setCurrentPageNum(firstSelectedPage);
        goToPage(firstSelectedPage);
      }
    }
  }, [currentStep, selectedPages, pdfDocument]);

  const loadPDF = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('🔍 Loading PDF from:', pdfUrl);
      console.log('🔧 PDF Worker configured at:', pdfjsLib.GlobalWorkerOptions.workerSrc);

      const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
      setPdfDocument(pdf);
      setTotalPages(pdf.numPages);
      
      // Transmettre le nombre total de pages au parent
      if (onTotalPagesChange) {
        onTotalPagesChange(pdf.numPages);
      }
      
      // Initialiser toutes les pages comme sélectionnées
      const allPages = new Set();
      for (let i = 1; i <= pdf.numPages; i++) {
        allPages.add(i);
      }
      setPagesToKeep(allPages);
      
      const page = await pdf.getPage(1);
      renderPage(page);
    } catch (err) {
      console.error('❌ Erreur chargement PDF:', err);
      console.error('❌ Worker path:', pdfjsLib.GlobalWorkerOptions.workerSrc);
      
      // Tentative de fallback avec CDN si le worker local échoue
      if (import.meta.env.PROD && err.message?.includes('worker')) {
        console.log('🔄 Tentative fallback CDN worker...');
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
          const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
          setPdfDocument(pdf);
          setTotalPages(pdf.numPages);
          
          if (onTotalPagesChange) {
            onTotalPagesChange(pdf.numPages);
          }
          
          const allPages = new Set();
          for (let i = 1; i <= pdf.numPages; i++) {
            allPages.add(i);
          }
          setPagesToKeep(allPages);
          
          const page = await pdf.getPage(1);
          renderPage(page);
          
          console.log('✅ Fallback CDN réussi');
          return;
        } catch (fallbackErr) {
          console.error('❌ Fallback CDN échec:', fallbackErr);
        }
      }
      
      setError(`Impossible de charger le PDF: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = async (page) => {
    const canvas = canvasRef.current;
    if (!canvas || isRendering) return;

    setIsRendering(true);
    try {
      const context = canvas.getContext('2d');
      // Utiliser le zoom pour le rendu - échelle de base plus zoom
      const baseScale = 1.5; // Échelle de base pour une bonne qualité
      const viewport = page.getViewport({ scale: baseScale * zoom });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Ajuster le style CSS du canvas pour l'affichage
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      // Nettoyer le canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = 'white';
      context.fillRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;
      console.log(`Page rendue avec zoom ${zoom}x - Canvas: ${canvas.width}x${canvas.height}, Display: ${canvas.style.width}x${canvas.style.height}`);
    } finally {
      setIsRendering(false);
    }
  };

  const goToPage = async (pageNum) => {
    // Si les pages sont validées, vérifier que la page fait partie des pages autorisées
    if (pagesValidated && validatedPages.length > 0) {
      if (!validatedPages.includes(pageNum)) return;
    } else {
      // Navigation normale
      if (!pdfDocument || pageNum < 1 || pageNum > totalPages) return;
    }
    
    setCurrentPageNum(pageNum);
    const page = await pdfDocument.getPage(pageNum);
    await renderPage(page);
    // Effacer la sélection quand on change de page
    clearSelection();
  };

  const handleZoomChange = async (newZoom) => {
    if (isRendering) return;
    setZoom(newZoom);
    if (pdfDocument) {
      const page = await pdfDocument.getPage(currentPageNum);
      await renderPage(page);
    }
  };

  const togglePageSelection = (pageNum) => {
    const newPages = new Set(pagesToKeep);
    if (newPages.has(pageNum)) {
      newPages.delete(pageNum);
    } else {
      newPages.add(pageNum);
    }
    setPagesToKeep(newPages);
    
    // Notifier le parent des pages sélectionnées
    if (onPagesChange) {
      onPagesChange(Array.from(newPages).sort((a, b) => a - b));
    }
  };

  const getCanvasCoordinates = (clientX, clientY) => {
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Coordonnées par rapport au canvas affiché
    const displayX = clientX - rect.left;
    const displayY = clientY - rect.top;
    
    // Conversion vers les coordonnées réelles du canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = displayX * scaleX;
    const y = displayY * scaleY;
    
    console.log('Mouse coords:', { clientX, clientY });
    console.log('Display coords:', { displayX, displayY });
    console.log('Canvas coords:', { x, y });
    console.log('Scale factors:', { scaleX, scaleY });
    
    return { x, y };
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    
    // Coordonnées pour l'affichage (relatives au canvas affiché)
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    
    // Coordonnées pour l'extraction (relatives au canvas réel)
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const realX = displayX * scaleX;
    const realY = displayY * scaleY;
    
    setIsSelecting(true);
    setStartPoint({ display: { x: displayX, y: displayY }, real: { x: realX, y: realY } });
    setSelection({
      x: displayX,  // Pour l'affichage
      y: displayY,
      width: 0,
      height: 0
    });
  };

  const handleMouseMove = (e) => {
    if (!isSelecting || !startPoint) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const displayX = e.clientX - rect.left;
    const displayY = e.clientY - rect.top;
    
    // Sélection pour l'affichage (coordonnées d'affichage)
    const newSelection = {
      x: Math.min(startPoint.display.x, displayX),
      y: Math.min(startPoint.display.y, displayY),
      width: Math.abs(displayX - startPoint.display.x),
      height: Math.abs(displayY - startPoint.display.y)
    };
    
    setSelection(newSelection);
  };

  const handleMouseUp = () => {
    if (!isSelecting || !selection || !canvasRef.current) return;
    
    setIsSelecting(false);
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Convertir la sélection d'affichage en coordonnées réelles du canvas
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const realSelection = {
      x: selection.x * scaleX,
      y: selection.y * scaleY,
      width: selection.width * scaleX,
      height: selection.height * scaleY
    };
    
    // Convertir en coordonnées relatives (0-1)
    const relativeSelection = {
      x: realSelection.x / canvas.width,
      y: realSelection.y / canvas.height,
      width: realSelection.width / canvas.width,
      height: realSelection.height / canvas.height
    };
    
    console.log('Zone sélectionnée (affichage):', selection);
    console.log('Zone sélectionnée (canvas réel):', realSelection);
    console.log('Zone sélectionnée (relative):', relativeSelection);
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('Display dimensions:', rect.width, 'x', rect.height);
    
    // Seulement si la sélection est assez grande
    if (relativeSelection.width > 0.01 && relativeSelection.height > 0.01) {
      // Stocker temporairement la sélection au lieu de l'appliquer immédiatement
      setTemporarySelection(relativeSelection);
      console.log('Zone stockée temporairement:', relativeSelection);
    }
  };

  const clearSelection = () => {
    setSelection(null);
    setStartPoint(null);
    setTemporarySelection(null);
    onAreaSelect(null);
  };

  const validateZoneSelection = () => {
    if (temporarySelection) {
      onAreaSelect(temporarySelection);
      console.log('Zone validée et transmise au parent:', temporarySelection);
    }
  };

  if (isLoading) {
    return <div className="pdf-loading">Chargement du PDF...</div>;
  }

  if (error) {
    return <div className="pdf-error">Erreur: {error}</div>;
  }

  return (
    <div className="pdf-viewer">
      {/* Étape 3 : Zone d'extraction */}
      {currentStep === 3 && (
        <div className="step-header" style={{
          textAlign: 'center',
          margin: '20px 0',
          padding: '20px',
          backgroundColor: '#fff3cd',
          borderRadius: '8px',
          border: '1px solid #ffeaa7'
        }}>
          <h3>Étape 3 : Zone d'extraction</h3>
          <p>Sélectionnez la zone contenant les coordonnées sur le PDF</p>
        </div>
      )}
      
      {/* Contrôles de gestion des pages */}
      <div className="pdf-header">
        <div className="page-manager-controls">
          <button 
            onClick={() => setShowPageManager(!showPageManager)}
            className="toggle-manager-btn"
            style={{ 
              backgroundColor: showPageManager ? '#dc3545' : '#007bff',
              color: 'white',
              padding: '8px 12px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            {showPageManager ? '✖ Fermer gestionnaire' : '📄 Gérer les pages'}
          </button>
          
          {pagesToKeep.size < totalPages && (
            <span className="pages-info" style={{ color: '#dc3545', fontWeight: 'bold' }}>
              {pagesToKeep.size}/{totalPages} pages sélectionnées
            </span>
          )}
          
          {pagesValidated && (
            <span className="pages-validated" style={{ 
              color: '#28a745', 
              fontWeight: 'bold',
              marginLeft: '10px',
              padding: '4px 8px',
              backgroundColor: '#d4edda',
              borderRadius: '3px',
              border: '1px solid #c3e6cb'
            }}>
              ✓ Pages validées
            </span>
          )}
        </div>

        {showPageManager && (
          <div className="page-manager" style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            padding: '15px',
            marginTop: '10px'
          }}>
            <h4>Sélection des pages à traiter</h4>
            <p>Décochez les pages qui ne contiennent pas de plans :</p>
            
            <div className="pages-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: '8px',
              marginTop: '10px'
            }}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                <label key={pageNum} style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '5px',
                  backgroundColor: pagesToKeep.has(pageNum) ? '#d4edda' : '#f8d7da',
                  borderRadius: '3px',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={pagesToKeep.has(pageNum)}
                    onChange={() => togglePageSelection(pageNum)}
                    style={{ marginRight: '5px' }}
                  />
                  Page {pageNum}
                </label>
              ))}
            </div>

            <div className="page-manager-actions" style={{ marginTop: '15px' }}>
              <button 
                onClick={() => {
                  const allPages = new Set();
                  for (let i = 1; i <= totalPages; i++) allPages.add(i);
                  setPagesToKeep(allPages);
                  if (onPagesChange) onPagesChange(Array.from(allPages));
                }}
                style={{ marginRight: '10px', padding: '5px 10px' }}
              >
                Tout sélectionner
              </button>
              <button 
                onClick={() => {
                  setPagesToKeep(new Set());
                  if (onPagesChange) onPagesChange([]);
                }}
                style={{ marginRight: '10px', padding: '5px 10px' }}
              >
                Tout désélectionner
              </button>
              <button 
                onClick={() => {
                  const selectedPagesArray = Array.from(pagesToKeep).sort((a, b) => a - b);
                  setPagesValidated(true);
                  setValidatedPages(selectedPagesArray);
                  setShowPageManager(false);
                  // Aller à la première page sélectionnée
                  if (selectedPagesArray.length > 0) {
                    goToPage(selectedPagesArray[0]);
                  }
                  if (onPagesChange) onPagesChange(selectedPagesArray);
                  // Passer à l'étape suivante
                  if (onStepChange) onStepChange(3);
                }}
                style={{ 
                  backgroundColor: '#28a745', 
                  color: 'white', 
                  padding: '8px 15px',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
                disabled={pagesToKeep.size === 0}
              >
                ✓ Valider pages sélectionnées
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Contrôles de navigation et zoom */}
      <div className="pdf-navigation">
        <div className="page-controls">
          <button 
            onClick={() => {
              if (pagesValidated && validatedPages.length > 0) {
                const currentIndex = validatedPages.indexOf(currentPageNum);
                if (currentIndex > 0) {
                  goToPage(validatedPages[currentIndex - 1]);
                }
              } else {
                goToPage(currentPageNum - 1);
              }
            }}
            disabled={pagesValidated && validatedPages.length > 0 ? 
              validatedPages.indexOf(currentPageNum) <= 0 : 
              currentPageNum <= 1}
            className="nav-btn"
          >
            ← Page précédente
          </button>
          
          <span className="page-info">
            {pagesValidated && validatedPages.length > 0 ? 
              `Page ${currentPageNum} (${validatedPages.indexOf(currentPageNum) + 1} / ${validatedPages.length})` :
              `Page ${currentPageNum} / ${totalPages}`}
          </span>
          
          <button 
            onClick={() => {
              if (pagesValidated && validatedPages.length > 0) {
                const currentIndex = validatedPages.indexOf(currentPageNum);
                if (currentIndex < validatedPages.length - 1) {
                  goToPage(validatedPages[currentIndex + 1]);
                }
              } else {
                goToPage(currentPageNum + 1);
              }
            }}
            disabled={pagesValidated && validatedPages.length > 0 ? 
              validatedPages.indexOf(currentPageNum) >= validatedPages.length - 1 : 
              currentPageNum >= totalPages}
            className="nav-btn"
          >
            Page suivante →
          </button>
        </div>

        <div className="zoom-controls">
          <label>Zoom: </label>
          <button 
            onClick={() => handleZoomChange(Math.max(zoom - 0.25, 0.5))} 
            disabled={zoom <= 0.5 || isRendering}
          >
            -
          </button>
          <span style={{ margin: '0 10px' }}>{Math.round(zoom * 100)}%</span>
          <button 
            onClick={() => handleZoomChange(Math.min(zoom + 0.25, 3.0))} 
            disabled={zoom >= 3.0 || isRendering}
          >
            +
          </button>
          <select 
            value={zoom} 
            onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
            style={{ marginLeft: '10px' }}
            disabled={isRendering}
          >
            <option value={0.5}>50%</option>
            <option value={0.75}>75%</option>
            <option value={1.0}>100%</option>
            <option value={1.25}>125%</option>
            <option value={1.5}>150%</option>
            <option value={2.0}>200%</option>
            <option value={3.0}>300%</option>
          </select>
        </div>
      </div>

      {/* Container du PDF avec scroll pour le zoom */}
      <div 
        ref={containerRef} 
        className="pdf-container" 
        style={{
          border: '1px solid #ddd',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '70vh',
          position: 'relative',
          // Assurer que le scroll fonctionne bien avec le zoom
          maxWidth: '100%'
        }}
      >
        <canvas
          ref={canvasRef}
          className="pdf-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            display: 'block', 
            cursor: 'crosshair',
            maxWidth: 'none' // Permettre au canvas de dépasser pour le zoom
          }}
        />
        
        {selection && (
          <div
            className="pdf-selection"
            style={{
              position: 'absolute',
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
              border: '3px solid #007bff',
              backgroundColor: 'rgba(0, 123, 255, 0.2)',
              pointerEvents: 'none',
              boxSizing: 'border-box'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '-25px',
              left: '0',
              backgroundColor: '#007bff',
              color: 'white',
              padding: '2px 6px',
              fontSize: '12px',
              borderRadius: '3px'
            }}>
              Zone OCR
            </div>
          </div>
        )}
      </div>
      
      <div className="pdf-controls">
        {temporarySelection && (
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            padding: '15px',
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            <p style={{ margin: '0 0 10px 0', fontWeight: 'bold', color: '#856404' }}>
              Zone sélectionnée ! Validez votre sélection pour continuer.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button 
                onClick={validateZoneSelection}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                ✓ Valider cette zone
              </button>
              <button 
                onClick={clearSelection}
                style={{
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                ✗ Annuler
              </button>
            </div>
          </div>
        )}
        
        {!temporarySelection && (
          <>
            <button onClick={clearSelection} className="clear-btn">
              Effacer la sélection
            </button>
            <p className="help-text">
              Cliquez et glissez sur le PDF pour sélectionner une zone de texte
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;