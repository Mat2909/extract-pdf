// Test avec paramètres de transformation précis IGN
import proj4 from 'proj4';

export function preciseTransformTest() {
  console.log('==========================================');
  console.log('    TEST PARAMÈTRES TRANSFORMATION PRÉCIS');
  console.log('==========================================');
  
  const inputX = 594368.498;
  const inputY = 1843413.039;
  const expectedX = 640784.56;
  const expectedY = 6277336.83;
  
  console.log('INPUT:', inputX, inputY);
  console.log('EXPECTED:', expectedX, expectedY);
  console.log('');
  
  // Différents jeux de paramètres de transformation NTF->RGF93
  const transformTests = [
    {
      name: 'Paramètres IGN standards',
      towgs84: '-168,-60,320,0,0,0,0'
    },
    {
      name: 'Paramètres IGN précis (7 param)',
      towgs84: '-168.0,-60.0,320.0,0.0,0.0,0.0,0.0'
    },
    {
      name: 'Paramètres alternatifs 1',
      towgs84: '-168.6,-60.13,320.01,0.0,0.0,0.0,0.0'
    },
    {
      name: 'Paramètres RGF93 officiels',
      towgs84: '-168.0,-60.0,320.0,0.0,0.0,0.0,0.0'
    },
    {
      name: 'Sans transformation (test)',
      towgs84: '0,0,0,0,0,0,0'
    }
  ];
  
  const l93Def = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
  
  transformTests.forEach((test, index) => {
    const l2eDef = `+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=${test.towgs84} +units=m +no_defs`;
    
    try {
      const result = proj4(l2eDef, l93Def, [inputX, inputY]);
      const deltaX = Math.abs(result[0] - expectedX);
      const deltaY = Math.abs(result[1] - expectedY);
      
      console.log(`Test ${index + 1}: ${test.name}`);
      console.log(`  Résultat: X=${result[0].toFixed(3)}, Y=${result[1].toFixed(3)}`);
      console.log(`  Écart: X=${deltaX.toFixed(3)}m, Y=${deltaY.toFixed(3)}m`);
      console.log(`  Total: ${(deltaX + deltaY).toFixed(3)}m`);
      console.log('');
      
    } catch (error) {
      console.error(`Erreur test ${index + 1}:`, error.message);
    }
  });
  
  // Test avec d'autres ellipsoïdes
  console.log('=== TESTS ELLIPSOÏDES ===');
  
  const ellipsoidTests = [
    {
      name: 'Clarke 1880 IGN standard',
      ellipsoid: '+ellps=clrk80ign'
    },
    {
      name: 'Clarke 1880 paramètres manuels',
      ellipsoid: '+a=6378249.2 +b=6356515.0'
    },
    {
      name: 'Clarke 1880 avec rf',
      ellipsoid: '+a=6378249.2 +rf=293.4660212936269'
    }
  ];
  
  ellipsoidTests.forEach((test, index) => {
    const l2eDef = `+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 ${test.ellipsoid} +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs`;
    
    try {
      const result = proj4(l2eDef, l93Def, [inputX, inputY]);
      const deltaX = Math.abs(result[0] - expectedX);
      const deltaY = Math.abs(result[1] - expectedY);
      
      console.log(`Ellipsoïde ${index + 1}: ${test.name}`);
      console.log(`  Résultat: X=${result[0].toFixed(3)}, Y=${result[1].toFixed(3)}`);
      console.log(`  Écart: X=${deltaX.toFixed(3)}m, Y=${deltaY.toFixed(3)}m`);
      console.log('');
      
    } catch (error) {
      console.error(`Erreur ellipsoïde ${index + 1}:`, error.message);
    }
  });
  
  // Test final : valeurs très précises utilisées par l'IGN
  console.log('=== TEST FINAL IGN HAUTE PRÉCISION ===');
  
  const ignPreciseL2E = '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356514.999843776 +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs';
  
  try {
    const finalResult = proj4(ignPreciseL2E, l93Def, [inputX, inputY]);
    const finalDeltaX = Math.abs(finalResult[0] - expectedX);
    const finalDeltaY = Math.abs(finalResult[1] - expectedY);
    
    console.log('IGN Haute Précision:');
    console.log(`  Résultat: X=${finalResult[0].toFixed(3)}, Y=${finalResult[1].toFixed(3)}`);
    console.log(`  Écart: X=${finalDeltaX.toFixed(3)}m, Y=${finalDeltaY.toFixed(3)}m`);
    console.log(`  Précision: ${finalDeltaX < 0.5 && finalDeltaY < 0.5 ? 'EXCELLENTE' : finalDeltaX < 1 && finalDeltaY < 1 ? 'TRÈS BONNE' : 'BONNE'}`);
    
  } catch (error) {
    console.error('Erreur test final:', error.message);
  }
  
  console.log('==========================================');
}