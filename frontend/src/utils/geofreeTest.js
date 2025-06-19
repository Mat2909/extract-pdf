// Test de reproduction des conversions Géofree
import proj4 from 'proj4';

export function testGeofreeConversion() {
  console.log('=== TEST REPRODUCTION GÉOFREE ===');
  
  // Vos coordonnées exactes
  const inputX = 594368.498;
  const inputY = 1843413.039;
  const expectedX = 640784.56;
  const expectedY = 6240784.56;
  
  console.log('Input (Lambert II étendu):', { x: inputX, y: inputY });
  console.log('Expected (Lambert 93 - Géofree):', { x: expectedX, y: expectedY });
  
  // Définitions proj4 basées sur les standards IGN/EPSG
  // Lambert II étendu - EPSG:27572
  const lambert2eVariants = [
    {
      name: 'Standard EPSG:27572',
      def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs'
    },
    {
      name: 'Avec datum NTF explicite',
      def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +datum=NTF +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs'
    },
    {
      name: 'Paramètres complets manuels',
      def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +rf=293.4660212936269 +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs'
    },
    {
      name: 'Version IGN exacte',
      def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356515.0 +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs'
    }
  ];
  
  // Lambert 93 - EPSG:2154
  const lambert93Variants = [
    {
      name: 'Standard EPSG:2154',
      def: '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    },
    {
      name: 'Avec datum RGF93 explicite',
      def: '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +datum=RGF93 +units=m +no_defs'
    }
  ];
  
  let bestResult = null;
  let bestError = Infinity;
  
  // Tester toutes les combinaisons
  lambert2eVariants.forEach((l2e, i) => {
    lambert93Variants.forEach((l93, j) => {
      try {
        proj4.defs('L2E_TEST', l2e.def);
        proj4.defs('L93_TEST', l93.def);
        
        const result = proj4('L2E_TEST', 'L93_TEST', [inputX, inputY]);
        
        const deltaX = Math.abs(result[0] - expectedX);
        const deltaY = Math.abs(result[1] - expectedY);
        const totalError = deltaX + deltaY;
        
        console.log(`\n--- Test ${i+1}.${j+1}: ${l2e.name} → ${l93.name} ---`);
        console.log('Résultat:', { x: result[0].toFixed(3), y: result[1].toFixed(3) });
        console.log('Écart X:', deltaX.toFixed(3), 'm');
        console.log('Écart Y:', deltaY.toFixed(3), 'm');
        console.log('Erreur totale:', totalError.toFixed(3), 'm');
        
        if (totalError < bestError) {
          bestError = totalError;
          bestResult = {
            l2eDef: l2e,
            l93Def: l93,
            result: result,
            deltaX: deltaX,
            deltaY: deltaY
          };
        }
        
      } catch (error) {
        console.error(`Erreur ${i+1}.${j+1}:`, error.message);
      }
    });
  });
  
  if (bestResult) {
    console.log('\n=== MEILLEUR RÉSULTAT ===');
    console.log('Lambert II étendu:', bestResult.l2eDef.name);
    console.log('Lambert 93:', bestResult.l93Def.name);
    console.log('Résultat:', { x: bestResult.result[0].toFixed(3), y: bestResult.result[1].toFixed(3) });
    console.log('Écart X:', bestResult.deltaX.toFixed(3), 'm');
    console.log('Écart Y:', bestResult.deltaY.toFixed(3), 'm');
    console.log('Précision:', bestResult.deltaX < 1 && bestResult.deltaY < 1 ? '✅ EXCELLENTE' : 
                             bestResult.deltaX < 5 && bestResult.deltaY < 5 ? '✅ BONNE' : '⚠️ CORRECTE');
  }
  
  // Test avec conversion en deux étapes (L2E → WGS84 → L93)
  console.log('\n=== TEST CONVERSION EN 2 ÉTAPES ===');
  try {
    const l2eDef = '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs';
    const wgs84Def = '+proj=longlat +datum=WGS84 +no_defs';
    const l93Def = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
    
    proj4.defs('L2E_2STEP', l2eDef);
    proj4.defs('WGS84_2STEP', wgs84Def);
    proj4.defs('L93_2STEP', l93Def);
    
    // Étape 1: L2E → WGS84
    const wgs84Coords = proj4('L2E_2STEP', 'WGS84_2STEP', [inputX, inputY]);
    console.log('Étape 1 (L2E → WGS84):', { lon: wgs84Coords[0].toFixed(8), lat: wgs84Coords[1].toFixed(8) });
    
    // Étape 2: WGS84 → L93
    const l93Coords = proj4('WGS84_2STEP', 'L93_2STEP', wgs84Coords);
    console.log('Étape 2 (WGS84 → L93):', { x: l93Coords[0].toFixed(3), y: l93Coords[1].toFixed(3) });
    
    const deltaX2 = Math.abs(l93Coords[0] - expectedX);
    const deltaY2 = Math.abs(l93Coords[1] - expectedY);
    console.log('Écart 2-étapes X:', deltaX2.toFixed(3), 'm');
    console.log('Écart 2-étapes Y:', deltaY2.toFixed(3), 'm');
    
  } catch (error) {
    console.error('Erreur conversion 2 étapes:', error);
  }
  
  return bestResult;
}

// Test avec les paramètres exacts de Géofree si on les trouve
export function testWithGeofreeParams() {
  console.log('\n=== TEST AVEC PARAMÈTRES GÉOFREE SUPPOSÉS ===');
  
  // Ces paramètres sont ce que Géofree pourrait utiliser
  const geofreeL2E = '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs';
  const geofreeL93 = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
  
  const inputX = 594368.498;
  const inputY = 1843413.039;
  
  try {
    proj4.defs('GEOFREE_L2E', geofreeL2E);
    proj4.defs('GEOFREE_L93', geofreeL93);
    
    const result = proj4('GEOFREE_L2E', 'GEOFREE_L93', [inputX, inputY]);
    console.log('Résultat Géofree simulé:', { x: result[0].toFixed(3), y: result[1].toFixed(3) });
    
    return result;
    
  } catch (error) {
    console.error('Erreur simulation Géofree:', error);
    return null;
  }
}