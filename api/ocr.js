const Tesseract = require('tesseract.js');

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

    // Décoder l'image base64
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    console.log('🔍 Démarrage OCR Tesseract...');

    // Créer un worker Tesseract
    const worker = await Tesseract.createWorker(['fra', 'eng']);

    try {
      const { data: { text } } = await worker.recognize(imageBuffer);
      
      console.log('✅ OCR terminé');
      console.log('📄 Texte extrait:', text.substring(0, 200) + '...');

      await worker.terminate();

      res.json({
        success: true,
        text: text.trim(),
        length: text.length
      });

    } catch (ocrError) {
      console.error('❌ Erreur OCR:', ocrError);
      await worker.terminate();
      
      res.status(500).json({
        success: false,
        error: 'Erreur OCR: ' + ocrError.message
      });
    }

  } catch (error) {
    console.error('❌ Erreur traitement OCR:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement OCR: ' + error.message
    });
  }
};