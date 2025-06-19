// Test ultra-simple pour isoler le problème
import proj4 from 'proj4';

export function simpleConversionTest() {
  console.log('==========================================');
  console.log('         TEST ULTRA-SIMPLE');
  console.log('==========================================');
  
  // Vos coordonnées exactes
  const inputX = 594368.498;
  const inputY = 1843413.039;
  const expectedX = 640784.56;
  const expectedY = 6277336.83;
  
  console.log('INPUT Lambert II étendu:');
  console.log('  X =', inputX);
  console.log('  Y =', inputY);
  console.log('');
  console.log('EXPECTED Lambert 93 (Géofree):');
  console.log('  X =', expectedX);
  console.log('  Y =', expectedY);
  console.log('');
  
  // Définitions proj4 les plus standards possibles
  const L2E_SIMPLE = 'EPSG:27572';
  const L93_SIMPLE = 'EPSG:2154';
  
  try {
    console.log('TEST 1: Codes EPSG simples');
    const result1 = proj4(L2E_SIMPLE, L93_SIMPLE, [inputX, inputY]);
    console.log('  Résultat: X =', result1[0].toFixed(3), ', Y =', result1[1].toFixed(3));
    console.log('  Écart X =', Math.abs(result1[0] - expectedX).toFixed(3), 'm');
    console.log('  Écart Y =', Math.abs(result1[1] - expectedY).toFixed(3), 'm');
    console.log('');
  } catch (error) {
    console.error('ERREUR TEST 1:', error.message);
  }
  
  try {
    console.log('TEST 2: Définitions proj4 manuelles');
    const L2E_MANUAL = '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs';
    const L93_MANUAL = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
    
    const result2 = proj4(L2E_MANUAL, L93_MANUAL, [inputX, inputY]);
    console.log('  Résultat: X =', result2[0].toFixed(3), ', Y =', result2[1].toFixed(3));
    console.log('  Écart X =', Math.abs(result2[0] - expectedX).toFixed(3), 'm');
    console.log('  Écart Y =', Math.abs(result2[1] - expectedY).toFixed(3), 'm');
    console.log('');
  } catch (error) {
    console.error('ERREUR TEST 2:', error.message);
  }
  
  try {
    console.log('TEST 3: Via WGS84 (2 étapes)');
    const L2E_WGS = '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs';
    const WGS84 = '+proj=longlat +datum=WGS84 +no_defs';
    const L93_WGS = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
    
    // Étape 1: L2E → WGS84
    const wgsResult = proj4(L2E_WGS, WGS84, [inputX, inputY]);
    console.log('  Étape 1 (L2E → WGS84): Lon =', wgsResult[0].toFixed(8), ', Lat =', wgsResult[1].toFixed(8));
    
    // Étape 2: WGS84 → L93
    const result3 = proj4(WGS84, L93_WGS, wgsResult);
    console.log('  Étape 2 (WGS84 → L93): X =', result3[0].toFixed(3), ', Y =', result3[1].toFixed(3));
    console.log('  Écart X =', Math.abs(result3[0] - expectedX).toFixed(3), 'm');
    console.log('  Écart Y =', Math.abs(result3[1] - expectedY).toFixed(3), 'm');
    console.log('');
  } catch (error) {
    console.error('ERREUR TEST 3:', error.message);
  }
  
  // Test de cohérence : conversion inverse
  try {
    console.log('TEST 4: Cohérence (L93 → L2E avec résultat attendu)');
    const L2E_CHECK = '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs';
    const L93_CHECK = '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs';
    
    const backResult = proj4(L93_CHECK, L2E_CHECK, [expectedX, expectedY]);
    console.log('  L93 → L2E: X =', backResult[0].toFixed(3), ', Y =', backResult[1].toFixed(3));
    console.log('  Écart avec entrée X =', Math.abs(backResult[0] - inputX).toFixed(3), 'm');
    console.log('  Écart avec entrée Y =', Math.abs(backResult[1] - inputY).toFixed(3), 'm');
    console.log('');
  } catch (error) {
    console.error('ERREUR TEST 4:', error.message);
  }
  
  console.log('==========================================');
  console.log('ANALYSE:');
  console.log('Si tous les tests donnent des résultats similaires');
  console.log('mais différents de Géofree, alors:');
  console.log('1. Soit vos coordonnées de référence sont incorrectes');
  console.log('2. Soit Géofree utilise des paramètres différents');
  console.log('3. Soit il y a une erreur de saisie quelque part');
  console.log('==========================================');
}