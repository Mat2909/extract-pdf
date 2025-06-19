import { useState } from 'react';
import { 
  COORDINATE_SYSTEMS, 
  convertCoordinates, 
  detectCoordinateSystem,
  formatCoordinates,
  normalizeCoordinates
} from '../utils/coordinateConverter';
import './CoordinateConverter.css';

const CoordinateConverter = ({ onSystemChange, initialFromSystem, initialToSystem }) => {
  const [fromSystem, setFromSystem] = useState(initialFromSystem || COORDINATE_SYSTEMS.LAMBERT2E);
  const [toSystem, setToSystem] = useState(initialToSystem || COORDINATE_SYSTEMS.LAMBERT93);
  const [testX, setTestX] = useState('594368.498');
  const [testY, setTestY] = useState('1843413.039');
  const [conversionResult, setConversionResult] = useState(null);
  const [autoDetect, setAutoDetect] = useState(true);

  // Regrouper les systèmes par catégorie pour un meilleur affichage
  const systemsList = Object.values(COORDINATE_SYSTEMS);
  const systemsByCategory = {
    'Lambert (France métropolitaine)': systemsList.filter(s => s.id.startsWith('LAMBERT')),
    'Conique Conforme (Outre-mer)': systemsList.filter(s => s.id.startsWith('CC')),
    'Géographiques': systemsList.filter(s => s.type === 'geographic')
  };

  const handleFromSystemChange = (e) => {
    const newSystem = COORDINATE_SYSTEMS[e.target.value];
    setFromSystem(newSystem);
    if (onSystemChange) {
      onSystemChange(newSystem, toSystem);
    }
  };

  const handleToSystemChange = (e) => {
    const newSystem = COORDINATE_SYSTEMS[e.target.value];
    setToSystem(newSystem);
    if (onSystemChange) {
      onSystemChange(fromSystem, newSystem);
    }
  };


  const handleTestOnlineConversion = async () => {
    try {
      // Utiliser normalizeCoordinates pour gérer les virgules
      const normalizedCoords = normalizeCoordinates(testX, testY);
      const { x, y } = normalizedCoords;

      let actualFromSystem = fromSystem;
      
      // Détection automatique si activée
      if (autoDetect) {
        const detected = detectCoordinateSystem(x, y);
        if (detected.id !== fromSystem.id) {
          actualFromSystem = detected;
          setFromSystem(detected);
          if (onSystemChange) {
            onSystemChange(detected, toSystem);
          }
        }
      }

      const result = await convertCoordinates(x, y, actualFromSystem, toSystem, true);
      setConversionResult(result);
    } catch (error) {
      alert('Erreur dans la conversion en ligne: ' + error.message);
    }
  };

  const handleSwapSystems = () => {
    const temp = fromSystem;
    setFromSystem(toSystem);
    setToSystem(temp);
    if (onSystemChange) {
      onSystemChange(toSystem, temp);
    }
  };

  const handleExportCSV = () => {
    if (!conversionResult) {
      alert('Aucune conversion à exporter. Veuillez d\'abord effectuer une conversion.');
      return;
    }

    // Créer les données CSV
    const csvData = [
      ['Système source', 'X source', 'Y source', 'Système cible', 'X cible', 'Y cible', 'Précision', 'Méthode'],
      [
        conversionResult.fromSystem || fromSystem.name,
        testX,
        testY,
        conversionResult.toSystem || toSystem.name,
        conversionResult.x,
        conversionResult.y,
        conversionResult.precision || 'N/A',
        conversionResult.method || 'Geofree'
      ]
    ];

    // Convertir en chaîne CSV
    const csvContent = csvData.map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');

    // Créer et télécharger le fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `conversion_coordonnees_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPrecisionColor = (precision) => {
    switch (precision) {
      case 'exact': return '#28a745';
      case 'geofree_exact': return '#007bff'; // Bleu pour Geofree
      default: return '#6c757d';
    }
  };

  const getPrecisionText = (precision) => {
    switch (precision) {
      case 'exact': return 'Précision exacte (même système)';
      case 'geofree_exact': return 'PRÉCISION EXACTE (Geofree.fr)';
      default: return 'Précision inconnue';
    }
  };


  return (
    <div className="coordinate-converter">
      <h3>🗺️ Conversion de coordonnées</h3>
      
      <div className="conversion-setup">
        <div className="system-selectors">
          <div className="system-selector">
            <label htmlFor="from-system">Système source :</label>
            <select 
              id="from-system"
              value={fromSystem.id} 
              onChange={handleFromSystemChange}
              className="system-select"
            >
              {Object.entries(systemsByCategory).map(([category, systems]) => (
                <optgroup key={category} label={category}>
                  {systems.map(system => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="system-info">{fromSystem.epsg}</span>
          </div>

          <button 
            className="swap-button"
            onClick={handleSwapSystems}
            title="Inverser les systèmes"
          >
            ⇄
          </button>

          <div className="system-selector">
            <label htmlFor="to-system">Système cible :</label>
            <select 
              id="to-system"
              value={toSystem.id} 
              onChange={handleToSystemChange}
              className="system-select"
            >
              {Object.entries(systemsByCategory).map(([category, systems]) => (
                <optgroup key={category} label={category}>
                  {systems.map(system => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <span className="system-info">{toSystem.epsg}</span>
          </div>
        </div>

        <div className="auto-detect-option">
          <label>
            <input
              type="checkbox"
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
            />
            Détection automatique du système source
          </label>
        </div>
      </div>

      <div className="test-conversion">
        <h4>Test de conversion</h4>
        <div className="test-inputs">
          <div className="coordinate-input">
            <label>X (ou Longitude) :</label>
            <input
              type="number"
              step="any"
              value={testX}
              onChange={(e) => setTestX(e.target.value)}
              placeholder="Ex: 600000"
              className="coord-input"
            />
          </div>
          <div className="coordinate-input">
            <label>Y (ou Latitude) :</label>
            <input
              type="number"
              step="any"
              value={testY}
              onChange={(e) => setTestY(e.target.value)}
              placeholder="Ex: 2200000"
              className="coord-input"
            />
          </div>
          <button 
            onClick={handleTestOnlineConversion}
            className="convert-button"
            disabled={!testX || !testY}
            style={{ backgroundColor: '#007bff', color: 'white', fontWeight: 'bold' }}
          >
            🎯 Convertir avec Geofree
          </button>
          <button 
            onClick={handleExportCSV}
            className="export-button"
            disabled={!conversionResult}
            style={{ backgroundColor: '#28a745', color: 'white', fontWeight: 'bold', marginLeft: '10px' }}
          >
            📄 Exporter CSV
          </button>
        </div>

        {conversionResult && (
          <div className="conversion-result">
            <div className="result-header">
              <span className="result-title">Résultat de conversion :</span>
              <span 
                className="precision-badge"
                style={{ backgroundColor: getPrecisionColor(conversionResult.precision) }}
                title={getPrecisionText(conversionResult.precision)}
              >
                {getPrecisionText(conversionResult.precision)}
              </span>
            </div>
            
            <div className="result-coords">
              <div className="coord-result">
                <span className="coord-label">Coordonnées converties :</span>
                <span className="coord-value">
                  {formatCoordinates(conversionResult.x, conversionResult.y, toSystem)}
                </span>
              </div>
              
              <div className="conversion-details">
                <div>De: {conversionResult.fromSystem}</div>
                <div>Vers: {conversionResult.toSystem}</div>
              </div>
            </div>

            {conversionResult.warning && (
              <div className="conversion-warning">
                ⚠️ {conversionResult.warning}
              </div>
            )}

            {conversionResult.error && (
              <div className="conversion-error">
                ❌ {conversionResult.error}
              </div>
            )}

            {conversionResult.precision === 'geofree_exact' && (
              <div style={{ 
                backgroundColor: '#d4edda', 
                border: '1px solid #c3e6cb', 
                color: '#155724', 
                padding: '10px', 
                marginTop: '10px',
                borderRadius: '5px',
                fontWeight: 'bold'
              }}>
                ✅ PRÉCISION EXACTE CONFIRMÉE - Sécurité réseaux gaz assurée (Geofree.fr)
              </div>
            )}
          </div>
        )}
      </div>

      <div className="conversion-info">
        <details>
          <summary>ℹ️ Informations sur les conversions</summary>
          <div className="info-content">
            <h5>Systèmes supportés :</h5>
            <ul>
              <li><strong>Lambert 93</strong> : Système officiel français actuel (RGF93)</li>
              <li><strong>Lambert II étendu</strong> : Ancien système français (NTF)</li>
              <li><strong>Lambert I-IV</strong> : Zones Lambert historiques</li>
              <li><strong>CC42-CC50</strong> : Conique Conforme pour l'outre-mer</li>
              <li><strong>WGS84 / RGF93</strong> : Coordonnées géographiques</li>
            </ul>
            
            <h5>Précision des conversions :</h5>
            <ul>
              <li><strong>Exacte</strong> : Pas de conversion (même système)</li>
              <li><strong>Élevée</strong> : Conversion proj4js (±centimètre)</li>
              <li><strong>Approximative</strong> : Formules simplifiées (±1-10m)</li>
            </ul>
            
            <p className="disclaimer">
              <strong>Important :</strong> Les conversions utilisent proj4js avec les paramètres officiels IGN. 
              Pour des applications critiques, vérifiez avec les outils de référence comme CIRCÉ (IGN).
            </p>
          </div>
        </details>
      </div>
    </div>
  );
};

export default CoordinateConverter;