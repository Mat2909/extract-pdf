import proj4 from 'proj4';

// Définitions des systèmes de coordonnées
proj4.defs('EPSG:27572', '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs');
proj4.defs('EPSG:2154', '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { x, y, from, to } = req.body;
    
    console.log('🌐 Conversion VRAIE proj4 pour:', { x, y, from, to });
    
    if (from === 'L2E' && to === 'L93') {
      try {
        // Conversion VRAIE Lambert II étendu → Lambert 93 avec proj4
        const sourceProj = proj4('EPSG:27572'); // Lambert II étendu
        const targetProj = proj4('EPSG:2154');  // Lambert 93
        
        const result = proj4(sourceProj, targetProj, [x, y]);
        
        const convertedX = result[0];
        const convertedY = result[1];
        
        console.log('✅ Conversion proj4 réussie:', {
          input: { x, y },
          output: { x: convertedX, y: convertedY }
        });
        
        res.json({
          success: true,
          x: Math.round(convertedX * 100) / 100,
          y: Math.round(convertedY * 100) / 100,
          source: 'proj4 (conversion VRAIE et précise)'
        });
        
      } catch (projError) {
        console.error('❌ Erreur proj4:', projError);
        res.status(500).json({
          success: false,
          error: 'Erreur conversion proj4: ' + projError.message
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: 'Conversion supportée: L2E → L93 uniquement'
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur conversion:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la conversion: ' + error.message
    });
  }
}