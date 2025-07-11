import React, { useState, useEffect } from 'react';
import profileManager from './utils/profileManager';
import workflowEngine from './utils/WorkflowEngine';

/**
 * Application V2 - Architecture modulaire et configurable
 * Utilise un système de profils et de modules pour une flexibilité maximale
 */
function AppV2() {
  const [currentUser, setCurrentUser] = useState(null);
  const [availableProfiles, setAvailableProfiles] = useState([]);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [workflowState, setWorkflowState] = useState(null);
  const [currentModule, setCurrentModule] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialisation de l'application
  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = () => {
    try {
      // Initialiser le gestionnaire de profils (pour l'instant en mode user)
      const user = profileManager.initialize('user');
      setCurrentUser(user);

      // Charger les profils disponibles
      const profiles = profileManager.getProfiles();
      setAvailableProfiles(profiles);

      // Sélectionner le profil par défaut
      const defaultProfile = profileManager.getDefaultProfile();
      if (defaultProfile) {
        selectProfile(defaultProfile.id);
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
    }
  };

  const selectProfile = (profileId) => {
    try {
      // Définir le profil actuel
      profileManager.setCurrentProfile(profileId);
      const profile = profileManager.getCurrentProfile();
      setSelectedProfile(profile);

      // Initialiser le workflow avec ce profil
      const workflow = workflowEngine.initialize(profileId);
      setWorkflowState(workflow);

      // Charger le premier module
      const firstModule = workflowEngine.getCurrentModule();
      setCurrentModule(firstModule);

    } catch (error) {
      console.error('Erreur lors de la sélection du profil:', error);
    }
  };

  const handleModuleNext = (data) => {
    const nextModule = workflowEngine.nextStep(data);
    
    if (nextModule) {
      setCurrentModule(nextModule);
    } else {
      // Workflow terminé
      handleWorkflowComplete();
    }
    
    updateWorkflowState();
  };

  const handleModulePrevious = () => {
    const previousModule = workflowEngine.previousStep();
    setCurrentModule(previousModule);
    updateWorkflowState();
  };

  const handleModuleSkip = () => {
    const nextModule = workflowEngine.skipStep();
    
    if (nextModule) {
      setCurrentModule(nextModule);
    } else {
      handleWorkflowComplete();
    }
    
    updateWorkflowState();
  };

  const updateWorkflowState = () => {
    const progress = workflowEngine.getProgress();
    setWorkflowState(prev => ({
      ...prev,
      progress
    }));
  };

  const handleWorkflowComplete = () => {
    const allData = workflowEngine.getAllData();
    console.log('Workflow terminé avec les données:', allData);
    
    // Ici on pourrait déclencher des actions de finalisation
    // comme la sauvegarde en base, l'envoi d'emails, etc.
  };

  const resetWorkflow = () => {
    workflowEngine.reset();
    const firstModule = workflowEngine.getCurrentModule();
    setCurrentModule(firstModule);
    updateWorkflowState();
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Initialisation de l'application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header de l'application */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                PDF OCR Extractor V2
              </h1>
              {selectedProfile && (
                <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {selectedProfile.name}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Sélecteur de profil */}
              <div className="relative">
                <select
                  value={selectedProfile?.id || ''}
                  onChange={(e) => selectProfile(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                >
                  {availableProfiles.map(profile => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name} - {profile.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* Informations utilisateur */}
              <div className="text-sm text-gray-500">
                Connecté en tant que: <span className="font-medium">{currentUser?.role}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Barre de progression */}
      {workflowState && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-medium text-gray-900">
                Étape {workflowState.progress?.current || 1} sur {workflowState.progress?.total || 1}
              </h2>
              <span className="text-sm text-gray-500">
                {workflowState.progress?.percentage || 0}% terminé
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${workflowState.progress?.percentage || 0}%` }}
              ></div>
            </div>
            
            {/* Navigation des étapes */}
            <div className="flex justify-between mt-4">
              <button
                onClick={resetWorkflow}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Recommencer
              </button>
              
              <div className="text-sm text-gray-500">
                {workflowState.progress?.completed || 0} module(s) terminé(s)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedProfile && currentModule ? (
          <ModuleRenderer
            module={currentModule}
            onNext={handleModuleNext}
            onPrevious={handleModulePrevious}
            onSkip={handleModuleSkip}
            isFirst={workflowEngine.isFirstStep()}
            isLast={workflowEngine.isLastStep()}
            workflowData={workflowEngine.getAllData()}
          />
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-medium text-gray-900 mb-4">
              Aucun profil sélectionné
            </h2>
            <p className="text-gray-500">
              Veuillez sélectionner un profil pour commencer le traitement.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="text-center text-sm text-gray-500">
            PDF OCR Extractor V2 - Architecture modulaire
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * Composant pour rendre dynamiquement les modules
 */
function ModuleRenderer({ module, onNext, onPrevious, onSkip, isFirst, isLast, workflowData }) {
  if (!module || !module.component) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Module non trouvé ou invalide</p>
      </div>
    );
  }

  const ModuleComponent = module.component;
  
  return (
    <ModuleComponent
      module={module.config}
      config={module.config.config}
      onNext={onNext}
      onPrevious={onPrevious}
      onSkip={onSkip}
      isFirst={isFirst}
      isLast={isLast}
      workflowData={workflowData}
      showNavigation={true}
    />
  );
}

export default AppV2;