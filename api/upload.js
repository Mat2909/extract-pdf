const formidable = require('formidable');
const fs = require('fs');

exports.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await form.parse(req);
    
    const pdfFile = files.pdf?.[0];
    if (!pdfFile) {
      return res.status(400).json({ 
        success: false,
        error: 'Aucun fichier PDF reçu' 
      });
    }

    // Vérifier que c'est un PDF
    if (!pdfFile.mimetype?.includes('pdf')) {
      return res.status(400).json({ 
        success: false,
        error: 'Seuls les fichiers PDF sont acceptés' 
      });
    }

    // Lire le fichier en mémoire
    const pdfBuffer = fs.readFileSync(pdfFile.filepath);

    // Toujours utiliser base64 - solution la plus fiable
    const base64Data = pdfBuffer.toString('base64');
    
    // Nettoyer le fichier temporaire
    fs.unlinkSync(pdfFile.filepath);

    res.json({
      success: true,
      message: 'PDF uploadé avec succès',
      file: {
        originalName: pdfFile.originalFilename,
        size: pdfFile.size,
        sizeFormatted: `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`,
        data: base64Data
      }
    });

  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du traitement du PDF: ' + error.message 
    });
  }
};