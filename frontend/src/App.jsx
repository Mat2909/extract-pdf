import React, { useState } from 'react';
import './App.css';
import PDFViewer from './components/PDFViewer';
import OCRProcessor from './components/OCRProcessor';

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [uploadedPDF, setUploadedPDF] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [ocrResults, setOcrResults] = useState([]);
  const [selectedPages, setSelectedPages] = useState([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [pagesValidated, setPagesValidated] = useState(false);
  const [totalPDFPages, setTotalPDFPages] = useState(0);
  
  // Définition des étapes
  const steps = [
    { number: 1, title: 'Sélection du PDF', description: 'Choisir le fichier PDF à traiter' },
    { number: 2, title: 'Sélection des pages', description: 'Choisir les pages à analyser' },
    { number: 3, title: 'Zone d\'extraction', description: 'Définir la zone de coordonnées' },
    { number: 4, title: 'Validation des données', description: 'Contrôler les valeurs extraites' },
    { number: 5, title: 'Extraction Excel', description: 'Génération du fichier final' }
  ];

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file);
      setMessage('');
    } else {
      setMessage('Veuillez sélectionner un fichier PDF valide');
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
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        handleFileUploadSuccess(result);
        console.log('Résultat:', result);
      } else {
        const errorText = await response.text();
        setMessage(`Erreur ${response.status}: ${errorText || 'Erreur lors de l\'upload'}`);
        console.error('Erreur détaillée:', response.status, errorText);
      }
    } catch (error) {
      setMessage('Erreur de connexion');
      console.error('Erreur:', error);
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
    // Convertir les données base64 en URL blob pour PDF.js
    const base64Data = result.file.data;
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    setUploadedPDF({
      ...result.file,
      path: url
    });
    setCurrentStep(2);
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
      {/* Header fixe avec titre et bouton nouveau */}
      <div className="app-header" style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        zIndex: 1000,
        borderBottom: '2px solid #dee2e6',
        paddingBottom: '10px'
      }}>
        <button 
          onClick={resetApp} 
          className="new-extraction-btn"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 15px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🔄 Nouvelle extraction
        </button>
        
        <h1 style={{ textAlign: 'center', margin: '20px 0' }}>Extraction de coordonnées PDF</h1>
        
        {/* Bouton précédent */}
        {currentStep > 1 && (
          <button 
            onClick={() => {
              const prevStep = currentStep - 1;
              setCurrentStep(prevStep);
              
              // Réinitialiser certains états selon l'étape précédente
              if (prevStep === 1) {
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
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '10px 15px',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ← Précédent
          </button>
        )}
        
        <ProgressBar />
      </div>
      
      {/* Contenu des pages par étapes */}
      <div className="page-content" style={{ padding: '20px', minHeight: 'calc(100vh - 200px)' }}>
        
        {/* Étape 1 : Sélection du PDF */}
        {currentStep === 1 && (
          <div className="step-page">
            <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <h2>Étape 1 : Sélection du fichier PDF</h2>
              <p>Choisissez le fichier PDF contenant les coordonnées à extraire</p>
              
              <div className="upload-section" style={{
                padding: '40px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '2px dashed #dee2e6',
                margin: '20px 0'
              }}>
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  style={{
                    margin: '20px 0',
                    padding: '10px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    fontSize: '16px'
                  }}
                />
                
                {selectedFile && (
                  <div className="file-info" style={{
                    margin: '20px 0',
                    padding: '15px',
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    border: '1px solid #28a745'
                  }}>
                    <p><strong>Fichier sélectionné:</strong> {selectedFile.name}</p>
                    <p><strong>Taille:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
                
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  style={{
                    backgroundColor: !selectedFile || uploading ? '#6c757d' : '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '5px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    cursor: !selectedFile || uploading ? 'not-allowed' : 'pointer',
                    marginTop: '20px'
                  }}
                >
                  {uploading ? 'Upload en cours...' : 'Valider et continuer'}
                </button>
                
                {message && (
                  <div style={{
                    marginTop: '20px',
                    padding: '10px',
                    borderRadius: '4px',
                    backgroundColor: message.includes('succès') ? '#d4edda' : '#f8d7da',
                    color: message.includes('succès') ? '#155724' : '#721c24',
                    border: `1px solid ${message.includes('succès') ? '#c3e6cb' : '#f5c6cb'}`
                  }}>
                    {message}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Étape 2 : Sélection des pages */}
        {currentStep === 2 && uploadedPDF && (
          <div className="step-page">
            <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
              <h2>Étape 2 : Sélection des pages à traiter</h2>
              <p>Choisissez les pages contenant les coordonnées à extraire</p>
              
              <div style={{
                padding: '30px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #dee2e6',
                margin: '20px 0'
              }}>
                <button
                  onClick={() => {
                    const allPages = totalPDFPages > 0 ? 
                      [...Array(totalPDFPages).keys()].map(i => i + 1) : 
                      [...Array(10).keys()].map(i => i + 1);
                    setSelectedPages(allPages);
                    setCurrentStep(3);
                  }}
                  style={{
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    padding: '15px 30px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    marginRight: '15px'
                  }}
                >
                  ✓ Sélectionner toutes les pages ({totalPDFPages} pages)
                </button>
                <br /><br />
                <span style={{ color: '#6c757d', fontSize: '16px' }}>ou gérez manuellement ci-dessous</span>
              </div>
              
              <PDFViewer
                pdfUrl={uploadedPDF.path}
                onAreaSelect={handleAreaSelect}
                onPagesChange={handlePagesChange}
                currentStep={currentStep}
                onStepChange={setCurrentStep}
                onTotalPagesChange={setTotalPDFPages}
              />
              
              {/* Bouton continuer si des pages sont sélectionnées manuellement */}
              {selectedPages.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <button
                    onClick={() => setCurrentStep(3)}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
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
              />
              
              {/* Bouton de validation de zone */}
              {selectedArea && (
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <div style={{
                    backgroundColor: '#d1ecf1',
                    border: '1px solid #bee5eb',
                    borderRadius: '4px',
                    padding: '15px',
                    marginBottom: '15px',
                    maxWidth: '600px',
                    margin: '0 auto 15px'
                  }}>
                    <h4>Zone sélectionnée</h4>
                    <p>Position : X: {(selectedArea.x * 100).toFixed(1)}%, Y: {(selectedArea.y * 100).toFixed(1)}%</p>
                    <p>Dimensions : {(selectedArea.width * 100).toFixed(1)}% × {(selectedArea.height * 100).toFixed(1)}%</p>
                  </div>
                  
                  <button
                    onClick={() => setCurrentStep(4)}
                    style={{
                      backgroundColor: '#28a745',
                      color: 'white',
                      border: 'none',
                      padding: '15px 30px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      marginRight: '15px'
                    }}
                  >
                    ✓ Valider cette zone
                  </button>
                  
                  <button
                    onClick={() => setSelectedArea(null)}
                    style={{
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      padding: '12px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer',
                      fontSize: '16px'
                    }}
                  >
                    🔄 Refaire la sélection
                  </button>
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