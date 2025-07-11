import profileManager from './profileManager';

// Import des modules
import UploadModule from '../modules/UploadModule';
import PageSelectionModule from '../modules/PageSelectionModule';
import CoordinateFormatModule from '../modules/CoordinateFormatModule';
import OCRProcessingModule from '../modules/OCRProcessingModule';
import ExportModule from '../modules/ExportModule';

/**
 * Moteur de workflow pour orchestrer les modules selon les profils
 */
class WorkflowEngine {
  constructor() {
    this.modules = new Map();
    this.currentStep = 0;
    this.workflowData = {};
    this.activeProfile = null;
    this.moduleInstances = [];
    
    // Enregistrer les modules disponibles
    this.registerModule('UploadModule', UploadModule);
    this.registerModule('PageSelectionModule', PageSelectionModule);
    this.registerModule('CoordinateFormatModule', CoordinateFormatModule);
    this.registerModule('OCRProcessingModule', OCRProcessingModule);
    this.registerModule('ExportModule', ExportModule);
  }

  /**
   * Enregistre un module dans le moteur
   */
  registerModule(componentName, moduleClass) {
    this.modules.set(componentName, moduleClass);
  }

  /**
   * Initialise le workflow avec un profil
   */
  initialize(profileId) {
    const profile = profileManager.getProfile(profileId);
    if (!profile) {
      throw new Error(`Profil inexistant: ${profileId}`);
    }

    this.activeProfile = profile;
    this.currentStep = 0;
    this.workflowData = {};
    this.moduleInstances = [];

    // Créer la séquence de modules pour ce profil
    this.createModuleSequence();

    return {
      profile: this.activeProfile,
      totalSteps: this.moduleInstances.length,
      currentStep: this.currentStep
    };
  }

  /**
   * Crée la séquence de modules basée sur le profil actif
   */
  createModuleSequence() {
    const modules = profileManager.getModules();
    
    this.activeProfile.modules.forEach((moduleId, index) => {
      const moduleConfig = modules[moduleId];
      if (!moduleConfig) {
        console.warn(`Module non trouvé: ${moduleId}`);
        return;
      }

      // Récupérer la classe du module
      const ModuleClass = this.modules.get(moduleConfig.component);
      if (!ModuleClass) {
        console.warn(`Composant de module non trouvé: ${moduleConfig.component}`);
        return;
      }

      const moduleInstance = {
        id: moduleId,
        config: moduleConfig,
        component: ModuleClass,
        order: index,
        isCompleted: false,
        data: null
      };

      this.moduleInstances.push(moduleInstance);
    });
  }

  /**
   * Récupère le module actuel
   */
  getCurrentModule() {
    return this.moduleInstances[this.currentStep] || null;
  }

  /**
   * Récupère tous les modules du workflow
   */
  getModules() {
    return this.moduleInstances;
  }

  /**
   * Vérifie si c'est le premier module
   */
  isFirstStep() {
    return this.currentStep === 0;
  }

  /**
   * Vérifie si c'est le dernier module
   */
  isLastStep() {
    return this.currentStep === this.moduleInstances.length - 1;
  }

  /**
   * Avance au module suivant
   */
  nextStep(data = null) {
    const currentModule = this.getCurrentModule();
    if (currentModule) {
      currentModule.isCompleted = true;
      currentModule.data = data;
      this.workflowData[currentModule.id] = data;
    }

    if (!this.isLastStep()) {
      this.currentStep++;
      return this.getCurrentModule();
    }

    return null; // Workflow terminé
  }

  /**
   * Recule au module précédent
   */
  previousStep() {
    if (!this.isFirstStep()) {
      this.currentStep--;
      return this.getCurrentModule();
    }
    
    return this.getCurrentModule();
  }

  /**
   * Ignore le module actuel
   */
  skipStep() {
    const currentModule = this.getCurrentModule();
    if (currentModule) {
      currentModule.isCompleted = true;
      currentModule.data = null;
    }

    return this.nextStep(null);
  }

