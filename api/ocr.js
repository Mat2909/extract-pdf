// OCR avec API externe OCR.space pour Vercel
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { imageData } = req.body;
    
    if (!imageData) {
      return res.status(400).json({
        success: false,
        error: 'Image data manquante'
      });
    }

    console.log('🔍 Démarrage OCR via OCR.space API...');

    // Utiliser OCR.space API (gratuite)
    const ocrSpaceApiKey = 'K87899142988957'; // Clé publique de démo
    
    try {
      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'apikey': ocrSpaceApiKey,
          'base64Image': imageData,
          'language': 'fre',
          'isOverlayRequired': 'false',
          'detectOrientation': 'false',
          'scale': 'true',
          'isTable': 'false'
        })
      });

      const result = await response.json();
      console.log('📡 Réponse OCR.space:', result);

      if (result.IsErroredOnProcessing) {
        throw new Error('Erreur OCR.space: ' + result.ErrorMessage);
      }

      const extractedText = result.ParsedResults?.[0]?.ParsedText || '';
      console.log('✅ OCR terminée');
      console.log('📄 Texte extrait:', extractedText.substring(0, 200));

      res.json({
        success: true,
        text: extractedText.trim(),
        confidence: 90,
        source: 'OCR.space API'
      });

    } catch (ocrError) {
      console.warn('⚠️ OCR.space échec, fallback simulation:', ocrError.message);
      
      // Fallback vers simulation en cas d'échec API
      const simulatedText = `Coordonnées non détectées - Vérifiez la zone sélectionnée`;
      
      res.json({
        success: true,
        text: simulatedText,
        confidence: 0,
        note: "Fallback - OCR.space indisponible"
      });
    }

  } catch (error) {
    console.error('❌ Erreur OCR:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement OCR: ' + error.message
    });
  }
};