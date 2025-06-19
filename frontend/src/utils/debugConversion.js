// Script de débogage pour les conversions de coordonnées
import proj4 from 'proj4';

// Test avec différentes définitions proj4 pour Lambert II étendu
export function debugConversion() {
  const inputX = 594368.498;
  const inputY = 1843413.039;
  const expectedX = 640784.56;
  const expectedY = 6240784.56;

  console.log('=== DEBUG CONVERSION ===');
  console.log('Coordonnées d\'entrée (Lambert II étendu):', { x: inputX, y: inputY });
  console.log('Coordonnées attendues (Lambert 93):', { x: expectedX, y: expectedY });

  // Définitions proj4 à tester
  const lambert2eDefs = [
    {
      name: 'EPSG:27572 (officiel)',
      def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs'
    },
    {
      name: 'Variante avec NTF datum',
      def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +datum=NTF +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs'
    },
    {
      name: 'Avec paramètres ellipse manuels',
      def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356514.999843776 +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs'
    },
    {
      name: 'EPSG exact du registre',
      def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs +type=crs'
    }
  ];

  const lambert93Def = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

  lambert2eDefs.forEach((l2eDef, index) => {
    console.log(`\n--- Test ${index + 1}: ${l2eDef.name} ---`);
    
    try {
      proj4.defs('L2E_TEST', l2eDef.def);
      proj4.defs('L93_TEST', lambert93Def);
      
      const result = proj4('L2E_TEST', 'L93_TEST', [inputX, inputY]);
      
      const deltaX = Math.abs(result[0] - expectedX);
      const deltaY = Math.abs(result[1] - expectedY);
      
      console.log('Résultat:', { x: result[0], y: result[1] });
      console.log('Écart X:', deltaX.toFixed(3), 'm');
      console.log('Écart Y:', deltaY.toFixed(3), 'm');
      console.log('Précision:', (deltaX < 1 && deltaY < 1) ? '✅ EXCELLENTE' : 
                                 (deltaX < 5 && deltaY < 5) ? '✅ BONNE' : 
                                 (deltaX < 50 && deltaY < 50) ? '⚠️ CORRECTE' : '❌ MAUVAISE');
      
    } catch (error) {
      console.error('Erreur:', error.message);
    }
  });

  // Test inverse pour vérifier la cohérence
  console.log('\n=== TEST INVERSE ===');
  try {
    proj4.defs('L2E_BEST', lambert2eDefs[0].def);
    proj4.defs('L93_BEST', lambert93Def);
    
    const forward = proj4('L2E_BEST', 'L93_BEST', [inputX, inputY]);
    const backward = proj4('L93_BEST', 'L2E_BEST', forward);
    
    console.log('L2E → L93:', forward);
    console.log('L93 → L2E (retour):', backward);
    console.log('Différence retour X:', Math.abs(backward[0] - inputX).toFixed(6), 'm');
    console.log('Différence retour Y:', Math.abs(backward[1] - inputY).toFixed(6), 'm');
    
  } catch (error) {
    console.error('Erreur test inverse:', error);
  }

  // Test avec d'autres outils de référence
  console.log('\n=== COMPARAISON AVEC RÉFÉRENCES ===');
  console.log('Vos coordonnées attendues semblent indiquer une erreur dans Y.');
  console.log('Vérification: 6240784.56 semble trop faible pour Lambert 93 en France.');
  console.log('Les Y Lambert 93 en France sont généralement entre 6000000 et 7200000.');
  console.log('Avez-vous vérifié vos coordonnées de référence avec un outil officiel IGN?');
  
  return {
    inputX,
    inputY,
    expectedX,
    expectedY,
    message: 'Vérifiez les logs de la console pour les détails'
  };
}

// Fonction pour tester différents paramètres de transformation
export function testTransformParameters() {
  console.log('\n=== TEST PARAMÈTRES DE TRANSFORMATION ===');
  
  const inputX = 594368.498;
  const inputY = 1843413.039;
  
  // Différents jeux de paramètres de transformation NTF → RGF93
  const transformParams = [
    {
      name: 'IGN officiel',
      params: '-168,-60,320,0,0,0,0'
    },
    {
      name: 'Variante 1',
      params: '-168.0,-60.0,320.0,0,0,0,0'
    },
    {
      name: 'Sans transformation',
      params: '0,0,0,0,0,0,0'
    }
  ];

  const lambert93Def = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';

  transformParams.forEach((param, index) => {
    console.log(`\n--- Test transformation ${index + 1}: ${param.name} ---`);
    
    const l2eDef = `+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=${param.params} +units=m +no_defs`;
    
    try {
      proj4.defs('L2E_PARAM', l2eDef);
      proj4.defs('L93_PARAM', lambert93Def);
      
      const result = proj4('L2E_PARAM', 'L93_PARAM', [inputX, inputY]);
      console.log('Résultat:', { x: result[0].toFixed(3), y: result[1].toFixed(3) });
      
    } catch (error) {
      console.error('Erreur:', error.message);
    }
  });
}