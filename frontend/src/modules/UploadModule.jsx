import React from 'react';
import BaseModule from './BaseModule';

/**
 * Module d'upload de fichiers PDF
 * Gère le téléchargement, la validation et le stockage temporaire des fichiers
 */
class UploadModule extends BaseModule {
  constructor(props) {
    super(props);
    
    this.state = {
      ...this.state,
      isDragActive: false,
      uploadedFile: null,
      uploadProgress: 0
    };
    
    this.fileInputRef = React.createRef();
  }

  static defaultConfig = {
    maxFileSize: '50MB',
    allowedTypes: ['.pdf'],
    multipleFiles: false
  };

  initialize(config) {
    this.config = { ...UploadModule.defaultConfig, ...config };
  }

  validateInput(file) {
    const errors = [];

    // Vérifier le type de fichier
    if (!file.type.includes('pdf')) {
      errors.push('Seuls les fichiers PDF sont autorisés');
    }

    // Vérifier la taille
    const maxSize = this.parseFileSize(this.config.maxFileSize);
    if (file.size > maxSize) {
      errors.push(`Le fichier dépasse la taille maximale autorisée (${this.config.maxFileSize})`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async process(file) {
    try {
      this.setLoading(true);

      // Simuler le processus d'upload avec progression
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        this.setState({ uploadProgress: progress });
      }

      // Créer l'URL d'objet pour le fichier
      const fileUrl = URL.createObjectURL(file);
      
      const fileData = {
        file,
        filename: file.name,
        originalName: file.name,
        size: file.size,
        type: file.type,
        url: fileUrl,
        uploadedAt: new Date().toISOString()
      };

      this.setState({ uploadedFile: fileData });
      this.setData(fileData);

    } catch (error) {
      this.setError(error);
    }
  }

  parseFileSize(sizeStr) {
    const units = { 'KB': 1024, 'MB': 1024 * 1024, 'GB': 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+)\s*([A-Z]+)$/i);
    if (!match) return 0;
    
    const [, size, unit] = match;
    return parseInt(size) * (units[unit.toUpperCase()] || 1);
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Gestionnaires d'événements
  handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  };

  handleFile = (file) => {
    const validation = this.validateInput(file);
    
    if (!validation.valid) {
      this.setError(validation.errors.join(', '));
      return;
    }

    this.process(file);
  };

  handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragActive: true });
  };

  handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragActive: false });
  };

  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragActive: false });

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      this.handleFile(files[0]);
    }
  };

  handleRemoveFile = () => {
    if (this.state.uploadedFile?.url) {
      URL.revokeObjectURL(this.state.uploadedFile.url);
    }
    
    this.setState({ 
      uploadedFile: null,
      uploadProgress: 0 
    });
    this.reset();
    
    // Réinitialiser l'input file
    if (this.fileInputRef.current) {
      this.fileInputRef.current.value = '';
    }
  };

  handleSelectFile = () => {
    this.fileInputRef.current?.click();
  };

  cleanup() {
    if (this.state.uploadedFile?.url) {
      URL.revokeObjectURL(this.state.uploadedFile.url);
    }
  }

  renderContent() {
    if (this.state.uploadedFile) {
      return this.renderUploadedFile();
    }

    return this.renderDropZone();
  }

  renderDropZone() {
    const { isDragActive } = this.state;

    return (
      <div className="space-y-6">
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={this.handleDragEnter}
          onDragLeave={this.handleDragLeave}
          onDragOver={this.handleDragOver}
          onDrop={this.handleDrop}
        >
          <input
            ref={this.fileInputRef}
            type="file"
            accept=".pdf"
            onChange={this.handleFileSelect}
            className="hidden"
          />

          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          <div className="mt-4">
            <p className="text-lg font-medium text-gray-900">
              {isDragActive ? 'Déposez votre fichier ici' : 'Glissez-déposez votre fichier PDF'}
            </p>
            <p className="text-sm text-gray-500 mt-2">
              ou{' '}
              <button
                onClick={this.handleSelectFile}
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                parcourez vos fichiers
              </button>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              PDF uniquement, taille maximum {this.config.maxFileSize}
            </p>
          </div>
        </div>

        {this.state.isLoading && (
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Upload en cours...</span>
              <span className="text-sm text-gray-500">{this.state.uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${this.state.uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
      </div>
    );
  }

  renderUploadedFile() {
    const { uploadedFile } = this.state;

    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <div className="ml-4 flex-1">
            <h3 className="text-sm font-medium text-green-800">
              Fichier téléchargé avec succès
            </h3>
            
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-green-700 font-medium">{uploadedFile.originalName}</span>
                <button
                  onClick={this.handleRemoveFile}
                  className="text-sm text-green-600 hover:text-green-500 font-medium"
                >
                  Supprimer
                </button>
              </div>
              
              <div className="text-xs text-green-600">
                <span>Taille: {this.formatFileSize(uploadedFile.size)}</span>
                <span className="ml-4">Type: {uploadedFile.type}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  renderFooterActions() {
    if (!this.state.isCompleted) return null;

    return (
      <button
        onClick={this.handleRemoveFile}
        className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
      >
        Changer de fichier
      </button>
    );
  }
}

export default UploadModule;