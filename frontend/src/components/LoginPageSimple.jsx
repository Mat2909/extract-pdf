import React, { useState } from 'react';

/**
 * Page d'authentification moderne inspirée de Flowbite  
 * Utilise les couleurs primaires rouges et la police Inter
 * FORCE COMMIT - Design rouge avec Inter
 */
function LoginPageSimple({ onLogin }) {
  const [credentials, setCredentials] = useState({
    username: 'Admin',
    password: 'Admin'
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
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <section style={{ 
        backgroundColor: '#f9fafb', 
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
        minHeight: '100vh'
      }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        margin: '0 auto',
        minHeight: '100vh'
      }}>
        {/* Logo et titre */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '24px',
          fontSize: '24px',
          fontWeight: '600',
          color: '#111827'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            marginRight: '8px',
            backgroundColor: '#dc2626',
            borderRadius: '8px'
          }}>
            <svg style={{ width: '20px', height: '20px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          PDF Extract
        </div>
        
        {/* Carte de connexion */}
        <div style={{
          width: '100%',
          maxWidth: '448px',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          <div style={{ padding: '32px' }}>
            <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl">
              Connectez-vous à votre compte
            </h1>
            
            {/* Message d'erreur */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            {/* Formulaire */}
            <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#111827' 
                }}>
                  Nom d'utilisateur
                </label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  value={credentials.username}
                  onChange={handleInputChange}
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #d1d5db',
                    color: '#111827',
                    borderRadius: '8px',
                    display: 'block',
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Votre nom d'utilisateur"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="password" style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#111827' 
                }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  style={{
                    backgroundColor: '#f9fafb',
                    border: '1px solid #d1d5db',
                    color: '#111827',
                    borderRadius: '8px',
                    display: 'block',
                    width: '100%',
                    padding: '10px',
                    fontSize: '14px',
                    boxSizing: 'border-box'
                  }}
                  required
                />
              </div>

              {/* Se souvenir de moi + Mot de passe oublié */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                    <input
                      id="remember"
                      type="checkbox"
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '1px solid #d1d5db',
                        borderRadius: '4px',
                        backgroundColor: '#f9fafb'
                      }}
                    />
                  </div>
                  <div style={{ marginLeft: '12px' }}>
                    <label htmlFor="remember" style={{ fontSize: '14px', color: '#6b7280' }}>
                      Se souvenir de moi
                    </label>
                  </div>
                </div>
                <a href="#" style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#dc2626', 
                  textDecoration: 'none' 
                }}>
                  Mot de passe oublié ?
                </a>
              </div>
              
              <button
                type="submit"
                disabled={isLoading || !credentials.username || !credentials.password}
                style={{
                  width: '100%',
                  color: 'white',
                  backgroundColor: '#dc2626',
                  fontWeight: '500',
                  borderRadius: '8px',
                  fontSize: '14px',
                  padding: '10px 20px',
                  textAlign: 'center',
                  border: 'none',
                  cursor: isLoading || !credentials.username || !credentials.password ? 'not-allowed' : 'pointer',
                  opacity: isLoading || !credentials.username || !credentials.password ? '0.5' : '1',
                  transition: 'all 0.15s ease-in-out'
                }}
                onMouseOver={(e) => {
                  if (!isLoading && credentials.username && credentials.password) {
                    e.target.style.backgroundColor = '#b91c1c';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isLoading && credentials.username && credentials.password) {
                    e.target.style.backgroundColor = '#dc2626';
                  }
                }}
              >
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg style={{ 
                      animation: 'spin 1s linear infinite', 
                      marginLeft: '-4px', 
                      marginRight: '12px', 
                      width: '20px', 
                      height: '20px', 
                      color: 'white' 
                    }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: '0.25' }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path style={{ opacity: '0.75' }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion en cours...
                  </span>
                ) : (
                  'Se connecter'
                )}
              </button>

              {/* Créer un compte */}
              <p style={{ fontSize: '14px', fontWeight: '300', color: '#6b7280', textAlign: 'center' }}>
                Vous n'avez pas encore de compte ?{' '}
                <a href="#" style={{ 
                  fontWeight: '500', 
                  color: '#dc2626', 
                  textDecoration: 'none' 
                }}>
                  Créer un compte
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
    </>
  
  );
}

export default LoginPageSimple;