import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { filename } = req.query;
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const pdfPath = path.join(uploadsDir, filename);
  
  if (fs.existsSync(pdfPath)) {
    const fileBuffer = fs.readFileSync(pdfPath);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(fileBuffer);
  } else {
    res.status(404).json({ error: 'PDF non trouvé' });
  }
}