  /**
   * Va directement à un module spécifique
   */
  goToStep(stepIndex) {
    if (stepIndex >= 0 && stepIndex < this.moduleInstances.length) {
      this.currentStep = stepIndex;
      return this.getCurrentModule();
    }
    
    return null;
  }

  /**
   * Récupère les données d'un module spécifique
   */
  getModuleData(moduleId) {
    return this.workflowData[moduleId] || null;
  }

  /**
   * Récupère toutes les données du workflow
   */
  getAllData() {
    return { ...this.workflowData };
  }

  /**
   * Met à jour les données d'un module
   */
  setModuleData(moduleId, data) {
    this.workflowData[moduleId] = data;
    
    // Mettre à jour l'instance du module aussi
    const moduleInstance = this.moduleInstances.find(m => m.id === moduleId);
    if (moduleInstance) {
      moduleInstance.data = data;
    }
  }

  /**
   * Vérifie si le workflow est terminé
   */
  isCompleted() {
    return this.moduleInstances.every(module => module.isCompleted);
  }

  /**
   * Récupère le progrès du workflow
   */
  getProgress() {
    const completedModules = this.moduleInstances.filter(m => m.isCompleted).length;
    const totalModules = this.moduleInstances.length;
    
    return {
      current: this.currentStep + 1,
      total: totalModules,
      completed: completedModules,
      percentage: totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0
    };
  }

  /**
   * Réinitialise le workflow
   */
  reset() {
    this.currentStep = 0;
    this.workflowData = {};
    
    this.moduleInstances.forEach(module => {
      module.isCompleted = false;
      module.data = null;
    });
  }

  /**
   * Exporte l'état actuel du workflow
   */
  exportState() {
    return {
      profileId: this.activeProfile?.id,
      currentStep: this.currentStep,
      workflowData: this.workflowData,
      moduleStates: this.moduleInstances.map(m => ({
        id: m.id,
        isCompleted: m.isCompleted,
        data: m.data
      }))
    };
  }

  /**
   * Importe un état de workflow
   */
  importState(state) {
    if (state.profileId !== this.activeProfile?.id) {
      throw new Error('L\'état ne correspond pas au profil actuel');
    }

    this.currentStep = state.currentStep;
    this.workflowData = state.workflowData;

    // Restaurer l'état des modules
    state.moduleStates.forEach(moduleState => {
      const moduleInstance = this.moduleInstances.find(m => m.id === moduleState.id);
      if (moduleInstance) {
        moduleInstance.isCompleted = moduleState.isCompleted;
        moduleInstance.data = moduleState.data;
      }
    });
  }

  /**
   * Valide la configuration du workflow
   */
  validate() {
    const errors = [];

    if (!this.activeProfile) {
      errors.push('Aucun profil actif');
    }

    if (this.moduleInstances.length === 0) {
      errors.push('Aucun module configuré');
    }

    // Vérifier que les modules requis sont présents
    const requiredModules = Object.entries(profileManager.getModules())
      .filter(([, module]) => module.required)
      .map(([id]) => id);

    const configuredModules = this.moduleInstances.map(m => m.id);
    
    requiredModules.forEach(requiredModule => {
      if (!configuredModules.includes(requiredModule)) {
        errors.push(`Module requis manquant: ${requiredModule}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Calcule les dépendances entre modules
   */
  calculateDependencies() {
    // Pour l'instant, ordre séquentiel simple
    // Pourra être étendu pour gérer des dépendances complexes
    return this.moduleInstances.map((module, index) => ({
      ...module,
      dependencies: index > 0 ? [this.moduleInstances[index - 1].id] : [],
      dependents: index < this.moduleInstances.length - 1 ? [this.moduleInstances[index + 1].id] : []
    }));
  }
}

// Instance singleton
const workflowEngine = new WorkflowEngine();

export default workflowEngine;