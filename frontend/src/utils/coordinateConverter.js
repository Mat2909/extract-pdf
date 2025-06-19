// Utilitaire de conversion entre systèmes de coordonnées
// Utilise proj4js pour des conversions précises

import proj4 from 'proj4';

// Définitions des systèmes de coordonnées avec leurs projections proj4
// Basé sur les définitions officielles de l'IGN France

// Systèmes de coordonnées supportés
export const COORDINATE_SYSTEMS = {
  // Lambert 93 (système officiel français actuel)
  LAMBERT93: {
    id: 'LAMBERT93',
    name: 'Lambert 93 (RGF93)',
    epsg: 'EPSG:2154',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 100000, maxX: 1300000, minY: 6000000, maxY: 7200000 }
  },
  
  // Lambert II étendu - Définition officielle EPSG:27572
  LAMBERT2E: {
    id: 'LAMBERT2E',
    name: 'Lambert II étendu (NTF)',
    epsg: 'EPSG:27572',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 0, maxX: 1200000, minY: 1600000, maxY: 2700000 }
  },
  
  // Lambert I (Nord)
  LAMBERT1: {
    id: 'LAMBERT1',
    name: 'Lambert I (NTF)',
    epsg: 'EPSG:27571',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=49.5 +lat_0=49.5 +lon_0=0 +k_0=0.999877341 +x_0=600000 +y_0=1200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs',
    bounds: { minX: 0, maxX: 1200000, minY: 600000, maxY: 1700000 }
  },
  
  // Lambert II (Centre)
  LAMBERT2: {
    id: 'LAMBERT2',
    name: 'Lambert II (NTF)',
    epsg: 'EPSG:27572',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs',
    bounds: { minX: 0, maxX: 1200000, minY: 1700000, maxY: 2700000 }
  },
  
  // Lambert III (Sud)
  LAMBERT3: {
    id: 'LAMBERT3',
    name: 'Lambert III (NTF)',
    epsg: 'EPSG:27573',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=44.1 +lat_0=44.1 +lon_0=0 +k_0=0.999877499 +x_0=600000 +y_0=3200000 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs',
    bounds: { minX: 0, maxX: 1200000, minY: 2700000, maxY: 3700000 }
  },
  
  // Lambert IV (Corse)
  LAMBERT4: {
    id: 'LAMBERT4',
    name: 'Lambert IV (NTF)',
    epsg: 'EPSG:27574',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=42.165 +lat_0=42.165 +lon_0=0 +k_0=0.99994471 +x_0=234.358 +y_0=4185861.369 +a=6378249.2 +b=6356515 +towgs84=-168,-60,320,0,0,0,0 +pm=paris +units=m +no_defs',
    bounds: { minX: 0, maxX: 1200000, minY: 3700000, maxY: 4800000 }
  },

  // Conique Conforme Zone 42 (Antilles)
  CC42: {
    id: 'CC42',
    name: 'CC42 - Conique Conforme Zone 42 (Antilles)',
    epsg: 'EPSG:5490',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=14.25 +lat_2=16.25 +lat_0=15.25 +lon_0=-61.5 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 1600000, maxX: 1800000, minY: 1100000, maxY: 1300000 }
  },

  // Conique Conforme Zone 43 (Guyane)  
  CC43: {
    id: 'CC43',
    name: 'CC43 - Conique Conforme Zone 43 (Guyane)',
    epsg: 'EPSG:5490',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=2.75 +lat_2=5.75 +lat_0=4.25 +lon_0=-53 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 1600000, maxX: 1900000, minY: 1000000, maxY: 1400000 }
  },

  // Conique Conforme Zone 44 (Réunion/Mayotte)
  CC44: {
    id: 'CC44',
    name: 'CC44 - Conique Conforme Zone 44 (Réunion)',
    epsg: 'EPSG:5490',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=-22.5 +lat_2=-20.5 +lat_0=-21.5 +lon_0=55.5 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 1600000, maxX: 1800000, minY: 1100000, maxY: 1300000 }
  },

  // Conique Conforme Zone 45 (Mayotte)
  CC45: {
    id: 'CC45',
    name: 'CC45 - Conique Conforme Zone 45 (Mayotte)',
    epsg: 'EPSG:5490',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=-13.5 +lat_2=-11.5 +lat_0=-12.5 +lon_0=45 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 1650000, maxX: 1750000, minY: 1150000, maxY: 1250000 }
  },

  // Conique Conforme Zone 46 (Saint-Pierre-et-Miquelon)
  CC46: {
    id: 'CC46', 
    name: 'CC46 - Conique Conforme Zone 46 (St-Pierre-et-Miquelon)',
    epsg: 'EPSG:5490',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=46.25 +lat_2=47.75 +lat_0=47 +lon_0=-56.25 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 1680000, maxX: 1720000, minY: 1180000, maxY: 1220000 }
  },

  // Conique Conforme Zone 47 (Polynésie - Tahiti)
  CC47: {
    id: 'CC47',
    name: 'CC47 - Conique Conforme Zone 47 (Polynésie)',
    epsg: 'EPSG:5490',
    type: 'projected', 
    proj4def: '+proj=lcc +lat_1=-18.5 +lat_2=-16.5 +lat_0=-17.5 +lon_0=-149.5 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 1650000, maxX: 1750000, minY: 1150000, maxY: 1250000 }
  },

  // Conique Conforme Zone 48 (Nouvelle-Calédonie)
  CC48: {
    id: 'CC48',
    name: 'CC48 - Conique Conforme Zone 48 (Nouvelle-Calédonie)',
    epsg: 'EPSG:5490',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=-22.5 +lat_2=-20.5 +lat_0=-21.5 +lon_0=166 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 1600000, maxX: 1800000, minY: 1100000, maxY: 1300000 }
  },

  // Conique Conforme Zone 49 (Wallis-et-Futuna)
  CC49: {
    id: 'CC49',
    name: 'CC49 - Conique Conforme Zone 49 (Wallis-et-Futuna)',
    epsg: 'EPSG:5490',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=-14.5 +lat_2=-12.5 +lat_0=-13.5 +lon_0=-178 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 1680000, maxX: 1720000, minY: 1180000, maxY: 1220000 }
  },

  // Conique Conforme Zone 50 (Kerguelen)
  CC50: {
    id: 'CC50',
    name: 'CC50 - Conique Conforme Zone 50 (Kerguelen)',
    epsg: 'EPSG:5490',
    type: 'projected',
    proj4def: '+proj=lcc +lat_1=-50 +lat_2=-48 +lat_0=-49 +lon_0=70 +x_0=1700000 +y_0=1200000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
    bounds: { minX: 1650000, maxX: 1750000, minY: 1150000, maxY: 1250000 }
  },

  // Systèmes géographiques
  WGS84: {
    id: 'WGS84',
    name: 'WGS84 (GPS)',
    epsg: 'EPSG:4326',
    type: 'geographic',
    proj4def: '+proj=longlat +datum=WGS84 +no_defs',
    bounds: { minX: -180, maxX: 180, minY: -90, maxY: 90 }
  },
  
  RGF93_GEO: {
    id: 'RGF93_GEO',
    name: 'RGF93 géographique',
    epsg: 'EPSG:4171',
    type: 'geographic',
    proj4def: '+proj=longlat +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +no_defs',
    bounds: { minX: -180, maxX: 180, minY: -90, maxY: 90 }
  }
};

// Initialiser proj4 avec les définitions de systèmes courants
Object.values(COORDINATE_SYSTEMS).forEach(system => {
  if (system.proj4def) {
    proj4.defs(system.epsg, system.proj4def);
  }
});

/**
 * Détecte automatiquement le système de coordonnées basé sur les valeurs
 */
export function detectCoordinateSystem(x, y) {
  // Tester chaque système avec ses bornes
  for (const system of Object.values(COORDINATE_SYSTEMS)) {
    if (system.bounds) {
      const { minX, maxX, minY, maxY } = system.bounds;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        return system;
      }
    }
  }
  
  // Fallback pour coordonnées géographiques
  if (Math.abs(x) <= 180 && Math.abs(y) <= 90) {
    return COORDINATE_SYSTEMS.WGS84;
  }
  
  // Par défaut, supposer Lambert II étendu
  return COORDINATE_SYSTEMS.LAMBERT2E;
}

/**
 * Conversion entre systèmes de coordonnées avec fallback vers services en ligne
 */
export async function convertCoordinates(x, y, fromSystem, toSystem, useOnline = false) {
  // Si même système, pas de conversion
  if (fromSystem.id === toSystem.id) {
    return { x, y, precision: 'exact' };
  }
  
  // Si demande explicite de conversion en ligne
  if (useOnline) {
    try {
      const { convertOnline } = await import('./ignApiConverter.js');
      const onlineResult = await convertOnline(x, y, fromSystem, toSystem);
      return onlineResult;
    } catch (error) {
      console.warn('Conversion en ligne échouée, utilisation de proj4js:', error);
    }
  }
  
  try {
    // Vérifier que les systèmes ont des définitions proj4
    if (!fromSystem.proj4def || !toSystem.proj4def) {
      throw new Error('Définition proj4 manquante pour un des systèmes');
    }

    // Effectuer la conversion avec proj4
    const sourceProj = proj4(fromSystem.epsg);
    const targetProj = proj4(toSystem.epsg);
    
    // Pour les systèmes géographiques, l'ordre est [longitude, latitude]
    // Pour les systèmes projetés, l'ordre est [x, y]
    let inputCoords;
    if (fromSystem.type === 'geographic') {
      inputCoords = [x, y]; // longitude, latitude
    } else {
      inputCoords = [x, y]; // x, y
    }
    
    const result = proj4(sourceProj, targetProj, inputCoords);
    
    // Arrondir à 3 décimales pour les coordonnées projetées, 6 pour les géographiques
    const precision = toSystem.type === 'geographic' ? 6 : 3;
    const convertedX = Math.round(result[0] * Math.pow(10, precision)) / Math.pow(10, precision);
    const convertedY = Math.round(result[1] * Math.pow(10, precision)) / Math.pow(10, precision);
    
    return {
      x: convertedX,
      y: convertedY,
      precision: 'high',
      fromSystem: fromSystem.name,
      toSystem: toSystem.name,
      method: 'proj4js'
    };
    
  } catch (error) {
    console.error('Erreur conversion proj4:', error);
    
    // Fallback vers conversion approximative pour certains cas
    try {
      const fallbackResult = fallbackConversion(x, y, fromSystem, toSystem);
      return {
        ...fallbackResult,
        precision: 'approximate',
        fromSystem: fromSystem.name,
        toSystem: toSystem.name,
        warning: 'Conversion approximative utilisée (erreur proj4): ' + error.message
      };
    } catch (fallbackError) {
      return {
        x, y,
        error: 'Conversion impossible: ' + error.message,
        fromSystem: fromSystem.name,
        toSystem: toSystem.name
      };
    }
  }
}

