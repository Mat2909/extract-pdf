import React from 'react';
import BaseModule from './BaseModule';
import * as XLSX from 'xlsx';

/**
 * Module d'export des données
 * Génère et télécharge les fichiers de résultats dans différents formats
 */
class ExportModule extends BaseModule {
  constructor(props) {
    super(props);
    
    this.state = {
      ...this.state,
      exportFormat: 'xlsx',
      exportData: null,
      isExporting: false,
      exportHistory: []
    };
  }

  static defaultConfig = {
    formats: ['xlsx', 'csv', 'json'],
    defaultFormat: 'xlsx',
    includeMetadata: true,
    customColumns: false
  };

  initialize(config) {
    this.config = { ...ExportModule.defaultConfig, ...config };
    this.setState({ exportFormat: this.config.defaultFormat });
    
    // Préparer les données d'export automatiquement
    this.prepareExportData();
  }

  prepareExportData() {
    try {
      const workflowData = this.props.workflowData || {};
      const ocrData = workflowData['ocr-processing'];
      const uploadData = workflowData.upload;
      
      if (!ocrData?.results) {
        this.setError('Aucune donnée OCR trouvée à exporter');
        return;
      }

      const exportData = this.formatDataForExport(ocrData.results, uploadData);
      this.setState({ exportData });
      
      // Marquer automatiquement comme terminé
      this.setData({
        exportData: exportData,
        format: this.state.exportFormat,
        totalRows: exportData.length
      });

    } catch (error) {
      this.setError(`Erreur lors de la préparation des données: ${error.message}`);
    }
  }

  formatDataForExport(ocrResults, uploadData) {
    const pdfName = uploadData?.originalName ? 
      uploadData.originalName.replace('.pdf', '') : 
      'document';

    return ocrResults.map(result => {
      const baseData = {
        page_name: `${pdfName}_${result.page}`,
        page_number: result.page,
        text_content: result.text,
        confidence: result.confidence
      };

      // Ajouter des métadonnées si configuré
      if (this.config.includeMetadata) {
        baseData.processed_at = new Date().toISOString();
        baseData.ocr_engine = this.config.engine || 'ocr.space';
      }

      return baseData;
    });
  }

  validateInput(workflowData) {
    const errors = [];

    const ocrData = workflowData?.['ocr-processing'];
    if (!ocrData?.results || ocrData.results.length === 0) {
      errors.push('Aucune donnée OCR disponible pour l\'export');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  async process(exportFormat = this.state.exportFormat) {
    try {
      this.setState({ isExporting: true });
      
      const { exportData } = this.state;
      if (!exportData) {
        throw new Error('Aucune donnée à exporter');
      }

      let downloadData;
      let filename;
      let mimeType;

      switch (exportFormat) {
        case 'xlsx':
          { // Block scope pour les déclarations const
            const { data: xlsxData, filename: xlsxFilename } = this.generateXLSX(exportData);
            downloadData = xlsxData;
            filename = xlsxFilename;
            mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          }
          break;
          
        case 'csv':
          { // Block scope pour les déclarations const
            const { data: csvData, filename: csvFilename } = this.generateCSV(exportData);
            downloadData = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
            filename = csvFilename;
            mimeType = 'text/csv';
          }
          break;
          
        case 'json':
          { // Block scope pour les déclarations const
            const { data: jsonData, filename: jsonFilename } = this.generateJSON(exportData);
            downloadData = new Blob([jsonData], { type: 'application/json;charset=utf-8;' });
            filename = jsonFilename;
            mimeType = 'application/json';
          }
          break;
          
        default:
          throw new Error(`Format d'export non supporté: ${exportFormat}`);
      }

      // Déclencher le téléchargement
      this.downloadFile(downloadData, filename, mimeType);
      
      // Ajouter à l'historique
      const exportRecord = {
        format: exportFormat,
        filename: filename,
        rows: exportData.length,
        timestamp: new Date().toISOString()
      };
      
      this.setState(prevState => ({
        exportHistory: [...prevState.exportHistory, exportRecord],
        isExporting: false
      }));

      return exportRecord;

    } catch (error) {
      this.setState({ isExporting: false });
      this.setError(`Erreur lors de l'export: ${error.message}`);
      throw error;
    }
  }

  generateXLSX(data) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    XLSX.utils.book_append_sheet(wb, ws, 'Résultats OCR');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });
    
