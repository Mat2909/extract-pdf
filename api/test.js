module.exports = function handler(req, res) {
  // Headers pour CORS si nécessaire
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('🔍 Test API appelée:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });

  res.json({
    success: true,
    message: 'API test fonctionne !',
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    method: req.method,
    vercel: process.env.VERCEL ? 'yes' : 'no'
  });
};