import React, { useState, useEffect, useRef } from 'react';
import LoginPageSimple from './components/LoginPageSimple';
import App from './App'; // L'app existante V1

/**
 * Application avec authentification simple
 * Step 1: Ajouter juste la page de login avant l'app existante
 */
function AppAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowProfileMenu(false);
  };

  // Fermer le menu profil quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Si pas connecté, afficher la page de login
  if (!isAuthenticated) {
    return <LoginPageSimple onLogin={handleLogin} />;
  }

  // Si connecté, afficher l'app existante avec bulle de profil
  return (
    <div className="relative">
      {/* Bulle de profil en haut à droite */}
      <div className="fixed top-4 right-4 z-50" ref={profileMenuRef}>
        <div className="relative">
          {/* Bouton profil */}
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center justify-center w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors duration-200"
            title={`Connecté en tant que ${currentUser.name}`}
          >
            <span className="text-lg font-bold">
              {currentUser.name.charAt(0).toUpperCase()}
            </span>
          </button>
          
          {/* Menu déroulant profil */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <p className="text-sm text-gray-700">Connecté en tant que</p>
                <p className="text-sm font-medium text-gray-900">{currentUser.name}</p>
                <p className="text-xs text-gray-500">
                  {currentUser.role === 'administrator' ? 'Administrateur' : 'Utilisateur'}
                </p>
              </div>
              <div className="py-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors duration-200"
                >
                  🚪 Déconnexion
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* App existante */}
      <App resetApp={() => {}} currentUser={currentUser} />
    </div>
  );
}

export default AppAuth;