    const filename = `ocr_results_${new Date().toISOString().slice(0, 10)}.xlsx`;
    
    return { data: blob, filename };
  }

  generateCSV(data) {
    if (data.length === 0) {
      return { data: '', filename: 'empty.csv' };
    }

    // En-têtes
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          // Échapper les guillemets et encapsuler si nécessaire
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const filename = `ocr_results_${new Date().toISOString().slice(0, 10)}.csv`;
    
    return { data: csvContent, filename };
  }

  generateJSON(data) {
    const jsonData = JSON.stringify({
      metadata: {
        exported_at: new Date().toISOString(),
        total_records: data.length,
        version: '2.0.0'
      },
      results: data
    }, null, 2);

    const filename = `ocr_results_${new Date().toISOString().slice(0, 10)}.json`;
    
    return { data: jsonData, filename };
  }

  downloadFile(data, filename, mimeType) {
    const url = window.URL.createObjectURL(data);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  // Gestionnaires d'événements
  handleFormatChange = (e) => {
    this.setState({ exportFormat: e.target.value });
  };

  handleExport = async () => {
    try {
      await this.process(this.state.exportFormat);
    } catch (error) {
      // L'erreur est déjà gérée dans process()
    }
  };

  handleExportFormat = async (format) => {
    try {
      await this.process(format);
    } catch (error) {
      // L'erreur est déjà gérée dans process()
    }
  };

  renderContent() {
    const { exportData, exportFormat, isExporting, exportHistory } = this.state;

    if (!exportData) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-500">Préparation des données d'export...</div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Résumé des données */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4">
            Données prêtes pour l'export
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{exportData.length}</div>
              <div className="text-blue-700">Enregistrements</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{Object.keys(exportData[0] || {}).length}</div>
              <div className="text-blue-700">Colonnes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{this.config.formats.length}</div>
              <div className="text-blue-700">Formats disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{exportHistory.length}</div>
              <div className="text-blue-700">Exports effectués</div>
            </div>
          </div>
        </div>

        {/* Sélection du format et export */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">Exporter les résultats</h3>
            
            <div className="flex items-center space-x-3">
              <label htmlFor="format-select" className="text-sm font-medium text-gray-700">
                Format:
              </label>
              <select
                id="format-select"
                value={exportFormat}
                onChange={this.handleFormatChange}
                className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isExporting}
              >
                {this.config.formats.map(format => (
                  <option key={format} value={format}>
                    {format.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Boutons d'export rapide */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {this.config.formats.map(format => (
              <button
                key={format}
                onClick={() => this.handleExportFormat(format)}
                disabled={isExporting}
                className={`p-4 border-2 border-dashed rounded-lg text-center transition-colors ${
                  isExporting 
                    ? 'border-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'border-gray-300 text-gray-700 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                <div className="text-lg font-medium">{format.toUpperCase()}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {format === 'xlsx' && 'Excel Spreadsheet'}
                  {format === 'csv' && 'Comma Separated Values'}
                  {format === 'json' && 'JavaScript Object Notation'}
                </div>
              </button>
            ))}
          </div>

          {isExporting && (
            <div className="mt-4 text-center text-sm text-gray-500">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 inline-block mr-2"></div>
              Export en cours...
            </div>
          )}
        </div>

        {/* Aperçu des données */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Aperçu des données</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(exportData[0] || {}).map(key => (
                    <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {key.replace(/_/g, ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {exportData.slice(0, 5).map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                        <div className="truncate" title={String(value)}>
                          {String(value).length > 50 ? `${String(value).substring(0, 50)}...` : String(value)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {exportData.length > 5 && (
            <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500 text-center">
              ... et {exportData.length - 5} autres enregistrements
            </div>
          )}
        </div>

        {/* Historique des exports */}
        {exportHistory.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Historique des exports</h3>
            
            <div className="space-y-2">
              {exportHistory.map((record, index) => (
                <div key={index} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {record.format.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-600">{record.filename}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {record.rows} lignes • {new Date(record.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  renderFooterActions() {
    const { isExporting, exportFormat } = this.state;

    return (
      <button
        onClick={this.handleExport}
        disabled={isExporting}
        className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
          isExporting 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
        }`}
      >
        {isExporting ? 'Export en cours...' : `Exporter en ${exportFormat.toUpperCase()}`}
      </button>
    );
  }
}

export default ExportModule;