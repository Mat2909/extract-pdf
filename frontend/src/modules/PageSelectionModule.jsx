import React from 'react';
import BaseModule from './BaseModule';
import * as pdfjsLib from 'pdfjs-dist';

/**
 * Module de sélection de pages
 * Permet de choisir quelles pages traiter via des vignettes
 */
class PageSelectionModule extends BaseModule {
  constructor(props) {
    super(props);
    
    this.state = {
      ...this.state,
      thumbnails: [],
      selectedPages: [],
      thumbnailsLoading: false,
      pdfDocument: null,
      totalPages: 0
    };
  }

  static defaultConfig = {
    thumbnailMode: true,
    selectAll: true,
    gridColumns: 10
  };

  initialize(config) {
    this.config = { ...PageSelectionModule.defaultConfig, ...config };
    
    // Configurer PDF.js worker
    this.configurePDFWorker();
    
    // Charger le PDF depuis les données du workflow
    this.loadPDFFromWorkflow();
  }

  configurePDFWorker() {
    const localWorkerPath = '/pdf.worker.js';
    const cdnWorkerPath = 'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
    
    if (import.meta.env.PROD) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = localWorkerPath;
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = cdnWorkerPath;
    }
  }

  async loadPDFFromWorkflow() {
    try {
      // Récupérer les données du module upload
      const uploadData = this.props.workflowData?.upload;
      if (!uploadData?.url) {
        this.setError('Aucun fichier PDF trouvé. Veuillez d\'abord uploader un fichier.');
        return;
      }

      this.setLoading(true);
      
      const pdf = await pdfjsLib.getDocument(uploadData.url).promise;
      this.setState({ 
        pdfDocument: pdf,
        totalPages: pdf.numPages 
      });

      // Sélectionner toutes les pages par défaut si configuré
      if (this.config.selectAll) {
        const allPages = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
        this.setState({ selectedPages: allPages });
      }

      // Générer les vignettes
      await this.generateThumbnails(pdf);
      
      // Marquer comme terminé si des pages sont sélectionnées
      if (this.state.selectedPages.length > 0) {
        this.setData({
          selectedPages: this.state.selectedPages,
          totalPages: pdf.numPages
        });
      } else {
        this.setLoading(false);
      }

    } catch (error) {
      this.setError(`Erreur lors du chargement du PDF: ${error.message}`);
    }
  }

  async generateThumbnails(pdf) {
    try {
      this.setState({ thumbnailsLoading: true });
      const thumbs = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 0.5 });
        
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        thumbs.push({
          pageNum,
          dataUrl: canvas.toDataURL(),
          width: viewport.width,
          height: viewport.height
        });
      }
      
      this.setState({ 
        thumbnails: thumbs,
        thumbnailsLoading: false 
      });
      
    } catch (error) {
      this.setState({ thumbnailsLoading: false });
      this.setError(`Erreur lors de la génération des vignettes: ${error.message}`);
    }
  }

  validateInput(selectedPages) {
    const errors = [];

    if (!selectedPages || selectedPages.length === 0) {
      errors.push('Veuillez sélectionner au moins une page');
    }

    if (selectedPages.some(page => page < 1 || page > this.state.totalPages)) {
      errors.push('Numéros de page invalides');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async process(selectedPages) {
    const validation = this.validateInput(selectedPages);
    
    if (!validation.valid) {
      this.setError(validation.errors.join(', '));
      return;
    }

    this.setData({
      selectedPages: selectedPages.sort((a, b) => a - b),
      totalPages: this.state.totalPages
    });
  }

  // Gestionnaires d'événements
  handlePageToggle = (pageNum) => {
    const { selectedPages } = this.state;
    const newSelectedPages = selectedPages.includes(pageNum)
      ? selectedPages.filter(p => p !== pageNum)
      : [...selectedPages, pageNum].sort((a, b) => a - b);

    this.setState({ selectedPages: newSelectedPages });

    // Mettre à jour automatiquement les données
    if (newSelectedPages.length > 0) {
      this.process(newSelectedPages);
    } else {
      this.reset();
    }
  };

  handleSelectAll = () => {
    const allPages = Array.from({ length: this.state.totalPages }, (_, i) => i + 1);
    this.setState({ selectedPages: allPages });
    this.process(allPages);
  };

  handleSelectNone = () => {
    this.setState({ selectedPages: [] });
    this.reset();
  };

  renderContent() {
    const { thumbnails, selectedPages, thumbnailsLoading, totalPages } = this.state;

    if (thumbnailsLoading) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Génération des vignettes...</p>
        </div>
      );
    }

    if (thumbnails.length === 0) {
      return (
        <div className="text-center py-12">
          <p className="text-gray-500">Aucune vignette disponible</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Contrôles de sélection */}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">
              {selectedPages.length} sur {totalPages} pages sélectionnées
            </span>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={this.handleSelectAll}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              Tout sélectionner
            </button>
            <button
              onClick={this.handleSelectNone}
              className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
            >
              Tout désélectionner
            </button>
          </div>
        </div>

        {/* Grille de vignettes */}
        <div className={`grid gap-2 grid-cols-${this.config.gridColumns}`}>
          {thumbnails.map((thumb) => (
            <div
              key={thumb.pageNum}
              onClick={() => this.handlePageToggle(thumb.pageNum)}
              className={`relative cursor-pointer rounded-lg border-2 transition-all duration-200 overflow-hidden ${
                selectedPages.includes(thumb.pageNum)
                  ? 'border-blue-500 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-gray-400 hover:shadow-md'
              }`}
              style={{ 
                aspectRatio: '3/4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={thumb.dataUrl}
                  alt={`Page ${thumb.pageNum}`}
                  className="rounded-md"
                  style={{ 
                    maxWidth: '90%',
                    maxHeight: '80%',
                    objectFit: 'contain'
                  }}
                />
                
                {/* Checkbox de sélection */}
                <div style={{ 
                  position: 'absolute',
                  bottom: '4px',
                  right: '4px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: selectedPages.includes(thumb.pageNum) ? '#3b82f6' : 'white',
                  border: `2px solid ${selectedPages.includes(thumb.pageNum) ? '#1d4ed8' : '#9ca3af'}`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  color: selectedPages.includes(thumb.pageNum) ? 'white' : '#6b7280',
                  zIndex: 10,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}>
                  {selectedPages.includes(thumb.pageNum) ? '✓' : ''}
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs text-center py-1 rounded-b-md">
                Page {thumb.pageNum}
              </div>
            </div>
          ))}
        </div>
        
        {selectedPages.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>{selectedPages.length} page(s) sélectionnée(s)</strong> pour le traitement
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Pages: {selectedPages.join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  renderHeaderActions() {
    const { selectedPages, totalPages } = this.state;
    
    return (
      <div className="text-sm text-gray-500">
        {selectedPages.length} / {totalPages} pages
      </div>
    );
  }
}

export default PageSelectionModule;