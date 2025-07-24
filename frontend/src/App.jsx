import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import PDFViewer from './components/PDFViewer';
import OCRProcessor from './components/OCRProcessor';
import CoordinateFormatPage from './components/CoordinateFormatPage';

function App() {
  const coordinateFormatPageRef = useRef(null);
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
      { number: 0, title: 'Sélection du concessionnaire' },
      { number: 1, title: 'Sélection du PDF' },
      { number: 2, title: 'Sélection des pages à traiter' },
      { number: 3, title: 'Définir zone d\'extraction' },
      { number: 4, title: 'Définir format' },
      { number: 5, title: 'Validation des données' },
      { number: 6, title: 'Extraction données' }
    ];
    
    // Pas de personnalisation selon le concessionnaire - textes standardisés
    
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
      <div 
        className="page-content min-h-[calc(100vh-80px)]"
        style={{ paddingBottom: '80px' }}
      >
        
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
                      Sélection du fichier PDF
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', marginTop: '8px' }}>
                      Choisissez le fichier PDF contenant les coordonnées à extraire
                    </p>

                    {/* Affichage du concessionnaire sélectionné */}
                    {selectedConcessionaire && (
                      <div 
                        style={{
                          padding: '12px 16px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: selectedConcessionaire.color,
                          backgroundColor: '#f9fafb',
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{selectedConcessionaire.logo}</span>
                        <span style={{ 
                          fontWeight: '500', 
                          fontSize: '14px',
                          color: selectedConcessionaire.color 
                        }}>
                          {selectedConcessionaire.name}
                        </span>
                      </div>
                    )}
                    
                    {/* Section upload */}
                    <div style={{ marginBottom: '20px' }}>
                      <label htmlFor="pdf-file" style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#111827' 
                      }}>
                        Fichier PDF
                      </label>
                      <input
                        id="pdf-file"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        disabled={uploading}
                        style={{
                          backgroundColor: '#f9fafb',
                          border: '1px solid #d1d5db',
                          color: '#111827',
                          borderRadius: '8px',
                          display: 'block',
                          width: '100%',
                          padding: '10px',
                          fontSize: '14px',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    {/* Aperçu du fichier sélectionné */}
                    {selectedFile && (
                      <div 
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #10b981',
                          backgroundColor: '#f0fdf4',
                          marginBottom: '20px'
                        }}
                      >
                        <h3 style={{ 
                          fontWeight: 'bold', 
                          fontSize: '16px', 
                          marginBottom: '8px',
                          color: '#059669' 
                        }}>
                          Fichier sélectionné
                        </h3>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '4px' }}>
                          <strong>Nom :</strong> {selectedFile.name}
                        </p>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                          <strong>Taille :</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          {selectedFile.size > 3 * 1024 * 1024 && (
                            <span style={{ color: '#d97706', fontWeight: 'bold' }}> (Fichier volumineux)</span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    <button
                      onClick={handleUpload}
                      disabled={!selectedFile || uploading}
                      style={{
                        width: '100%',
                        color: 'white',
                        backgroundColor: selectedFile && !uploading ? '#dc2626' : '#d1d5db',
                        fontWeight: '500',
                        borderRadius: '8px',
                        fontSize: '14px',
                        padding: '10px 20px',
                        textAlign: 'center',
                        border: 'none',
                        cursor: selectedFile && !uploading ? 'pointer' : 'not-allowed',
                        opacity: selectedFile && !uploading ? '1' : '0.5',
                        transition: 'all 0.15s ease-in-out',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                      onMouseOver={(e) => {
                        if (selectedFile && !uploading) {
                          e.target.style.backgroundColor = '#b91c1c';
                        }
                      }}
                      onMouseOut={(e) => {
                        if (selectedFile && !uploading) {
                          e.target.style.backgroundColor = '#dc2626';
                        }
                      }}
                    >
                      {uploading ? (
                        <>
                          <svg style={{ 
                            animation: 'spin 1s linear infinite', 
                            width: '16px', 
                            height: '16px', 
                            color: 'white' 
                          }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle style={{ opacity: '0.25' }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path style={{ opacity: '0.75' }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Upload en cours...
                        </>
                      ) : (
                        selectedFile ? 'Uploader et continuer' : 'Sélectionnez un fichier PDF'
                      )}
                    </button>

                    {/* Messages d'erreur et de succès */}
                    {message && (
                      <div style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: message.includes('succès') ? '#f0fdf4' : '#fef2f2',
                        border: `1px solid ${message.includes('succès') ? '#10b981' : '#ef4444'}`,
                        color: message.includes('succès') ? '#059669' : '#dc2626',
                        fontSize: '14px'
                      }}>
                        {message}
                      </div>
                    )}
                    
                    {errorMessage && (
                      <div style={{
                        marginTop: '20px',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        backgroundColor: '#fef2f2',
                        border: '1px solid #ef4444',
                        color: '#dc2626',
                        fontSize: '14px'
                      }}>
                        {errorMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
        
        {/* Étape 2 : Sélection des pages */}
        {currentStep === 2 && uploadedPDF && (
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
                  maxWidth: '600px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{ padding: '32px' }}>
                    <h1 className="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl">
                      Sélection des pages à traiter
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px', marginTop: '8px' }}>
                      Choisissez les pages contenant les coordonnées à extraire
                    </p>

                    {/* Affichage du concessionnaire sélectionné */}
                    {selectedConcessionaire && (
                      <div 
                        style={{
                          padding: '12px 16px',
                          borderRadius: '6px',
                          border: '1px solid',
                          borderColor: selectedConcessionaire.color,
                          backgroundColor: '#f9fafb',
                          marginBottom: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>{selectedConcessionaire.logo}</span>
                        <span style={{ 
                          fontWeight: '500', 
                          fontSize: '14px',
                          color: selectedConcessionaire.color 
                        }}>
                          {selectedConcessionaire.name}
                        </span>
                      </div>
                    )}
                    
                    {/* Bouton sélection rapide */}
                    <div style={{ marginBottom: '24px' }}>
                      <button
                        onClick={() => {
                          const allPages = totalPDFPages > 0 ? 
                            [...Array(totalPDFPages).keys()].map(i => i + 1) : 
                            [...Array(10).keys()].map(i => i + 1);
                          setSelectedPages(allPages);
                        }}
                        style={{
                          width: '100%',
                          color: 'white',
                          backgroundColor: '#dc2626',
                          fontWeight: '500',
                          borderRadius: '8px',
                          fontSize: '14px',
                          padding: '12px 20px',
                          textAlign: 'center',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          marginBottom: '12px'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = '#b91c1c';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = '#dc2626';
                        }}
                      >
                        ✓ Sélectionner toutes les pages ({totalPDFPages} pages)
                      </button>
                      
                      <button
                        onClick={() => {
                          setSelectedPages([]);
                        }}
                        style={{
                          width: '100%',
                          color: 'white',
                          backgroundColor: '#6b7280',
                          fontWeight: '500',
                          borderRadius: '8px',
                          fontSize: '14px',
                          padding: '12px 20px',
                          textAlign: 'center',
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease-in-out',
                          marginBottom: '12px'
                        }}
                        onMouseOver={(e) => {
                          e.target.style.backgroundColor = '#4b5563';
                        }}
                        onMouseOut={(e) => {
                          e.target.style.backgroundColor = '#6b7280';
                        }}
                      >
                        ✗ Désélectionner toutes les pages
                      </button>
                      
                      <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
                        ou sélectionnez manuellement les pages ci-dessous
                      </p>
                    </div>

                    {/* Aperçu des pages sélectionnées */}
                    {selectedPages.length > 0 && (
                      <div 
                        style={{
                          padding: '16px',
                          borderRadius: '8px',
                          border: '1px solid #10b981',
                          backgroundColor: '#f0fdf4',
                          marginBottom: '20px',
                          textAlign: 'center'
                        }}
                      >
                        <h3 style={{ 
                          fontWeight: 'bold', 
                          fontSize: '16px', 
                          marginBottom: '8px',
                          color: '#059669' 
                        }}>
                          Pages sélectionnées
                        </h3>
                        <p style={{ fontSize: '14px', color: '#6b7280' }}>
                          {selectedPages.length === totalPDFPages ? 
                            `Toutes les pages (${selectedPages.length})` :
                            `${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''} : ${selectedPages.join(', ')}`
                          }
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Visualiseur PDF dans une carte séparée */}
                <div style={{
                  width: '100%',
                  maxWidth: '800px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                  marginTop: '20px'
                }}>
                  <div style={{ padding: '24px' }}>
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
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
        
        {/* Étape 3 : Zone d'extraction */}
        {currentStep === 3 && uploadedPDF && (
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
                justifyContent: 'flex-start',
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

                <div style={{ maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827', marginBottom: '8px' }}>Étape 3 : Zone d'extraction</h2>
                    <p style={{ fontSize: '16px', color: '#6b7280' }}>Sélectionnez la zone contenant les coordonnées sur le PDF</p>
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
                </div>
              )}
                </div>
              </div>
            </section>
          </>
        )}
        
        {/* Étape 4 : Configuration du format de coordonnées */}
        {currentStep === 4 && uploadedPDF && selectedArea && (
          <CoordinateFormatPage
            ref={coordinateFormatPageRef}
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
      <div 
        style={{
          position: 'fixed',
          bottom: '12px',
          left: '8px',
          right: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          borderTop: '1px solid #f3f4f6',
          paddingTop: '8px',
          paddingBottom: '8px',
          zIndex: 9999,
          borderRadius: '8px 8px 0 0'
        }}
      >
        <div className="flex items-center justify-center max-w-4xl mx-auto px-4">
          {/* Bouton Précédent à gauche */}
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
              style={{
                backgroundColor: '#f87171',
                color: 'white',
                border: 'none',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s ease-in-out',
                lineHeight: '1.2',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                width: 'fit-content',
                marginRight: '16px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f87171';
              }}
            >
              <span style={{ fontSize: '24px', pointerEvents: 'none' }}>←</span>
              <span style={{ fontSize: '10px', lineHeight: '1.1', pointerEvents: 'none' }}>Précédent</span>
            </button>
          )}
          
          {/* Barre de progression centrée */}
          <div className="flex-1 max-w-md">
            <ProgressBar />
          </div>
          
          {/* Section droite avec boutons */}
          <div className="flex items-center gap-2 ml-4">
            {/* Bouton Suivant - toujours affiché avec états activé/grisé */}
            {currentStep < steps.length - 1 && (
              <button 
                onClick={() => {
                  // Vérifier si l'action est possible avant d'exécuter
                  if (currentStep === 0 && selectedConcessionaire) {
                    setCurrentStep(1);
                  } else if (currentStep === 1 && selectedFile) {
                    // Pour l'étape 1, le bouton Suivant déclenche l'upload
                    handleUpload();
                  } else if (currentStep === 2 && selectedPages.length > 0) {
                    setCurrentStep(3);
                  } else if (currentStep === 3 && selectedArea) {
                    setCurrentStep(4);
                  } else if (currentStep === 4) {
                    // Déclencher la validation du format depuis CoordinateFormatPage
                    if (coordinateFormatPageRef.current) {
                      coordinateFormatPageRef.current.validateFormat();
                    }
                  }
                }}
                disabled={
                  (currentStep === 0 && !selectedConcessionaire) ||
                  (currentStep === 1 && !selectedFile) ||
                  (currentStep === 2 && selectedPages.length === 0) ||
                  (currentStep === 3 && !selectedArea) ||
                  false // Étape 4 toujours activée (Lambert II pré-sélectionné)
                }
                style={{
                  backgroundColor: 
                    (currentStep === 0 && selectedConcessionaire) ||
                    (currentStep === 1 && selectedFile) ||
                    (currentStep === 2 && selectedPages.length > 0) ||
                    (currentStep === 3 && selectedArea) ||
                    (currentStep === 4) // Toujours actif pour l'étape 4
                    ? '#2563eb' : '#d1d5db',
                  color: 
                    (currentStep === 0 && selectedConcessionaire) ||
                    (currentStep === 1 && selectedFile) ||
                    (currentStep === 2 && selectedPages.length > 0) ||
                    (currentStep === 3 && selectedArea) ||
                    (currentStep === 4) // Toujours actif pour l'étape 4
                    ? 'white' : '#6b7280',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 
                    (currentStep === 0 && selectedConcessionaire) ||
                    (currentStep === 1 && selectedFile) ||
                    (currentStep === 2 && selectedPages.length > 0) ||
                    (currentStep === 3 && selectedArea) ||
                    (currentStep === 4) // Toujours actif pour l'étape 4
                    ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease-in-out',
                  lineHeight: '1.2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: 'fit-content',
                  opacity: 
                    (currentStep === 0 && selectedConcessionaire) ||
                    (currentStep === 1 && selectedFile) ||
                    (currentStep === 2 && selectedPages.length > 0) ||
                    (currentStep === 3 && selectedArea) ||
                    (currentStep === 4) // Toujours actif pour l'étape 4
                    ? '1' : '0.6'
                }}
                onMouseEnter={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#1d4ed8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.currentTarget.disabled) {
                    e.currentTarget.style.backgroundColor = '#2563eb';
                  }
                }}
              >
                <span style={{ fontSize: '24px', pointerEvents: 'none' }}>→</span>
                <span style={{ fontSize: '10px', lineHeight: '1.1', pointerEvents: 'none' }}>Suivant</span>
              </button>
            )}
            
            {/* Bouton Nouvelle extraction centré dans l'espace restant */}
            <div className="flex justify-center" style={{ width: '150px' }}>
              <button 
                onClick={() => {
                  // Revenir à l'étape 0 - sélection du concessionnaire
                  setCurrentStep(0);
                  setSelectedConcessionaire(null);
                  setSelectedFile(null);
                  setMessage('');
                  setErrorMessage(null);
                  setSelectedArea(null);
                  setCoordinateFormatConfigured(false);
                  setCoordinateFormat(null);
                  setSelectedPages([]);
                }} 
                style={{
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease-in-out',
                  lineHeight: '1.2',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  width: 'fit-content'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#15803d';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#16a34a';
                }}
              >
                <span style={{ fontSize: '24px', pointerEvents: 'none' }}>↻</span>
                <span style={{ fontSize: '10px', lineHeight: '1.1', pointerEvents: 'none' }}>Nouvelle<br/>extraction</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;