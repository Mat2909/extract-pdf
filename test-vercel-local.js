#!/usr/bin/env node

/**
 * Script de test pour simuler l'environnement Vercel en local
 */

const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware pour parser les requêtes
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'frontend/dist')));

// Charger et monter les fonctions API
const apiDir = path.join(__dirname, 'api');
const apiFiles = fs.readdirSync(apiDir).filter(file => file.endsWith('.js'));

console.log('🚀 Chargement des fonctions API:');
apiFiles.forEach(file => {
  const apiName = file.replace('.js', '');
  const apiPath = path.join(apiDir, file);
  
  try {
    // Nettoyer le cache require pour recharger à chaud
    delete require.cache[require.resolve(apiPath)];
    const handler = require(apiPath);
    
    app.all(`/api/${apiName}`, handler);
    console.log(`✅ /api/${apiName} chargé depuis ${file}`);
  } catch (error) {
    console.error(`❌ Erreur chargement /api/${apiName}:`, error.message);
  }
});

// Catch-all pour le SPA React
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`\n🌍 Serveur test Vercel démarré sur http://localhost:${PORT}`);
  console.log(`📁 Servant les fichiers depuis: frontend/dist`);
  console.log(`🔧 APIs disponibles: ${apiFiles.map(f => `/api/${f.replace('.js', '')}`).join(', ')}`);
  console.log(`\n💡 Ce serveur simule l'environnement Vercel pour débugger`);
  console.log(`💡 Utilisez Ctrl+D sur l'interface pour activer le debug panel`);
});

// Gestion des erreurs
process.on('uncaughtException', (error) => {
  console.error('❌ Erreur non capturée:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesse rejetée non gérée:', reason);
});