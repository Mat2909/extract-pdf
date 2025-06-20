export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.json({ 
    status: 'OK', 
    message: 'Serveur PDF fonctionnel',
    timestamp: new Date().toISOString()
  });
}