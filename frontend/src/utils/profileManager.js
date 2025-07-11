import appConfig from '../data/appConfig.json';

/**
 * Gestionnaire des profils d'application
 * Permet de charger, valider et utiliser les profils définis
 */
class ProfileManager {
  constructor() {
    this.config = appConfig;
    this.currentProfile = null;
    this.currentUser = null;
  }

  /**
   * Initialise le gestionnaire avec un utilisateur
   */
  initialize(userRole = 'user') {
    // Utiliser la configuration des utilisateurs depuis authManager si possible
    this.currentUser = this.config.users[userRole === 'administrator' ? 'admin' : 'mathieu'] || this.config.users.mathieu;
    this.currentProfile = this.getDefaultProfile();
    return this.currentUser;
  }

  /**
   * Récupère tous les profils disponibles
   */
  getProfiles() {
    return Object.values(this.config.profiles).filter(profile => profile.active);
  }

  /**
   * Récupère un profil par son ID
   */
  getProfile(profileId) {
    return this.config.profiles[profileId] || null;
  }

  /**
   * Récupère le profil par défaut
   */
  getDefaultProfile() {
    const defaultId = this.config.settings.defaultProfile;
    return this.getProfile(defaultId);
  }

  /**
   * Définit le profil actuel
   */
  setCurrentProfile(profileId) {
    const profile = this.getProfile(profileId);
    if (profile) {
      this.currentProfile = profile;
      return true;
    }
    return false;
  }

  /**
   * Récupère le profil actuel
   */
  getCurrentProfile() {
    return this.currentProfile;
  }

  /**
   * Récupère tous les modules disponibles
   */
  getModules() {
    return this.config.modules;
  }

  /**
   * Récupère les modules activés pour le profil actuel
   */
  getActiveModules() {
    if (!this.currentProfile) return [];
    
    return this.currentProfile.modules.map(moduleId => {
      return {
        ...this.config.modules[moduleId],
        profileConfig: this.currentProfile.config
      };
    }).filter(module => module.id); // Filtrer les modules inexistants
  }

  /**
   * Vérifie si un module est activé pour le profil actuel
   */
  isModuleActive(moduleId) {
    if (!this.currentProfile) return false;
    return this.currentProfile.modules.includes(moduleId);
  }

  /**
   * Récupère la configuration d'un module pour le profil actuel
   */
  getModuleConfig(moduleId) {
    const module = this.config.modules[moduleId];
    if (!module) return null;

    return {
      ...module.config,
      ...this.currentProfile?.config
    };
  }

  /**
   * Vérifie les permissions de l'utilisateur actuel
   */
  hasPermission(permission) {
    if (!this.currentUser) return false;
    return this.currentUser.permissions.includes(permission);
  }

  /**
   * Vérifie si l'utilisateur est administrateur
   */
  isAdmin() {
    return this.currentUser?.role === 'administrator';
  }

  /**
   * Crée un nouveau profil (admin seulement)
   */
  createProfile(profileData) {
    if (!this.hasPermission('create_profiles')) {
      throw new Error('Permission insuffisante pour créer un profil');
    }

    const profileId = profileData.id || profileData.name.toLowerCase().replace(/\s+/g, '-');
    
    if (this.config.profiles[profileId]) {
      throw new Error('Un profil avec cet ID existe déjà');
    }

    this.config.profiles[profileId] = {
      id: profileId,
      active: true,
      ...profileData
    };

    return profileId;
  }

  /**
   * Met à jour un profil existant (admin seulement)
   */
  updateProfile(profileId, updates) {
    if (!this.hasPermission('edit_profiles')) {
      throw new Error('Permission insuffisante pour modifier un profil');
    }

    if (!this.config.profiles[profileId]) {
      throw new Error('Profil inexistant');
    }

    this.config.profiles[profileId] = {
      ...this.config.profiles[profileId],
      ...updates
    };

    return true;
  }

  /**
   * Supprime un profil (admin seulement)
   */
  deleteProfile(profileId) {
    if (!this.hasPermission('delete_profiles')) {
      throw new Error('Permission insuffisante pour supprimer un profil');
    }

    if (!this.config.profiles[profileId]) {
      throw new Error('Profil inexistant');
    }

    delete this.config.profiles[profileId];
    return true;
  }

  /**
   * Valide la configuration d'un profil
   */
  validateProfile(profileData) {
    const errors = [];

    if (!profileData.name) {
      errors.push('Le nom du profil est requis');
    }

    if (!profileData.modules || !Array.isArray(profileData.modules)) {
      errors.push('Les modules doivent être définis comme un tableau');
    }

    // Vérifier que tous les modules existent
    if (profileData.modules) {
      profileData.modules.forEach(moduleId => {
        if (!this.config.modules[moduleId]) {
          errors.push(`Module inexistant: ${moduleId}`);
        }
      });
    }

    // Vérifier les modules requis
    const requiredModules = Object.entries(this.config.modules)
      .filter(([, module]) => module.required)
      .map(([id]) => id);

    requiredModules.forEach(requiredModule => {
      if (!profileData.modules?.includes(requiredModule)) {
        errors.push(`Module requis manquant: ${requiredModule}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Export de la configuration (admin seulement)
   */
  exportConfig() {
    if (!this.hasPermission('view_all_data')) {
      throw new Error('Permission insuffisante pour exporter la configuration');
    }

    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import de configuration (admin seulement)
   */
  importConfig(configJson) {
    if (!this.hasPermission('manage_modules')) {
      throw new Error('Permission insuffisante pour importer une configuration');
    }

    try {
      const newConfig = JSON.parse(configJson);
      // Validation basique
      if (!newConfig.modules || !newConfig.profiles) {
        throw new Error('Configuration invalide');
      }
      
      this.config = newConfig;
      return true;
    } catch (error) {
      throw new Error(`Erreur d'import: ${error.message}`);
    }
  }
}

// Instance singleton
const profileManager = new ProfileManager();

export default profileManager;