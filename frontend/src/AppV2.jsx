import React, { useState, useEffect } from 'react';
import profileManager from './utils/profileManager';
import workflowEngine from './utils/WorkflowEngine';
import authManager from './utils/authManager';
import LoginPage from './components/LoginPage';
import ProfileSelectionPage from './components/ProfileSelectionPage';
import AdminPage from './components/AdminPage';

/**
 * Application V2 - Architecture modulaire et configurable
 * Utilise un système de profils et de modules pour une flexibilité maximale
 */
function AppV2() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login'); // 'login', 'profiles', 'admin', 'workflow'
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
      // Vérifier si l'utilisateur est déjà connecté
      if (authManager.isLoggedIn()) {
        const user = authManager.getCurrentUser();
        setCurrentUser(user);
        setCurrentView('profiles');
      } else {
        setCurrentView('login');
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Erreur lors de l\'initialisation:', error);
      setCurrentView('login');
      setIsInitialized(true);
    }
  };

  // Gestionnaires d'événements
  const handleLogin = (user) => {
    setCurrentUser(user);
    setCurrentView('profiles');
  };

  const handleProfileSelected = (profile) => {
    try {
      // Initialiser le gestionnaire de profils avec le rôle de l'utilisateur
      profileManager.initialize(currentUser.role);
      
      // Définir le profil actuel
      profileManager.setCurrentProfile(profile.id);
      setSelectedProfile(profile);

      // Initialiser le workflow avec ce profil
      const workflow = workflowEngine.initialize(profile.id);
      setWorkflowState(workflow);

      // Charger le premier module
      const firstModule = workflowEngine.getCurrentModule();
      setCurrentModule(firstModule);

      setCurrentView('workflow');
    } catch (error) {
      console.error('Erreur lors de la sélection du profil:', error);
    }
  };

  const handleShowAdmin = () => {
    setCurrentView('admin');
  };

  const handleBackToProfiles = () => {
    setCurrentView('profiles');
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

  // Rendu selon la vue actuelle
  switch (currentView) {
    case 'login':
      return <LoginPage onLogin={handleLogin} />;
      
    case 'profiles':
      return (
        <ProfileSelectionPage 
          user={currentUser}
          onProfileSelected={handleProfileSelected}
          onShowAdmin={handleShowAdmin}
        />
      );
      
    case 'admin':
      return <AdminPage onBack={handleBackToProfiles} />;
      
    case 'workflow':
      return (
        <div className="min-h-screen bg-gray-50">
          {/* Header de l'application */}
          <header className="bg-white shadow-sm border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <div className="flex items-center">
                  <button
                    onClick={handleBackToProfiles}
                    className="mr-4 p-2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <h1 className="text-2xl font-bold text-gray-900">
                    PDF OCR Extractor V2
                  </h1>
                  {selectedProfile && (
                    <span className="ml-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedProfile.name}
                    </span>
                  )}
                </div>
                
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{authManager.getDisplayName()}</span>
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
            {currentModule ? (
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
                  Aucun module chargé
                </h2>
                <p className="text-gray-500">
                  Erreur de configuration du workflow.
                </p>
              </div>
            )}
          </main>
        </div>
      );
      
    default:
      return <LoginPage onLogin={handleLogin} />;
  }
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