/**
 * Version synchrone pour compatibilité (sans services en ligne)
 */
export function convertCoordinatesSync(x, y, fromSystem, toSystem) {
  // Si même système, pas de conversion
  if (fromSystem.id === toSystem.id) {
    return { x, y, precision: 'exact' };
  }
  
  try {
    // Vérifier que les systèmes ont des définitions proj4
    if (!fromSystem.proj4def || !toSystem.proj4def) {
      throw new Error('Définition proj4 manquante pour un des systèmes');
    }

    // Effectuer la conversion avec proj4
    const sourceProj = proj4(fromSystem.epsg);
    const targetProj = proj4(toSystem.epsg);
    
    // Pour les systèmes géographiques, l'ordre est [longitude, latitude]
    // Pour les systèmes projetés, l'ordre est [x, y]
    let inputCoords;
    if (fromSystem.type === 'geographic') {
      inputCoords = [x, y]; // longitude, latitude
    } else {
      inputCoords = [x, y]; // x, y
    }
    
    const result = proj4(sourceProj, targetProj, inputCoords);
    
    // Arrondir à 3 décimales pour les coordonnées projetées, 6 pour les géographiques
    const precision = toSystem.type === 'geographic' ? 6 : 3;
    const convertedX = Math.round(result[0] * Math.pow(10, precision)) / Math.pow(10, precision);
    const convertedY = Math.round(result[1] * Math.pow(10, precision)) / Math.pow(10, precision);
    
    return {
      x: convertedX,
      y: convertedY,
      precision: 'high',
      fromSystem: fromSystem.name,
      toSystem: toSystem.name,
      method: 'proj4js'
    };
    
  } catch (error) {
    console.error('Erreur conversion proj4:', error);
    
    // Fallback vers conversion approximative pour certains cas
    try {
      const fallbackResult = fallbackConversion(x, y, fromSystem, toSystem);
      return {
        ...fallbackResult,
        precision: 'approximate',
        fromSystem: fromSystem.name,
        toSystem: toSystem.name,
        warning: 'Conversion approximative utilisée (erreur proj4): ' + error.message
      };
    } catch (fallbackError) {
      return {
        x, y,
        error: 'Conversion impossible: ' + error.message,
        fromSystem: fromSystem.name,
        toSystem: toSystem.name
      };
    }
  }
}

