import appConfig from '../data/appConfig.json';

/**
 * Gestionnaire d'authentification
 * Gère la connexion, déconnexion et les sessions utilisateur
 */
class AuthManager {
  constructor() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.sessionKey = 'pdfocr_session';
    
    // Vérifier si une session existe au chargement
    this.loadSession();
  }

  /**
   * Authentification d'un utilisateur
   */
  authenticate(username, password) {
    // Chercher l'utilisateur dans la configuration
    const user = Object.values(appConfig.users).find(u => 
      u.username === username && u.password === password
    );

    if (user) {
      this.currentUser = {
        ...user,
        // Ne pas stocker le mot de passe dans la session
        password: undefined
      };
      this.isAuthenticated = true;
      
      // Sauvegarder la session
      this.saveSession();
      
      return {
        success: true,
        user: this.currentUser
      };
    }

    return {
      success: false,
      error: 'Nom d\'utilisateur ou mot de passe incorrect'
    };
  }

  /**
   * Déconnexion
   */
  logout() {
    this.currentUser = null;
    this.isAuthenticated = false;
    this.clearSession();
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isLoggedIn() {
    return this.isAuthenticated && this.currentUser !== null;
  }

  /**
   * Vérifier si l'utilisateur est administrateur
   */
  isAdmin() {
    return this.currentUser?.role === 'administrator';
  }

  /**
   * Vérifier une permission spécifique
   */
  hasPermission(permission) {
    if (!this.currentUser) return false;
    return this.currentUser.permissions?.includes(permission) || false;
  }

  /**
   * Obtenir le nom d'affichage de l'utilisateur
   */
  getDisplayName() {
    if (!this.currentUser) return '';
    return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
  }

  /**
   * Sauvegarder la session dans le localStorage
   */
  saveSession() {
    if (this.currentUser) {
      const sessionData = {
        user: this.currentUser,
        timestamp: Date.now(),
        expiresAt: Date.now() + (appConfig.settings?.sessionTimeout || 3600) * 1000
      };
      
      localStorage.setItem(this.sessionKey, JSON.stringify(sessionData));
    }
  }

  /**
   * Charger la session depuis le localStorage
   */
  loadSession() {
    try {
      const sessionData = localStorage.getItem(this.sessionKey);
      if (!sessionData) return false;

      const session = JSON.parse(sessionData);
      
      // Vérifier si la session n'a pas expiré
      if (session.expiresAt && Date.now() > session.expiresAt) {
        this.clearSession();
        return false;
      }

      // Vérifier que l'utilisateur existe encore dans la configuration
      const userExists = Object.values(appConfig.users).find(u => 
        u.id === session.user?.id
      );

      if (userExists) {
        this.currentUser = session.user;
        this.isAuthenticated = true;
        return true;
      } else {
        this.clearSession();
        return false;
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la session:', error);
      this.clearSession();
      return false;
    }
  }

  /**
   * Effacer la session
   */
  clearSession() {
    localStorage.removeItem(this.sessionKey);
  }

  /**
   * Rafraîchir la session (prolonger l'expiration)
   */
  refreshSession() {
    if (this.isAuthenticated) {
      this.saveSession();
    }
  }

  /**
   * Obtenir les utilisateurs disponibles (admin seulement)
   */
  getUsers() {
    if (!this.hasPermission('view_all_data')) {
      throw new Error('Permission insuffisante');
    }
    
    return Object.values(appConfig.users).map(user => ({
      ...user,
      password: undefined // Ne jamais exposer les mots de passe
    }));
  }

  /**
   * Créer un nouvel utilisateur (admin seulement)
   */
  createUser(userData) {
    if (!this.hasPermission('create_profiles')) {
      throw new Error('Permission insuffisante pour créer un utilisateur');
    }

    const userId = userData.username.toLowerCase().replace(/\s+/g, '');
    
    if (appConfig.users[userId]) {
      throw new Error('Un utilisateur avec ce nom existe déjà');
    }

    const newUser = {
      id: userId,
      username: userData.username,
      password: userData.password,
      role: userData.role || 'user',
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      permissions: userData.role === 'administrator' ? [
        'create_profiles',
        'edit_profiles', 
        'delete_profiles',
        'manage_modules',
        'view_all_data'
      ] : [
        'use_profiles',
        'export_data',
        'view_own_data'
      ]
    };

    appConfig.users[userId] = newUser;
    return userId;
  }

  /**
   * Modifier un utilisateur (admin seulement)
   */
  updateUser(userId, updates) {
    if (!this.hasPermission('edit_profiles')) {
      throw new Error('Permission insuffisante pour modifier un utilisateur');
    }

    if (!appConfig.users[userId]) {
      throw new Error('Utilisateur inexistant');
    }

    appConfig.users[userId] = {
      ...appConfig.users[userId],
      ...updates
    };

    return true;
  }

  /**
   * Supprimer un utilisateur (admin seulement)
   */
  deleteUser(userId) {
    if (!this.hasPermission('delete_profiles')) {
      throw new Error('Permission insuffisante pour supprimer un utilisateur');
    }

    if (!appConfig.users[userId]) {
      throw new Error('Utilisateur inexistant');
    }

    if (userId === this.currentUser?.id) {
      throw new Error('Impossible de supprimer votre propre compte');
    }

    delete appConfig.users[userId];
    return true;
  }

  /**
   * Valider les données d'un utilisateur
   */
  validateUserData(userData) {
    const errors = [];

    if (!userData.username || userData.username.trim().length < 2) {
      errors.push('Le nom d\'utilisateur doit contenir au moins 2 caractères');
    }

    if (!userData.password || userData.password.length < 4) {
      errors.push('Le mot de passe doit contenir au moins 4 caractères');
    }

    if (!userData.firstName || userData.firstName.trim().length < 2) {
      errors.push('Le prénom est requis');
    }

    if (!userData.lastName || userData.lastName.trim().length < 2) {
      errors.push('Le nom est requis');
    }

    if (userData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('Format d\'email invalide');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Instance singleton
const authManager = new AuthManager();

export default authManager;