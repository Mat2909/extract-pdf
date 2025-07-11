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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      {/* Fenêtre style MsgBox Excel */}
      <div className="bg-white border border-gray-400 shadow-lg w-96">
        {/* Barre de titre style Windows */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-3 py-2 border-b border-gray-400">
          <h1 className="text-white text-sm font-medium">PDF Extract - Authentification</h1>
        </div>

        {/* Contenu principal */}
        <div className="p-6">
          {/* Icône et titre */}
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center mr-3">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-800">Connexion requise</h2>
              <p className="text-xs text-gray-600">Veuillez vous identifier pour continuer</p>
            </div>
          </div>

          {/* Message d'erreur */}
          {error && (
            <div className="bg-red-50 border border-red-200 p-2 mb-4 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* Formulaire compact */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Nom d'utilisateur :
              </label>
              <input
                name="username"
                type="text"
                required
                value={credentials.username}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-xs border border-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Mot de passe :
              </label>
              <input
                name="password"
                type="password"
                required
                value={credentials.password}
                onChange={handleInputChange}
                className="w-full px-2 py-1 text-xs border border-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* Boutons style Windows */}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                type="submit"
                disabled={isLoading || !credentials.username || !credentials.password}
                className="px-4 py-1 text-xs bg-gray-200 border border-gray-400 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                {isLoading ? 'Connexion...' : 'OK'}
              </button>
              <button
                type="button"
                className="px-4 py-1 text-xs bg-gray-200 border border-gray-400 hover:bg-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              >
                Annuler
              </button>
            </div>
          </form>

          {/* Comptes de test en bas */}
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">Comptes de test :</p>
            <div className="text-xs text-gray-600 space-y-1">
              <div>• Admin / Admin (Administrateur)</div>
              <div>• Mathieu / Mathieu (Utilisateur)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPageSimple;