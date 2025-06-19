import React, { useState, useRef, useCallback } from 'react';
import './ImageSelector.css';

const ImageSelector = ({ imageUrl, onAreaSelect }) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selection, setSelection] = useState(null);
  const [startPoint, setStartPoint] = useState(null);
  const imageRef = useRef(null);
  const containerRef = useRef(null);

  const getRelativeCoordinates = useCallback((clientX, clientY) => {
    if (!imageRef.current || !containerRef.current) return null;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const imageRect = imageRef.current.getBoundingClientRect();
    
    // Coordonnées relatives à l'image
    const x = clientX - imageRect.left;
    const y = clientY - imageRect.top;
    
    // Normaliser par rapport à la taille de l'image affichée
    const relativeX = x / imageRect.width;
    const relativeY = y / imageRect.height;
    
    return { x: relativeX, y: relativeY, absoluteX: x, absoluteY: y };
  }, []);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const coords = getRelativeCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    
    setIsSelecting(true);
    setStartPoint(coords);
    setSelection({
      x: coords.absoluteX,
      y: coords.absoluteY,
      width: 0,
      height: 0
    });
  }, [getRelativeCoordinates]);

  const handleMouseMove = useCallback((e) => {
    if (!isSelecting || !startPoint) return;
    
    const coords = getRelativeCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    
    const newSelection = {
      x: Math.min(startPoint.absoluteX, coords.absoluteX),
      y: Math.min(startPoint.absoluteY, coords.absoluteY),
      width: Math.abs(coords.absoluteX - startPoint.absoluteX),
      height: Math.abs(coords.absoluteY - startPoint.absoluteY)
    };
    
    setSelection(newSelection);
  }, [isSelecting, startPoint, getRelativeCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (!isSelecting || !selection || !imageRef.current) return;
    
    setIsSelecting(false);
    
    // Convertir en coordonnées relatives pour l'OCR
    const imageRect = imageRef.current.getBoundingClientRect();
    const relativeSelection = {
      x: selection.x / imageRect.width,
      y: selection.y / imageRect.height,
      width: selection.width / imageRect.width,
      height: selection.height / imageRect.height
    };
    
    // Seulement si la sélection est assez grande
    if (relativeSelection.width > 0.01 && relativeSelection.height > 0.01) {
      onAreaSelect(relativeSelection);
    }
  }, [isSelecting, selection, onAreaSelect]);

  const clearSelection = () => {
    setSelection(null);
    setStartPoint(null);
    onAreaSelect(null);
  };

  return (
    <div className="image-selector-container" ref={containerRef}>
      <div className="image-wrapper">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="PDF Page 1"
          className="pdf-image"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          draggable={false}
        />
        
        {selection && (
          <div
            className="selection-rectangle"
            style={{
              left: selection.x,
              top: selection.y,
              width: selection.width,
              height: selection.height,
            }}
          />
        )}
      </div>
      
      <div className="controls">
        <button onClick={clearSelection} className="clear-btn">
          Effacer la sélection
        </button>
        <p className="help-text">
          Cliquez et glissez sur l'image pour sélectionner une zone de texte
        </p>
      </div>
    </div>
  );
};

export default ImageSelector;