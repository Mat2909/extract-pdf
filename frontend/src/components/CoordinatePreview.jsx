import React, { useState, useEffect } from 'react';
import { normalizeCoordinates } from '../utils/coordinateConverter';

const CoordinatePreview = ({ text, enableConversion, sourceSystem, targetSystem }) => {
  const [coordinates, setCoordinates] = useState({ x: 0, y: 0, converted: false });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (text && text.trim()) {
      setIsLoading(true);
      extractCoordinatesFromText(text).finally(() => setIsLoading(false));
    }
  }, [text, enableConversion, sourceSystem, targetSystem]);

  const extractCoordinatesFromText = async (text) => {
    console.log('🔍 Extraction coordonnées du texte:', text);
    console.log('🔍 Longueur du texte:', text.length);
    console.log('🔍 Conversion activée:', enableConversion);
    console.log('🔍 Systèmes source/target:', sourceSystem.id, targetSystem.id);
    
    // Patterns spécifiques pour coordonnées, dans l'ordre de priorité - VERSION ÉTENDUE
    const patterns = [
      // Format "Lambert 2 étendu: 123456.789 m, 987654.321 m"
      /(?:Lambert\s*2?\s*)?(?:étendu|etend[iu])\s*:?\s*(\d{4,}(?:[.,]\d+)?)\s*m?[,\s;]+(\d{4,}(?:[.,]\d+)?)\s*m?/i,
      
      // Format "X: 123456.789, Y: 987654.321" ou "X = 123456.789, Y = 987654.321"
      /X\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)[,\s;]+Y\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)/i,
      
      // Format "E: 123456.789, N: 987654.321" (Easting/Northing)
      /E\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)[,\s;]+N\s*[:=]\s*(\d{4,}(?:[.,]\d+)?)/i,
      
      // Format direct avec unités "123456.789 m, 987654.321 m"
      /(\d{4,}(?:[.,]\d+)?)\s*m?[,\s;]+(\d{4,}(?:[.,]\d+)?)\s*m/i,
      
      // Format avec virgule française (123 456,789 au lieu de 123456.789)
      /(\d{1,3}(?:\s\d{3})*[.,]\d+)[,\s;]+(\d{1,3}(?:\s\d{3})*[.,]\d+)/,
      
      // Format simple avec deux nombres décimaux longs
      /(\d{4,}[.,]\d+)[,\s;]+(\d{4,}[.,]\d+)/,
      
      // Format avec coordonnées séparées par retour à la ligne
      /(\d{5,7}(?:[.,]\d{1,3})?)\s*[\r\n]+\s*(\d{6,8}(?:[.,]\d{1,3})?)/,
      
      // Format sans séparateurs explicites mais avec espacement
      /(\d{5,7}(?:[.,]\d{1,3})?)\s{2,}(\d{6,8}(?:[.,]\d{1,3})?)/,
      
      // Format avec parenthèses
      /[\(\[]?\s*(\d{5,7}(?:[.,]\d+)?)\s*[,;]\s*(\d{6,8}(?:[.,]\d+)?)\s*[\)\]]?/,
      
      // Format avec espaces "123456.789 987654.321"
      /(\d{4,}[.,]\d+)\s+(\d{4,}[.,]\d+)/,
      
      // Format entiers longs séparés
      /(\d{4,})[,\s;]+(\d{4,})/,
      
      // Format avec parenthèses ou crochets
      /[\(\[]?\s*(\d{4,}(?:[.,]\d+)?)\s*[,;\s]+\s*(\d{4,}(?:[.,]\d+)?)\s*[\)\]]?/,
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      console.log(`🔍 Test pattern ${i + 1}:`, pattern.toString());
      const match = text.match(pattern);
      console.log(`🔍 Résultat pattern ${i + 1}:`, match);
      if (match) {
        // Utiliser normalizeCoordinates pour gérer correctement les séparateurs
        try {
          const normalized = normalizeCoordinates(match[1], match[2]);
          const x = normalized.x;
          const y = normalized.y;
          
          // Vérifier que les coordonnées sont valides (seuils plus bas pour plus de tolérance)
          console.log('🔍 Coordonnées normalisées:', { x, y });
          if (x > 1000 && y > 1000) {
            console.log('✅ Coordonnées valides extraites avec pattern:', { x, y, pattern: pattern.toString() });
          
          // CONVERSION GEOFREE AMÉLIORÉE - Pour réseaux de gaz
          if (enableConversion && sourceSystem.id !== targetSystem.id) {
            console.log('🎯 OCR: Conversion Geofree Lambert II étendu → Lambert 93 - API');
            try {
              // Utilisation de la vraie API geofree.fr
              const result = await convertViaGeofree(x, y);
              
              console.log('✅ Conversion réussie:', result);
              
              setCoordinates({ 
                x: result.x, 
                y: result.y,
                originalX: x,
                originalY: y,
                converted: true,
                fromSystem: sourceSystem.name,
                toSystem: targetSystem.name,
                precision: result.precision,
                source: result.source
              });
              return;
              
            } catch (conversionError) {
              console.error('❌ Erreur conversion:', conversionError);
              // Fallback: retourner les coordonnées non converties
              setCoordinates({ 
                x, 
                y, 
                converted: false,
                error: conversionError.message 
              });
              return;
            }
          }
          
            setCoordinates({ x, y, converted: false });
            return;
          } else {
            console.log('⚠️ Coordonnées rejetées (seuils):', { x, y });
          }
        } catch (error) {
          console.warn('Erreur normalisation coordonnées:', error);
          // Continuer avec le pattern suivant
        }
      }
    }
    
    // Fallback étendu: chercher tous les nombres décimaux et entiers longs
    const longNumberPattern = /\d{4,}(?:[.,]\d+)?/g;
    const longNumbers = text.match(longNumberPattern);
    
    console.log('Nombres longs détectés:', longNumbers);
    
    if (longNumbers && longNumbers.length >= 2) {
      try {
        const normalized = normalizeCoordinates(longNumbers[0], longNumbers[1]);
        const x = normalized.x;
        const y = normalized.y;
        console.log('Coordonnées extraites (fallback):', { x, y });
        
        // CONVERSION GEOFREE AMÉLIORÉE (fallback aussi)
        if (enableConversion && sourceSystem.id !== targetSystem.id) {
          console.log('🎯 OCR Fallback: Conversion Geofree Lambert II étendu → Lambert 93 - DELTAS FIXES');
          try {
            // Utilisation de la vraie API geofree.fr
            const result = await convertViaGeofree(x, y);
            
            setCoordinates({ 
              x: result.x, 
              y: result.y,
              originalX: x,
              originalY: y,
              converted: true,
              fromSystem: sourceSystem.name,
              toSystem: targetSystem.name,
              precision: result.precision,
              source: result.source
            });
            return;
            
          } catch (conversionError) {
            console.error('Erreur conversion fallback:', conversionError);
            // Fallback: retourner les coordonnées non converties
            setCoordinates({ 
              x, 
              y, 
              converted: false,
              error: conversionError.message 
            });
            return;
          }
        }
        
        setCoordinates({ x, y, converted: false });
        return;
      } catch (error) {
        console.warn('Erreur normalisation fallback:', error);
      }
    }
    
    console.log('❌ AUCUNE coordonnée trouvée dans le texte, retour 0,0');
    console.log('❌ Texte analysé était:', JSON.stringify(text));
    setCoordinates({ x: 0, y: 0, converted: false });
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

  return (
    <div className="coords-display">
      {isLoading ? (
        <div className="loading-coords">🔄 Conversion en cours...</div>
      ) : coordinates.converted ? (
        <div className="converted-coords">
          <div className="original-coords">
            <span className="coord-label">Original ({coordinates.fromSystem}):</span>
            <span className="coord-x">X: {coordinates.originalX?.toFixed(2) || 'N/A'}</span>
            <span className="coord-y">Y: {coordinates.originalY?.toFixed(2) || 'N/A'}</span>
          </div>
          <div className="arrow">↓</div>
          <div className="final-coords">
            <span className="coord-label">Converti ({coordinates.toSystem}):</span>
            <span className="coord-x">X: {coordinates.x?.toFixed(2) || 'N/A'}</span>
            <span className="coord-y">Y: {coordinates.y?.toFixed(2) || 'N/A'}</span>
            <span className="precision-info">({coordinates.precision})</span>
          </div>
        </div>
      ) : (
        <div className="standard-coords">
          <span className="coord-x">X: {coordinates.x?.toFixed(2) || 'N/A'}</span>
          <span className="coord-y">Y: {coordinates.y?.toFixed(2) || 'N/A'}</span>
        </div>
      )}
      {(coordinates.x === 0 && coordinates.y === 0) && !isLoading && (
        <span className="coord-warning">⚠️ Aucune coordonnée détectée</span>
      )}
    </div>
  );
};

export default CoordinatePreview;