/**
 * Conversion de fallback approximative (utilisée si proj4 échoue)
 */
function fallbackConversion(x, y, fromSystem, toSystem) {
  // Conversion très approximative Lambert II étendu <-> Lambert 93
  if ((fromSystem.id === 'LAMBERT2E' && toSystem.id === 'LAMBERT93') ||
      (fromSystem.id === 'LAMBERT93' && toSystem.id === 'LAMBERT2E')) {
    
    let newX, newY;
    if (fromSystem.id === 'LAMBERT2E') {
      // Lambert II étendu vers Lambert 93 (approximation)
      newX = x + 99315.0;
      newY = y + 3903000.0;
    } else {
      // Lambert 93 vers Lambert II étendu (approximation)
      newX = x - 99315.0;
      newY = y - 3903000.0;
    }
    
    return {
      x: Math.round(newX * 1000) / 1000,
      y: Math.round(newY * 1000) / 1000
    };
  }
  
  // Pour les autres conversions, retourner les coordonnées inchangées
  throw new Error('Conversion de fallback non supportée pour ces systèmes');
}

/**
 * Valide si les coordonnées sont cohérentes avec le système
 */
export function validateCoordinates(x, y, system) {
  const detected = detectCoordinateSystem(x, y);
  return {
    isValid: detected.id === system.id,
    detected: detected.name,
    expected: system.name
  };
}

/**
 * Formate les coordonnées pour l'affichage
 */
export function formatCoordinates(x, y, system) {
  if (system.type === 'geographic') {
    const latDir = y >= 0 ? 'N' : 'S';
    const lonDir = x >= 0 ? 'E' : 'W';
    return `${Math.abs(y).toFixed(6)}° ${latDir}, ${Math.abs(x).toFixed(6)}° ${lonDir}`;
  } else {
    return `X: ${Math.round(x).toLocaleString()} m, Y: ${Math.round(y).toLocaleString()} m`;
  }
}

/**
 * Normalise les coordonnées en gérant les séparateurs décimaux
 */
