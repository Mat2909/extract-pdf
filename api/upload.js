import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
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

    // Upload vers file.io pour résoudre les problèmes Vercel
    const fileioFormData = new FormData();
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    fileioFormData.append('file', blob, pdfFile.originalFilename);

    try {
      const fileioResponse = await fetch('https://file.io/', {
        method: 'POST',
        body: fileioFormData
      });

      if (!fileioResponse.ok) {
        throw new Error('Upload file.io échoué');
      }

      const fileioResult = await fileioResponse.json();

      console.log('Fichier PDF uploadé vers file.io:', {
        originalName: pdfFile.originalFilename,
        size: pdfFile.size,
        fileioUrl: fileioResult.link
      });

      // Nettoyer le fichier temporaire
      fs.unlinkSync(pdfFile.filepath);

      res.json({
        success: true,
        message: 'PDF uploadé avec succès',
        file: {
          originalName: pdfFile.originalFilename,
          size: pdfFile.size,
          sizeFormatted: `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`,
          path: fileioResult.link, // URL file.io pour visualisation
          fileioKey: fileioResult.key
        }
      });

    } catch (fileioError) {
      console.warn('File.io échoué, fallback vers base64:', fileioError.message);
      
      // Fallback: base64 si file.io échoue
      const base64Data = pdfBuffer.toString('base64');
      
      // Nettoyer le fichier temporaire
      fs.unlinkSync(pdfFile.filepath);

      res.json({
        success: true,
        message: 'PDF uploadé avec succès (mode base64)',
        file: {
          originalName: pdfFile.originalFilename,
          size: pdfFile.size,
          sizeFormatted: `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`,
          data: base64Data
        }
      });
    }

  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du traitement du PDF: ' + error.message 
    });
  }
}