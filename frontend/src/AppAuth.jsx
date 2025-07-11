import React, { useState } from 'react';
import LoginPageSimple from './components/LoginPageSimple';
import App from './App'; // L'app existante V1

/**
 * Application avec authentification simple
 * Step 1: Ajouter juste la page de login avant l'app existante
 */
function AppAuth() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const handleLogin = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  // Si pas connecté, afficher la page de login
  if (!isAuthenticated) {
    return <LoginPageSimple onLogin={handleLogin} />;
  }

  // Si connecté, afficher l'app existante avec info utilisateur
  return (
    <div>
      {/* Barre d'info utilisateur simple */}
      <div className="bg-blue-600 text-white px-4 py-2 text-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span>Connecté en tant que : <strong>{currentUser.name}</strong> ({currentUser.role === 'administrator' ? 'Administrateur' : 'Utilisateur'})</span>
          <button 
            onClick={handleLogout}
            className="text-blue-200 hover:text-white underline"
          >
            Déconnexion
          </button>
        </div>
      </div>
      
      {/* App existante */}
      <App />
    </div>
  );
}

export default AppAuth;