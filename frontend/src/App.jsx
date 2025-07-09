import React, { useState, useEffect } from 'react';
import './App.css';
import PDFViewer from './components/PDFViewer';
import OCRProcessor from './components/OCRProcessor';

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
      { number: 4, title: 'Validation des données', description: 'Contrôler les valeurs extraites' },
      { number: 5, title: 'Extraction Excel', description: 'Génération du fichier final' }
    ];
    
    // Personnalisation selon le concessionnaire
    if (concessionaireId === 'grdf') {
      baseSteps[3].description = 'Définir la zone de coordonnées GrDF';
    } else if (concessionaireId === 'sfr') {
      baseSteps[3].description = 'Définir la zone de lecture SFR';
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
  
  const handleOCRStart = () => {
    setCurrentStep(4);
  };
  
  const handleExcelGeneration = () => {
    setCurrentStep(5);
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
                fontSize: '14px'
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

      {/* Header fixe avec titre et bouton nouveau */}
      <div className="app-header sticky top-0 bg-white z-50 border-b-2 border-gray-200 pb-2.5">
        <button 
          onClick={resetApp} 
          className="absolute top-5 left-5 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-md transition-colors duration-200"
        >
          🔄 Nouvelle extraction
        </button>
        
        <h1 className="text-center text-3xl font-bold text-gray-800 my-5">Extraction de coordonnées PDF</h1>
        
        {/* Barre de progression avec bouton précédent */}
        <div className="flex items-center justify-center gap-4 mt-4">
          {currentStep > 0 && (
            <button 
              onClick={() => {
                const prevStep = currentStep - 1;
                setCurrentStep(prevStep);
                
                // Réinitialiser certains états selon l'étape précédente
                if (prevStep === 0) {
                  // Retour à l'étape 0 : réinitialiser le concessionnaire
                  setSelectedConcessionaire(null);
                  setSelectedFile(null);
                  setMessage('');
                  setErrorMessage(null);
                } else if (prevStep === 1) {
                  // Retour à l'étape 1 : garder le PDF mais permettre d'en changer
                  setMessage('');
                } else if (prevStep === 2) {
                  // Retour à l'étape 2 : effacer la zone sélectionnée
                  setSelectedArea(null);
                } else if (prevStep === 3) {
                  // Retour à l'étape 3 : rester avec la zone mais permettre de la modifier
                  // Pas de réinitialisation nécessaire
                }
              }} 
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition-colors duration-200"
            >
              ← Précédent
            </button>
          )}
          
          <ProgressBar />
        </div>
      </div>
      
      {/* Contenu des pages par étapes */}
      <div className="page-content p-5 min-h-[calc(100vh-200px)]">
        
        {/* Étape 0 : Sélection du concessionnaire */}
        {currentStep === 0 && (
          <div className="step-page">
            <div className="text-center max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Étape 0 : Sélection du concessionnaire réseau</h2>
              <p className="text-gray-600 mb-10">Choisissez le type de concessionnaire pour adapter l'extraction</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-10">
                {concessionaires.map((concessionaire) => (
                  <div
                    key={concessionaire.id}
                    onClick={() => handleConcessionaireSelect(concessionaire)}
                    className="p-8 bg-gray-50 rounded-xl border-2 border-gray-200 cursor-pointer transition-all duration-300 text-center hover:bg-white hover:shadow-lg hover:-translate-y-1"
                    style={{
                      borderColor: concessionaire.color
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.borderColor = concessionaire.color;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = concessionaire.color;
                    }}
                  >
                    <div className="text-5xl mb-4">
                      {concessionaire.logo}
                    </div>
                    <h3 className="text-2xl font-bold mb-2.5" style={{ color: concessionaire.color }}>
                      {concessionaire.name}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {concessionaire.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
                
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className={`mt-5 px-8 py-4 rounded-md text-lg font-bold transition-colors duration-200 ${
                    !selectedFile || uploading 
                      ? 'bg-gray-600 text-white cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 text-white cursor-pointer'
                  }`}
                >
                  {uploading ? 'Upload en cours...' : 'Valider et continuer'}
                </button>
                
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
              
              <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
                <button
                  onClick={() => {
                    const allPages = totalPDFPages > 0 ? 
                      [...Array(totalPDFPages).keys()].map(i => i + 1) : 
                      [...Array(10).keys()].map(i => i + 1);
                    setSelectedPages(allPages);
                    setCurrentStep(3);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-md text-lg transition-colors duration-200 mb-4"
                >
                  ✓ Sélectionner toutes les pages ({totalPDFPages} pages)
                </button>
                <br />
                <span className="text-gray-500 text-base">ou sélectionnez manuellement les pages ci-dessous</span>
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
              
              {/* Bouton continuer si des pages sont sélectionnées manuellement */}
              {selectedPages.length > 0 && (
                <div className="text-center mt-5">
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md text-base transition-colors duration-200"
                  >
                    Continuer avec {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} →
                  </button>
                </div>
              )}
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
                      Passez à l'étape suivante pour démarrer l'OCR
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Étapes 4 et 5 : OCR et Excel */}
        {currentStep >= 4 && uploadedPDF && selectedArea && (
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
            />
          </div>
        )}
        
      </div>
    </div>
  );
}

export default App;