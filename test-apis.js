#!/usr/bin/env node

/**
 * Test rapide des APIs en environnement Node.js
 */

const fs = require('fs');
const path = require('path');

async function testAPI(apiName) {
  try {
    console.log(`\n🧪 Test de l'API: ${apiName}`);
    
    const apiPath = path.join(__dirname, 'api', `${apiName}.js`);
    if (!fs.existsSync(apiPath)) {
      console.error(`❌ Fichier non trouvé: ${apiPath}`);
      return false;
    }
    
    // Nettoyer le cache require
    delete require.cache[require.resolve(apiPath)];
    const handler = require(apiPath);
    
    // Mock req/res pour test basique
    const mockReq = {
      method: 'GET',
      url: `/api/${apiName}`,
      headers: {},
      body: {}
    };
    
    const mockRes = {
      status: (code) => {
        mockRes.statusCode = code;
        return mockRes;
      },
      json: (data) => {
        console.log(`✅ Status: ${mockRes.statusCode || 200}`);
        console.log(`📄 Response:`, JSON.stringify(data, null, 2));
        return mockRes;
      },
      end: () => {
        console.log(`✅ Response ended successfully`);
        return mockRes;
      },
      setHeader: () => mockRes
    };
    
    await handler(mockReq, mockRes);
    return true;
    
  } catch (error) {
    console.error(`❌ Erreur test ${apiName}:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Test des APIs Vercel Functions');
  
  const apis = ['health', 'test'];
  let passedTests = 0;
  
  for (const api of apis) {
    const success = await testAPI(api);
    if (success) passedTests++;
  }
  
  console.log(`\n📊 Résultat: ${passedTests}/${apis.length} tests réussis`);
  
  if (passedTests === apis.length) {
    console.log('✅ Tous les tests basiques passent !');
    console.log('💡 Les APIs devraient fonctionner sur Vercel');
  } else {
    console.log('❌ Certains tests échouent');
    console.log('💡 Vérifiez les erreurs ci-dessus');
  }
}

main().catch(console.error);