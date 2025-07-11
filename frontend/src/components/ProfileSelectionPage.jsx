import React, { useState, useEffect } from 'react';
import profileManager from '../utils/profileManager';
import authManager from '../utils/authManager';

/**
 * Page de sélection de profils
 * Interface professionnelle pour choisir ou gérer les profils
 */
function ProfileSelectionPage({ user, onProfileSelected, onShowAdmin }) {
  const [profiles, setProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = () => {
    try {
      setIsLoading(true);
      profileManager.initialize(user.role);
      const availableProfiles = profileManager.getProfiles();
      setProfiles(availableProfiles);
      
      // Sélectionner le profil par défaut
      const defaultProfile = profileManager.getDefaultProfile();
      if (defaultProfile) {
        setSelectedProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des profils:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSelect = (profile) => {
    setSelectedProfile(profile);
  };

  const handleContinue = () => {
    if (selectedProfile) {
      onProfileSelected(selectedProfile);
    }
  };

  const handleLogout = () => {
    authManager.logout();
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement des profils...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">PDF OCR Extractor V2</h1>
              <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                Architecture modulaire
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{authManager.getDisplayName()}</span>
                <span className="ml-2 text-gray-500">({user.role === 'administrator' ? 'Administrateur' : 'Utilisateur'})</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900">Sélectionnez votre profil de traitement</h2>
          <p className="mt-4 text-lg text-gray-600">
            Chaque profil propose un workflow adapté à vos besoins métier
          </p>
        </div>

        {/* Actions administrateur */}
        {authManager.isAdmin() && (
          <div className="mb-8 text-center">
            <button
              onClick={onShowAdmin}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Administration des profils
            </button>
          </div>
        )}

        {/* Grille des profils */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {profiles.map((profile) => (
            <div
              key={profile.id}
              onClick={() => handleProfileSelect(profile)}
              className={`relative bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all duration-200 ${
                selectedProfile?.id === profile.id
                  ? 'border-blue-500 shadow-lg transform scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              <div className="p-6">
                {/* En-tête du profil */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div 
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                      style={{ backgroundColor: profile.color }}
                    >
                      {profile.name.charAt(0)}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{profile.name}</h3>
                      <p className="text-sm text-gray-500">{profile.description}</p>
                    </div>
                  </div>
                  
                  {selectedProfile?.id === profile.id && (
                    <div className="flex-shrink-0">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modules du workflow */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">Workflow :</h4>
                  <div className="space-y-2">
                    {profile.modules.map((moduleId, index) => {
                      const moduleConfig = profileManager.getModules()[moduleId];
                      if (!moduleConfig) return null;
                      
                      return (
                        <div key={moduleId} className="flex items-center">
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                              {index + 1}
                            </div>
                            <span className="ml-3 text-sm text-gray-700">{moduleConfig.name}</span>
                          </div>
                          {index < profile.modules.length - 1 && (
                            <div className="ml-auto">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Configuration du profil */}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Modules actifs</span>
                    <span className="font-medium text-gray-900">{profile.modules.length}</span>
                  </div>
                  {profile.config?.exportFormat && (
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-500">Format export</span>
                      <span className="font-medium text-gray-900">{profile.config.exportFormat.toUpperCase()}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Profil sélectionné et action */}
        {selectedProfile && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: selectedProfile.color }}
                >
                  {selectedProfile.name.charAt(0)}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Profil sélectionné : {selectedProfile.name}
                  </h3>
                  <p className="text-sm text-gray-600">
                    Workflow avec {selectedProfile.modules.length} modules configurés
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleContinue}
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Commencer le traitement
                <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {profiles.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun profil disponible</h3>
              <p className="mt-1 text-sm text-gray-500">
                {authManager.isAdmin() 
                  ? 'Créez un nouveau profil pour commencer.'
                  : 'Contactez l\'administrateur pour configurer des profils.'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProfileSelectionPage;