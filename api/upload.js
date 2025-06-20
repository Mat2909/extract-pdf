import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

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
    // Utiliser /tmp sur Vercel (système de fichiers en lecture seule)
    const uploadDir = '/tmp';
    // Pas besoin de créer /tmp, il existe déjà sur Vercel

    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      filename: (name, ext, part) => {
        const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}-${part.originalFilename}`;
        return uniqueName;
      }
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
      // Supprimer le fichier uploadé
      fs.unlinkSync(pdfFile.filepath);
      return res.status(400).json({ 
        success: false,
        error: 'Seuls les fichiers PDF sont acceptés' 
      });
    }

    console.log('Fichier PDF reçu:', {
      originalName: pdfFile.originalFilename,
      filename: path.basename(pdfFile.filepath),
      size: pdfFile.size,
      path: pdfFile.filepath
    });

    res.json({
      success: true,
      message: 'PDF uploadé avec succès',
      file: {
        originalName: pdfFile.originalFilename,
        filename: path.basename(pdfFile.filepath),
        size: pdfFile.size,
        sizeFormatted: `${(pdfFile.size / 1024 / 1024).toFixed(2)} MB`,
        path: `/api/pdf/${path.basename(pdfFile.filepath)}`
      }
    });

  } catch (error) {
    console.error('Erreur upload:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erreur lors du traitement du PDF: ' + error.message 
    });
  }
}