export function normalizeCoordinates(xStr, yStr) {
  // Nettoyer et normaliser les chaînes d'entrée
  let cleanX = String(xStr).trim();
  let cleanY = String(yStr).trim();
  
  console.log('Normalisation avant:', { cleanX, cleanY });
  
  // Fonction pour convertir intelligemment les séparateurs décimaux
  const smartDecimalConversion = (str) => {
    // Supprimer les espaces
    str = str.replace(/\s/g, '');
    
    // Si déjà un point décimal et pas de virgules, garder tel quel
    if (str.includes('.') && !str.includes(',')) {
      return str;
    }
    
    // Si contient point ET virgules, supprimer les virgules (milliers) et garder le point
    if (str.includes('.') && str.includes(',')) {
      return str.replace(/,/g, '');
    }
    
    // Si contient seulement des virgules
    if (str.includes(',')) {
      const commas = str.split(',');
      const lastPart = commas[commas.length - 1];
      
      // Si une seule virgule ET que la partie après a 1-3 chiffres, c'est décimal
      if (commas.length === 2 && lastPart.length >= 1 && lastPart.length <= 3 && /^\d+$/.test(lastPart)) {
        return str.replace(',', '.');
      }
      
      // Si plusieurs virgules OU la dernière partie a plus de 3 chiffres, c'est des milliers
      return str.replace(/,/g, '');
    }
    
    return str;
  };
  
  cleanX = smartDecimalConversion(cleanX);
  cleanY = smartDecimalConversion(cleanY);
  
  console.log('Normalisation après:', { cleanX, cleanY });
  
  const x = parseFloat(cleanX);
  const y = parseFloat(cleanY);
  
  if (isNaN(x) || isNaN(y)) {
    throw new Error(`Coordonnées invalides: X="${xStr}" Y="${yStr}"`);
  }
  
  return { x, y };
}

/**
 * Test de conversion direct avec coordonnées spécifiques
 */
export function testDirectConversion() {
  const inputX = 594368.498;
  const inputY = 1843413.039;
  
  console.log('=== TEST CONVERSION DIRECTE ===');
  console.log('Coordonnées d\'entrée (Lambert II étendu): X =', inputX, ', Y =', inputY);
  
  const result = convertCoordinatesSync(
    inputX, 
    inputY, 
    COORDINATE_SYSTEMS.LAMBERT2E, 
    COORDINATE_SYSTEMS.LAMBERT93
  );
  
  console.log('Résultat (Lambert 93): X =', result.x, ', Y =', result.y);
  console.log('Precision:', result.precision, ', Method:', result.method);
  
  // Test direct avec proj4 et différentes définitions
  console.log('\n=== TESTS AVEC DÉFINITIONS ALTERNATIVES ===');
  
  const definitions = [
    {
      name: 'Définition actuelle',
      l2e: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +a=6378249.2 +b=6356515.0 +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs',
      l93: '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    },
    {
      name: 'Avec ellps=clrk80ign',
      l2e: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +towgs84=-168,-60,320,0,0,0,0 +units=m +no_defs',
      l93: '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    },
    {
      name: 'Avec nadgrids',
      l2e: '+proj=lcc +lat_1=46.8 +lat_0=46.8 +lon_0=0 +k_0=0.99987742 +x_0=600000 +y_0=2200000 +ellps=clrk80ign +pm=paris +nadgrids=ntf_r93.gsb,null +units=m +no_defs',
      l93: '+proj=lcc +lat_1=49 +lat_2=44 +lat_0=46.5 +lon_0=3 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs'
    }
  ];

  definitions.forEach((def, index) => {
    try {
      const sourceProj = proj4(def.l2e);
      const targetProj = proj4(def.l93);
      const testResult = proj4(sourceProj, targetProj, [inputX, inputY]);
      
      console.log(`Test ${index + 1} (${def.name}): X =`, testResult[0].toFixed(3), ', Y =', testResult[1].toFixed(3));
      
    } catch (error) {
      console.warn(`Erreur test ${index + 1}:`, error.message);
    }
  });
  
  return result;
}