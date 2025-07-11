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
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* En-tête */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">PDF OCR Extractor</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-700">Connexion</h2>
          <p className="mt-2 text-sm text-gray-600">
            Accédez à vos outils de traitement PDF
          </p>
        </div>

        {/* Formulaire */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Nom d'utilisateur
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={credentials.username}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez votre nom d'utilisateur"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Mot de passe
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={credentials.password}
                onChange={handleInputChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Entrez votre mot de passe"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !credentials.username || !credentials.password}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </button>
          </div>
        </form>

        {/* Comptes de test */}
        <div className="mt-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">Comptes de test :</p>
            <div className="space-y-2 text-xs text-gray-600">
              <div>Admin / Admin (Administrateur)</div>
              <div>Mathieu / Mathieu (Utilisateur)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPageSimple;