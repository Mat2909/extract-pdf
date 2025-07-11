import React, { useState } from 'react';

/**
 * Dialog de configuration OCR pour la détection intelligente des points décimaux
 */
function OCRConfigDialog({ isOpen, onClose, onConfirm }) {
  const [config, setConfig] = useState({
    decimals: 3,
    coordinateType: 'lambert',
    autoFix: true
  });

  const coordinateTypes = [
    { value: 'lambert', label: 'Lambert (ex: 1234567.890)', description: 'Coordonnées Lambert française' },
    { value: 'gps', label: 'GPS (ex: 48.123456)', description: 'Coordonnées GPS décimales' },
    { value: 'utm', label: 'UTM (ex: 654321.123)', description: 'Coordonnées UTM' },
    { value: 'custom', label: 'Personnalisé', description: 'Configuration manuelle' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Stocker la configuration globalement pour l'OCR
    window.currentOCRConfig = config;
    
    console.log('🎯 Configuration OCR intelligente:', config);
    onConfirm(config);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            🧠 Configuration OCR Intelligente
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Aidez l'OCR à détecter vos coordonnées correctement
          </p>
        </div>

        {/* Contenu */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Type de coordonnées */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Type de coordonnées
            </label>
            <div className="space-y-2">
              {coordinateTypes.map((type) => (
                <label key={type.value} className="flex items-start cursor-pointer">
                  <input
                    type="radio"
                    name="coordinateType"
                    value={type.value}
                    checked={config.coordinateType === type.value}
                    onChange={(e) => setConfig({ ...config, coordinateType: e.target.value })}
                    className="mt-1 mr-3 text-blue-600"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900">{type.label}</div>
                    <div className="text-xs text-gray-500">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Nombre de décimales */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de décimales attendu
            </label>
            <select
              value={config.decimals}
              onChange={(e) => setConfig({ ...config, decimals: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={0}>0 décimale (coordonnées entières)</option>
              <option value={1}>1 décimale (ex: 123456.7)</option>
              <option value={2}>2 décimales (ex: 123456.78)</option>
              <option value={3}>3 décimales (ex: 123456.789)</option>
              <option value={4}>4 décimales (ex: 123456.7890)</option>
              <option value={6}>6 décimales (GPS haute précision)</option>
            </select>
          </div>

          {/* Correction automatique */}
          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.autoFix}
                onChange={(e) => setConfig({ ...config, autoFix: e.target.checked })}
                className="mr-3 text-blue-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Correction automatique intelligente
                </div>
                <div className="text-xs text-gray-500">
                  Détecte et corrige automatiquement les espaces/points manqués
                </div>
              </div>
            </label>
          </div>

          {/* Aperçu de la configuration */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Aperçu de détection :</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div>• <code>"123456 789"</code> → <code>"123456.789"</code></div>
              <div>• <code>"1234567890"</code> → <code>"1234567.890"</code></div>
              <div>• <code>"123456."</code> → <code>"123456.000"</code></div>
            </div>
          </div>

          {/* Boutons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            >
              Démarrer l'OCR
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OCRConfigDialog;