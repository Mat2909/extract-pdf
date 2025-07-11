import React, { useState } from 'react';

/**
 * Page d'authentification simple et professionnelle
 */
function LoginPageSimple({ onLogin }) {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Comptes de test simples
  const testAccounts = {
    'Admin': { password: 'Admin', role: 'administrator', name: 'Administrateur' },
    'Mathieu': { password: 'Mathieu', role: 'user', name: 'Mathieu' }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulation d'une vérification
    setTimeout(() => {
      const account = testAccounts[credentials.username];
      
      if (account && account.password === credentials.password) {
        onLogin({
          username: credentials.username,
          role: account.role,
          name: account.name
        });
      } else {
        setError('Nom d\'utilisateur ou mot de passe incorrect');
      }
      
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center py-12 px-4">
      {/* Fenêtre de connexion centrée */}
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md">
        {/* En-tête avec fond coloré */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-t-xl px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-white">PDF OCR Extractor</h1>
          <p className="text-blue-100 mt-2 text-sm">Plateforme de traitement PDF</p>
        </div>

        {/* Contenu de la fenêtre */}
        <div className="px-6 py-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">Connexion</h2>
            <p className="text-gray-600 text-sm mt-1">Accédez à votre espace de travail</p>
          </div>

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={credentials.username}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Votre nom d'utilisateur"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={credentials.password}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Votre mot de passe"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !credentials.username || !credentials.password}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connexion...
                </span>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>
        </div>

        {/* Pied de la fenêtre */}
        <div className="bg-gray-50 rounded-b-xl px-6 py-4">
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">Comptes de démonstration</p>
            <div className="space-y-1">
              <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                <span className="font-medium">Admin</span> / <span className="font-medium">Admin</span> <span className="text-gray-500">(Administrateur)</span>
              </div>
              <div className="text-xs text-gray-600 bg-white px-2 py-1 rounded border">
                <span className="font-medium">Mathieu</span> / <span className="font-medium">Mathieu</span> <span className="text-gray-500">(Utilisateur)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPageSimple;