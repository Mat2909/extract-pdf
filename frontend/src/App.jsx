import React, { useState, useEffect } from 'react';
import './App.css';
import PDFViewer from './components/PDFViewer';
import OCRProcessor from './components/OCRProcessor';
import CoordinateFormatPage from './components/CoordinateFormatPage';

function App() {
  const [selectedConcessionaire, setSelectedConcessionaire] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [uploadedPDF, setUploadedPDF] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [ocrResults, setOcrResults] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [pagesValidated, setPagesValidated] = useState(false);
  const [totalPDFPages, setTotalPDFPages] = useState(0);
  const [coordinateFormatConfigured, setCoordinateFormatConfigured] = useState(false);
  const [coordinateFormat, setCoordinateFormat] = useState(null);
  
  // Activer le debug panel avec Ctrl+D
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault();
        window.showDebugPanel = !window.showDebugPanel;
        window.location.reload(); // Force re-render
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  // Définition des concessionnaires réseau
  const concessionaires = [
    {
      id: 'grdf',
      name: 'GrDF',
      description: 'Gestionnaire du Réseau de Distribution de gaz France',
      logo: '🔥',
      color: '#0066cc'
    },
    {
      id: 'sfr',
      name: 'SFR',
      description: 'Société Française du Radiotéléphone',
      logo: '📡',
      color: '#cc0000'
    }
  ];
  
  // Définition des étapes selon le concessionnaire
  const getStepsForConcessionaire = (concessionaireId) => {
    const baseSteps = [
      { number: 0, title: 'Sélection du concessionnaire', description: 'Choisir le type de réseau' },
      { number: 1, title: 'Sélection du PDF', description: 'Choisir le fichier PDF à traiter' },
      { number: 2, title: 'Sélection des pages', description: 'Choisir les pages à analyser' },
      { number: 3, title: 'Zone d\'extraction', description: 'Définir la zone de coordonnées' },
      { number: 4, title: 'Format coordonnées', description: 'Configurer le format de coordonnées' },
      { number: 5, title: 'Validation des données', description: 'Contrôler les valeurs extraites' },
      { number: 6, title: 'Extraction Excel', description: 'Génération du fichier final' }
    ];
    
    // Personnalisation selon le concessionnaire
    if (concessionaireId === 'grdf') {
      baseSteps[3].description = 'Définir la zone de coordonnées GrDF';
      baseSteps[4].description = 'Format coordonnées Lambert';
    } else if (concessionaireId === 'sfr') {
      baseSteps[3].description = 'Définir la zone de lecture SFR';
      baseSteps[4].description = 'Format coordonnées GPS';
    }
    
    return baseSteps;
  };
  
  const steps = selectedConcessionaire ? getStepsForConcessionaire(selectedConcessionaire.id) : [
    { number: 0, title: 'Sélection du concessionnaire', description: 'Choisir le type de réseau' }
  ];

  const handleConcessionaireSelect = (concessionaire) => {
    setSelectedConcessionaire(concessionaire);
    setCurrentStep(1);
    setMessage('');
    setErrorMessage(null);
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      // ✅ Validation taille fichier (6MB max - limite Vercel)
      const maxSize = 6 * 1024 * 1024; // 6MB
      if (file.size > maxSize) {
        setErrorMessage(
          <div style={{textAlign: 'left'}}>
            <div>Fichier trop volumineux :</div>
            <div>{(file.size / 1024 / 1024).toFixed(2)}MB / 6MB</div>
            <br/>
            <div>Sélection des seules pages à traiter ou upload d'un pdf plus léger si possible.</div>
            <br/>
            <div>Solution pour les gros fichiers :</div>
            <div>- Compression du PDF :</div>
            <a href="https://www.ilovepdf.com/fr/compresser_pdf" target="_blank" rel="noopener noreferrer">
              https://www.ilovepdf.com/fr/compresser_pdf
            </a>
            <br/>
            <div>- Division du PDF :</div>
            <a href="https://www.ilovepdf.com/fr/diviser_pdf" target="_blank" rel="noopener noreferrer">
              https://www.ilovepdf.com/fr/diviser_pdf
            </a>
          </div>
        );
        setMessage('');
        setSelectedFile(null);
        return;
      }
      
      setSelectedFile(file);
      setMessage('');
      setErrorMessage(null);
      console.log(`📁 PDF sélectionné: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      setMessage('Veuillez sélectionner un fichier PDF valide');
      setErrorMessage(null);
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setMessage('Upload en cours...');

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
      console.log('🚀 Tentative upload vers /api/upload');
      console.log('📄 Fichier:', selectedFile.name, selectedFile.size, 'bytes');
      console.log('🌍 Environment:', import.meta.env.MODE);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Réponse upload:', response.status, response.statusText);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Upload réussi:', result);
        handleFileUploadSuccess(result);
      } else {
        const errorText = await response.text();
        console.error('❌ Erreur upload:', response.status, errorText);
        setMessage(`Erreur ${response.status}: ${errorText || 'Erreur lors de l\'upload'}`);
        
        // Debug supplémentaire pour Vercel
        if (response.status === 404) {
          setMessage(`Erreur 404: L'API d'upload n'est pas accessible. Vérifiez la configuration Vercel.`);
        }
      }
    } catch (error) {
      console.error('❌ Erreur réseau upload:', error);
      setMessage(`Erreur de connexion: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAreaSelect = (area) => {
    handleAreaSelected(area);
    if (area) {
      console.log('Zone sélectionnée:', area);
    }
  };

  const handleOCRComplete = (results) => {
    setOcrResults(results);
    console.log('OCR terminé, résultats:', results);
  };

  const handlePagesChange = (pages) => {
    setSelectedPages(pages);
    console.log('Pages sélectionnées:', pages);
  };
  
  const resetApp = () => {
    setSelectedFile(null);
    setUploading(false);
    setMessage('');
    setUploadedPDF(null);
    setSelectedArea(null);
    setExtractedText('');
    setOcrResults([]);
    setSelectedPages([]);
    setCurrentStep(1);
    setPagesValidated(false);
    setTotalPDFPages(0);
    setCoordinateFormatConfigured(false);
    setCoordinateFormat(null);
    
    // Réinitialiser aussi le input file
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
    
    console.log('Application réinitialisée');
  };
  
  const selectAllPages = () => {
    // Cette fonction sera appelée depuis PDFViewer via une prop
    setPagesValidated(true);
    setCurrentStep(3);
  };
  
  const handleFileUploadSuccess = (result) => {
    setMessage('PDF uploadé avec succès !');
    
    try {
      console.log('🔍 Processing uploaded PDF result:', result);
      
      // Toujours traiter en base64
      const base64Data = result.file.data;
      console.log('📊 Base64 data length:', base64Data ? base64Data.length : 'undefined');
      
      if (!base64Data) {
        throw new Error('Aucune donnée base64 reçue du serveur');
      }
      
      const binaryString = atob(base64Data);
      console.log('📊 Binary string length:', binaryString.length);
      
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: 'application/pdf' });
      console.log('📊 Blob created, size:', blob.size);
      
      const pdfUrl = URL.createObjectURL(blob);
      console.log('📊 PDF URL created:', pdfUrl);
      
      setUploadedPDF({
        ...result.file,
        path: pdfUrl
      });
      setCurrentStep(2);
      console.log('✅ PDF ready for display');
    } catch (error) {
      console.error('❌ Erreur conversion PDF:', error);
      setMessage('Erreur lors du traitement du PDF: ' + error.message);
    }
  };
  
  const handleAreaSelected = (area) => {
    setSelectedArea(area);
    // Ne plus avancer automatiquement à l'étape 4
    // L'utilisateur devra cliquer sur "Valider cette zone" pour continuer
  };
  
  const handleCoordinateFormatConfigured = (formatConfig) => {
    console.log('🎯 Configuration format coordonnées reçue:', formatConfig);
    
    // Stocker localement
    setCoordinateFormat(formatConfig);
    setCoordinateFormatConfigured(true);
    
    // 🚀 STOCKER GLOBALEMENT pour TesseractOCR
    window.currentCoordinateFormat = formatConfig;
    console.log('✅ Format stocké globalement pour OCR intelligent');
    
    setCurrentStep(5); // Passer à l'étape OCR
  };
  
  const handleOCRStart = () => {
    setCurrentStep(5);
  };
  
  const handleExcelGeneration = () => {
    setCurrentStep(6);
  };

  // Composant pour la barre de progression
  const ProgressBar = () => (
    <div className="progress-container" style={{
      maxWidth: '800px',
      margin: '0 auto 20px',
      padding: '0 20px',
      backgroundColor: 'white',
      borderBottom: '1px solid #dee2e6',
      paddingBottom: '20px'
    }}>
      <div className="progress-bar" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px'
      }}>
        {steps.map((step, index) => (
          <div key={step.number} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            <div 
              className={`step-circle ${currentStep >= step.number ? 'active' : ''}`}
              onClick={() => {
                // Permettre de cliquer sur les étapes précédentes uniquement
                if (step.number < currentStep) {
                  setCurrentStep(step.number);
                }
              }}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: currentStep >= step.number ? '#28a745' : '#dee2e6',
                color: currentStep >= step.number ? 'white' : '#6c757d',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: step.number < currentStep ? 'pointer' : 'default'
              }}
            >
              {currentStep > step.number ? '✓' : step.number}
            </div>
            {index < steps.length - 1 && (
              <div 
                className="step-line"
                style={{
                  flex: 1,
                  height: '2px',
                  backgroundColor: currentStep > step.number ? '#28a745' : '#dee2e6',
                  margin: '0 10px'
                }}
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="step-labels" style={{
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        {steps.map((step) => (
          <div 
            key={step.number} 
            className="step-label"
            style={{
              textAlign: 'center',
              fontSize: '12px',
              color: currentStep >= step.number ? '#28a745' : '#6c757d',
              fontWeight: currentStep === step.number ? 'bold' : 'normal',
              maxWidth: '140px'
            }}
          >
            <div>{step.title}</div>
            <div style={{ fontSize: '10px', marginTop: '2px' }}>{step.description}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="App">
      {/* Debug Panel - Affiché seulement en développement ou si CTRL+D pressé */}
      {(import.meta.env.DEV || window.showDebugPanel) && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          padding: '10px',
          zIndex: 9999,
          fontSize: '12px',
          minWidth: '200px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>🔧 Debug Panel</h4>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/test');
                const result = await response.json();
                alert(`Test API: ${JSON.stringify(result, null, 2)}`);
              } catch (error) {
                alert(`Erreur test API: ${error.message}`);
              }
            }}
            style={{
              backgroundColor: '#17a2b8',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              marginBottom: '5px',
              width: '100%'
            }}
          >
            Test API
          </button>
          <button
            onClick={async () => {
              try {
                const response = await fetch('/api/health');
                const result = await response.json();
                alert(`Health: ${JSON.stringify(result, null, 2)}`);
              } catch (error) {
                alert(`Erreur health: ${error.message}`);
              }
            }}
            style={{
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              padding: '5px 10px',
              borderRadius: '3px',
              cursor: 'pointer',
              width: '100%'
            }}
          >
            Health Check
          </button>
        </div>
      )}

      
      {/* Contenu des pages par étapes */}
      <div className="page-content min-h-[calc(100vh-80px)] pb-16">
        
        {/* Étape 0 : Sélection du concessionnaire */}
        {currentStep === 0 && (
          <>
            <style>
              {`
                @keyframes spin {
                  from { transform: rotate(0deg); }
                  to { transform: rotate(360deg); }
                }
              `}
            </style>
            <section style={{ 
              backgroundColor: '#f9fafb', 
              fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
              minHeight: 'calc(100vh - 140px)'
            }}>
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px 24px',
                margin: '0 auto',
                minHeight: 'calc(100vh - 140px)'
              }}>
                {/* Logo et titre */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: '24px',
                  fontSize: '24px',
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    marginRight: '8px',
                    backgroundColor: '#dc2626',
                    borderRadius: '8px'
                  }}>
                    <svg style={{ width: '20px', height: '20px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  PDF Extract
                </div>
                
                {/* Carte de sélection */}
                <div style={{
                  width: '100%',
                  maxWidth: '448px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ padding: '32px' }}>
                    <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl">
                      Sélection du concessionnaire
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', marginTop: '8px' }}>
                      Choisissez votre gestionnaire de réseau
                    </p>
                    
                    {/* Menu déroulant */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="concessionaire" style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827' 
                      }}>
                        Concessionnaire réseau
                      </label>
                      <select
                        id="concessionaire"
                        value={selectedConcessionaire?.id || ''}
                        onChange={(e) => {
                          const concessionaire = concessionaires.find(c => c.id === e.target.value);
                          if (concessionaire) setSelectedConcessionaire(concessionaire);
                        }}
                        style={{
                          backgroundColor: '#f9fafb',
                          border: '1px solid #d1d5db',
                          color: '#111827',
                          borderRadius: '8px',
                          display: 'block',
                          width: '100%',
                          padding: '10px',
                          fontSize: '14px',
                          boxSizing: 'border-box',
                          appearance: 'none',
                          backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                          backgroundPosition: 'right 12px center',
                          backgroundRepeat: 'no-repeat',
                          backgroundSize: '16px',
                          paddingRight: '40px'
                        }}
                      >
                        <option value="">Sélectionnez un concessionnaire...</option>
                        {concessionaires.map((concessionaire) => (
                          <option key={concessionaire.id} value={concessionaire.id}>
                            {concessionaire.logo} {concessionaire.name} - {concessionaire.description}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Aperçu du concessionnaire sélectionné */}
                    {selectedConcessionaire && (
                      <div 
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: '2px solid',
                          borderColor: selectedConcessionaire.color,
                          backgroundColor: '#f9fafb',
                          textAlign: 'center',
                          marginBottom: '20px'
                        }}
                      >
                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>{selectedConcessionaire.logo}</div>
                        <h3 style={{ 
                          fontWeight: 'bold', 
                          fontSize: '18px', 
                          marginBottom: '4px',
                          color: selectedConcessionaire.color 
                        }}>
                          {selectedConcessionaire.name}
                        </h3>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                          {selectedConcessionaire.description}
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={() => {
                        if (selectedConcessionaire) {
                          handleConcessionaireSelect(selectedConcessionaire);
                        }
                      }}
                      disabled={!selectedConcessionaire}
                      style={{
                        width: '100%',
                        color: 'white',
                        backgroundColor: selectedConcessionaire ? '#dc2626' : '#d1d5db',
                        fontWeight: '500',
                        borderRadius: '8px',
                        fontSize: '14px',
                        padding: '10px 20px',
                        textAlign: 'center',
                        border: 'none',
                        cursor: selectedConcessionaire ? 'pointer' : 'not-allowed',
                        opacity: selectedConcessionaire ? '1' : '0.5',
                        transition: 'all 0.15s ease-in-out'
                      }}
                      onMouseOver={(e) => {
                        if (selectedConcessionaire) {
                          e.target.style.backgroundColor = '#b91c1c';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedConcessionaire) {
                          e.target.style.backgroundColor = '#dc2626';
                        }
                      }}
                    >
                      {selectedConcessionaire ? `Continuer avec ${selectedConcessionaire.name}` : 'Sélectionnez un concessionnaire'}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
        
        {/* Étape 1 : Sélection du PDF */}
        {currentStep === 1 && (
          <div className="step-page">
            <div className="text-center max-w-2xl mx-auto">
              {selectedConcessionaire && (
                <div className="mb-5 p-2.5 bg-gray-50 rounded-lg border-2" style={{ borderColor: selectedConcessionaire.color }}>
                  <span className="text-xl mr-2.5">
                    {selectedConcessionaire.logo}
                  </span>
                  <strong style={{ color: selectedConcessionaire.color }}>
                    Concessionnaire sélectionné : {selectedConcessionaire.name}
                  </strong>
                </div>
              )}
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Étape 1 : Sélection du fichier PDF</h2>
              <p className="text-gray-600 mb-5">Choisissez le fichier PDF contenant les coordonnées à extraire</p>
              
              <div className="upload-section p-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 my-5">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="my-5 p-2.5 border border-gray-300 rounded text-base disabled:opacity-50"
                />
                
                {selectedFile && (
                  <div className="file-info my-5 p-4 bg-white rounded border border-green-600">
                    <p><strong>Fichier sélectionné:</strong> {selectedFile.name}</p>
                    <p><strong>Taille:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB 
                      {selectedFile.size > 3 * 1024 * 1024 && (
                        <span className="text-yellow-600 font-bold"> (Fichier volumineux)</span>
                      )}
                    </p>
                  </div>
                )}
                
                <div className="flex justify-center items-center gap-4 mt-6">
                  <button
                    onClick={() => setCurrentStep(0)}
                    className="bg-gray-600 hover:bg-gray-700 text-white border-none px-6 py-3 rounded cursor-pointer text-base"
                  >
                    ← Précédent
                  </button>
                  
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploading}
                    className={`border-none px-6 py-3 rounded text-base ${
                      !selectedFile || uploading 
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                        : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                    }`}
                  >
                    {uploading ? 'Upload en cours...' : 'Suivant →'}
                  </button>
                </div>
                
                {message && (
                  <div className={`mt-5 p-2.5 rounded ${
                    message.includes('succès') 
                      ? 'bg-green-100 text-green-800 border border-green-200' 
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    {message}
                  </div>
                )}
                
                {errorMessage && (
                  <div className="mt-5 p-2.5 rounded bg-red-100 text-red-800 border border-red-200">
                    {errorMessage}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Étape 2 : Sélection des pages */}
        {currentStep === 2 && uploadedPDF && (
          <div className="step-page">
            <div className="text-center max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Étape 2 : Sélection des pages à traiter</h2>
              <p className="text-gray-600 mb-8">Cliquez sur les pages contenant les coordonnées à extraire</p>
              
              <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200 text-center">
                <button
                  onClick={() => {
                    const allPages = totalPDFPages > 0 ? 
                      [...Array(totalPDFPages).keys()].map(i => i + 1) : 
                      [...Array(10).keys()].map(i => i + 1);
                    setSelectedPages(allPages);
                    setCurrentStep(3);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white border-none px-4 py-2 rounded cursor-pointer font-bold mb-4"
                >
                  ✓ Sélectionner toutes les pages ({totalPDFPages} pages)
                </button>
                <p className="text-gray-500 text-base">ou sélectionnez manuellement les pages ci-dessous</p>
              </div>
              
              <PDFViewer
                pdfUrl={uploadedPDF.path}
                onAreaSelect={handleAreaSelect}
                onPagesChange={handlePagesChange}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                onTotalPagesChange={setTotalPDFPages}
                selectedPages={selectedPages}
                thumbnailMode={true}
              />
              
              {/* Boutons de navigation */}
              <div className="flex justify-center items-center gap-4 mt-8">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="bg-gray-600 hover:bg-gray-700 text-white border-none px-6 py-3 rounded cursor-pointer text-base"
                >
                  ← Précédent
                </button>
                
                <button
                  onClick={() => setCurrentStep(3)}
                  disabled={selectedPages.length === 0}
                  className={`border-none px-6 py-3 rounded text-base ${
                    selectedPages.length > 0
                      ? 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  Suivant →
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Étape 3 : Zone d'extraction */}
        {currentStep === 3 && uploadedPDF && (
          <div className="step-page">
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h2>Étape 3 : Zone d'extraction</h2>
                <p>Sélectionnez la zone contenant les coordonnées sur le PDF</p>
              </div>
              
              <PDFViewer
                pdfUrl={uploadedPDF.path}
                onAreaSelect={handleAreaSelect}
                onPagesChange={handlePagesChange}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                onTotalPagesChange={setTotalPDFPages}
                selectedPages={selectedPages}
              />
              
              {/* Info zone sélectionnée (sans bouton de validation) */}
              {selectedArea && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <div style={{
                    backgroundColor: '#d4edda',
                    border: '1px solid #c3e6cb',
                    borderRadius: '4px',
                    padding: '15px',
                    marginBottom: '15px',
                    maxWidth: '600px',
                    margin: '0 auto 15px'
                  }}>
                    <h4>✅ Zone validée</h4>
                    <p>Position : X: {(selectedArea.x * 100).toFixed(1)}%, Y: {(selectedArea.y * 100).toFixed(1)}%</p>
                    <p>Dimensions : {(selectedArea.width * 100).toFixed(1)}% × {(selectedArea.height * 100).toFixed(1)}%</p>
                    <p style={{ color: '#155724', fontWeight: 'bold', marginTop: '10px' }}>
                      Passez à l'étape suivante pour configurer le format de coordonnées
                    </p>
                  </div>
                  
                  {/* Boutons de navigation */}
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="bg-gray-600 hover:bg-gray-700 text-white border-none px-6 py-3 rounded cursor-pointer text-base"
                    >
                      ← Précédent
                    </button>
                    
                    <button
                      onClick={() => setCurrentStep(4)}
                      className="bg-green-600 hover:bg-green-700 text-white border-none px-6 py-3 rounded cursor-pointer text-base"
                    >
                      Suivant →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Étape 4 : Configuration du format de coordonnées */}
        {currentStep === 4 && uploadedPDF && selectedArea && (
          <CoordinateFormatPage
            uploadedPDF={uploadedPDF}
            selectedArea={selectedArea}
            selectedPages={selectedPages}
            onFormatConfigured={handleCoordinateFormatConfigured}
            onBack={() => setCurrentStep(3)}
          />
        )}
        
        {/* Étapes 5 et 6 : OCR et Excel */}
        {currentStep >= 5 && uploadedPDF && selectedArea && coordinateFormatConfigured && (
          <div className="step-page">
            <OCRProcessor
              pdfFile={uploadedPDF}
              selectedArea={selectedArea}
              selectedPages={selectedPages}
              onComplete={handleOCRComplete}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              onOCRStart={handleOCRStart}
              onExcelGeneration={handleExcelGeneration}
              coordinateFormat={coordinateFormat}
            />
          </div>
        )}
        
      </div>

      {/* Barre de progression fine en bas */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 py-2 z-50">
        <div className="flex items-center justify-center gap-3 max-w-6xl mx-auto px-4">
          {/* Bouton Nouvelle extraction */}
          <button 
            onClick={resetApp} 
            className="bg-green-500 hover:bg-green-600 text-white border-none px-3 py-1.5 rounded text-sm transition-colors"
          >
            ↻ Nouvelle
          </button>
          
          {/* Bouton Précédent */}
          {currentStep > 0 && (
            <button 
              onClick={() => {
                const prevStep = currentStep - 1;
                setCurrentStep(prevStep);
                
                // Réinitialiser certains états selon l'étape précédente
                if (prevStep === 0) {
                  setSelectedConcessionaire(null);
                  setSelectedFile(null);
                  setMessage('');
                  setErrorMessage(null);
                } else if (prevStep === 1) {
                  setMessage('');
                } else if (prevStep === 2) {
                  setSelectedArea(null);
                } else if (prevStep === 3) {
                  // Pas de réinitialisation nécessaire
                } else if (prevStep === 4) {
                  setCoordinateFormatConfigured(false);
                  setCoordinateFormat(null);
                }
              }} 
              className="bg-gray-500 hover:bg-gray-600 text-white border-none px-3 py-1.5 rounded text-sm transition-colors"
            >
              ← Précédent
            </button>
          )}
          
          <div className="flex-1 max-w-md">
            <ProgressBar />
          </div>
          
          {/* Bouton Suivant */}
          {currentStep < steps.length - 1 && (
            <button 
              onClick={() => {
                // Logique pour passer à l'étape suivante si conditions remplies
                if (currentStep === 0 && selectedConcessionaire) {
                  setCurrentStep(1);
                } else if (currentStep === 1 && uploadedPDF) {
                  setCurrentStep(2);
                } else if (currentStep === 2 && selectedPages.length > 0) {
                  setCurrentStep(3);
                } else if (currentStep === 3 && selectedArea) {
                  setCurrentStep(4);
                } else if (currentStep === 4 && coordinateFormatConfigured) {
                  setCurrentStep(5);
                }
              }} 
              disabled={
                (currentStep === 0 && !selectedConcessionaire) ||
                (currentStep === 1 && !uploadedPDF) ||
                (currentStep === 2 && selectedPages.length === 0) ||
                (currentStep === 3 && !selectedArea) ||
                (currentStep === 4 && !coordinateFormatConfigured)
              }
              className={`border-none px-3 py-1.5 rounded text-sm transition-colors ${
                (currentStep === 0 && selectedConcessionaire) ||
                (currentStep === 1 && uploadedPDF) ||
                (currentStep === 2 && selectedPages.length > 0) ||
                (currentStep === 3 && selectedArea) ||
                (currentStep === 4 && coordinateFormatConfigured)
                  ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              Suivant →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;