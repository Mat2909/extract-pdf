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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        {/* Titre de l'app en dehors de la fenêtre */}
        <h1 className="text-4xl font-bold text-blue-600 mb-8" style={{fontSize: '2.5rem'}}>PDF Extract</h1>
        
        {/* Fenêtre d'authentification */}
        <div className="bg-white border-2 border-slate-200 shadow-2xl w-96" style={{borderRadius: '16px', overflow: 'hidden'}}>
          {/* Barre de titre colorée */}
          <div className="px-4 py-3" style={{background: 'linear-gradient(to right, #60a5fa, #a855f7, #6366f1)'}}>
            <h2 className="text-white text-sm font-medium">Authentification</h2>
          </div>

          {/* Contenu principal */}
          <div className="p-6 bg-gradient-to-b from-white to-slate-50">
            {/* En-tête avec icône */}
            <div className="text-center mb-6">
              <div className="rounded-full flex items-center justify-center mx-auto mb-3 shadow-md" style={{width: '32px', height: '32px', background: 'linear-gradient(to right, #34d399, #14b8a6)'}}>
                <svg className="text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{width: '16px', height: '16px'}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-700">Connexion requise</h3>
              <p className="text-sm text-slate-500 mt-1">Veuillez vous identifier pour continuer</p>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-400 p-3 mb-4 rounded-r">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Formulaire */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Nom d'utilisateur
                </label>
                <input
                  name="username"
                  type="text"
                  required
                  value={credentials.username}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-purple-400 focus:outline-none transition-colors bg-white shadow-sm"
                  placeholder="Votre nom d'utilisateur"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mot de passe
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  value={credentials.password}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 text-sm border-2 border-slate-200 rounded-lg focus:border-purple-400 focus:outline-none transition-colors bg-white shadow-sm"
                  placeholder="Votre mot de passe"
                />
              </div>

              {/* Boutons améliorés */}
              <div className="flex justify-end space-x-3 mt-8">
                <button
                  type="button"
                  className="px-4 py-2 text-sm text-slate-600 bg-gradient-to-r from-slate-100 to-slate-200 border border-slate-300 rounded-lg hover:from-slate-200 hover:to-slate-300 transition-all shadow-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !credentials.username || !credentials.password}
                  className="px-6 py-2 text-sm bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:via-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connexion...
                    </span>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </div>
            </form>

            {/* Comptes de test avec style amélioré */}
            <div className="mt-6 pt-4 border-t border-slate-200">
              <p className="text-sm text-slate-500 mb-3 text-center">Comptes de démonstration</p>
              <div className="space-y-2">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg px-3 py-2 text-sm shadow-sm">
                  <span className="font-medium text-blue-700">Admin</span> / <span className="font-medium text-blue-700">Admin</span> 
                  <span className="text-blue-600 ml-2">(Administrateur)</span>
                </div>
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg px-3 py-2 text-sm shadow-sm">
                  <span className="font-medium text-emerald-700">Mathieu</span> / <span className="font-medium text-emerald-700">Mathieu</span> 
                  <span className="text-emerald-600 ml-2">(Utilisateur)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPageSimple;