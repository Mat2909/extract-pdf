import React from 'react';
import PropTypes from 'prop-types';

/**
 * Module de base abstrait pour tous les modules de l'application
 * Fournit une interface commune et des fonctionnalités partagées
 */
class BaseModule extends React.Component {
  constructor(props) {
    super(props);
    
    this.state = {
      isLoading: false,
      error: null,
      data: null,
      isCompleted: false
    };
  }

  /**
   * Configuration par défaut du module
   * À surcharger dans les modules enfants
   */
  static defaultConfig = {};

  /**
   * Méthodes à implémenter dans les modules enfants
   */
  
  /**
   * Initialise le module avec sa configuration
   */
  initialize(config) {
    throw new Error('La méthode initialize() doit être implémentée');
  }

  /**
   * Valide les données d'entrée du module
   */
  validateInput(input) {
    throw new Error('La méthode validateInput() doit être implémentée');
  }

  /**
   * Traite les données du module
   */
  async process(input) {
    throw new Error('La méthode process() doit être implémentée');
  }

  /**
   * Nettoie les ressources du module
   */
  cleanup() {
    // Implémentation optionnelle
  }

  /**
   * Méthodes communes
   */

  /**
   * Définit l'état de chargement
   */
  setLoading(isLoading) {
    this.setState({ isLoading });
  }

  /**
   * Définit une erreur
   */
  setError(error) {
    this.setState({ 
      error: error instanceof Error ? error.message : error,
      isLoading: false 
    });
  }

  /**
   * Définit les données de résultat
   */
  setData(data) {
    this.setState({ 
      data,
      error: null,
      isCompleted: true,
      isLoading: false 
    });
  }

  /**
   * Réinitialise l'état du module
   */
  reset() {
    this.setState({
      isLoading: false,
      error: null,
      data: null,
      isCompleted: false
    });
  }

  /**
   * Vérifie si le module peut être activé
   */
  canActivate() {
    return true;
  }

  /**
   * Méthodes du cycle de vie React
   */
  
  componentDidMount() {
    if (this.props.config) {
      this.initialize(this.props.config);
    }
  }

  componentDidUpdate(prevProps) {
    // Auto-traitement quand workflowData change et module pas encore complété
    if (this.props.workflowData !== prevProps.workflowData && 
        this.props.workflowData && 
        !this.state.isCompleted &&
        !this.state.isLoading) {
      console.log(`🔄 ${this.constructor.name}: WorkflowData mis à jour, auto-traitement...`);
      setTimeout(() => this.process(this.props.workflowData), 100);
    }
  }

  componentWillUnmount() {
    this.cleanup();
  }

  /**
   * Gestionnaires d'événements communs
   */
  
  handleNext = () => {
    if (this.state.isCompleted && this.props.onNext) {
      this.props.onNext(this.state.data);
    }
  };

  handlePrevious = () => {
    if (this.props.onPrevious) {
      this.props.onPrevious();
    }
  };

  handleSkip = () => {
    if (this.props.onSkip) {
      this.props.onSkip();
    }
  };

  /**
   * Rendu des éléments communs
   */
  
  renderHeader() {
    const { module } = this.props;
    return (
      <div className="module-header bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{module.name}</h2>
            <p className="text-sm text-gray-600 mt-1">{module.description}</p>
          </div>
          {this.renderHeaderActions()}
        </div>
      </div>
    );
  }

  renderHeaderActions() {
    return null; // À surcharger si nécessaire
  }

  renderError() {
    if (!this.state.error) return null;

    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Erreur</h3>
            <div className="mt-2 text-sm text-red-700">
              {this.state.error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderLoading() {
    if (!this.state.isLoading) return null;

    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Traitement en cours...</span>
      </div>
    );
  }

  renderFooter() {
    const { showNavigation = true, isFirst = false, isLast = false } = this.props;
    
    if (!showNavigation) return null;

    return (
      <div className="module-footer bg-gray-50 border-t border-gray-200 px-6 py-4">
        <div className="flex justify-between">
          <div>
            {!isFirst && (
              <button
                onClick={this.handlePrevious}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Précédent
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {this.renderFooterActions()}
            
            {!this.state.isCompleted && !isLast && (
              <button
                onClick={this.handleSkip}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Ignorer
              </button>
            )}
            
            {this.state.isCompleted && !isLast && (
              <button
                onClick={this.handleNext}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Suivant
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  renderFooterActions() {
    return null; // À surcharger si nécessaire
  }

  /**
   * Rendu principal - à surcharger dans les modules enfants
   */
  renderContent() {
    throw new Error('La méthode renderContent() doit être implémentée');
  }

  render() {
    return (
      <div className="module-container bg-white rounded-lg shadow-sm border border-gray-200">
        {this.renderHeader()}
        
        <div className="module-content p-6">
          {this.renderError()}
          {this.renderLoading()}
          {!this.state.isLoading && this.renderContent()}
        </div>
        
        {this.renderFooter()}
      </div>
    );
  }
}

BaseModule.propTypes = {
  module: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    description: PropTypes.string,
    config: PropTypes.object
  }).isRequired,
  config: PropTypes.object,
  onNext: PropTypes.func,
  onPrevious: PropTypes.func,
  onSkip: PropTypes.func,
  showNavigation: PropTypes.bool,
  isFirst: PropTypes.bool,
  isLast: PropTypes.bool
};

export default BaseModule;