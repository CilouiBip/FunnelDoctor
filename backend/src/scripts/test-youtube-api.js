const fetch = require('node-fetch');
const fs = require('fs');

// Configuration
const BASE_URL = 'http://localhost:3001';
let token = null;

// Utilitaires
async function login() {
  console.log('📝 Tentative de connexion pour obtenir un token JWT...');
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123'
      })
    });

    if (!response.ok) {
      throw new Error(`Login failed with status ${response.status}`);
    }

    const data = await response.json();
    token = data.access_token;
    console.log('✅ Connexion réussie, token JWT obtenu');
    return token;
  } catch (error) {
    console.error('❌ Erreur lors de la connexion:', error.message);
    // Essayer d'utiliser un token par défaut si disponible
    try {
      if (fs.existsSync('./.test-token')) {
        token = fs.readFileSync('./.test-token', 'utf8').trim();
        console.log('ℹ️ Utilisation d\'un token sauvegardé');
        return token;
      }
    } catch (e) {
      console.error('❌ Pas de token de secours disponible');
    }
    process.exit(1);
  }
}

async function makeAuthenticatedRequest(url, options = {}) {
  if (!token) {
    await login();
  }

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  return fetch(url, {
    ...options,
    headers
  });
}

async function testGetUserVideos() {
  console.log('\n🔍 Test de l\'endpoint GET /api/youtube/videos');
  try {
    const response = await makeAuthenticatedRequest(`${BASE_URL}/api/youtube/videos`);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ Endpoint /api/youtube/videos fonctionnel');
      console.log(`📊 ${data.videos?.length || 0} vidéos récupérées`);
      if (data.nextPageToken) {
        console.log(`ℹ️ Token de pagination disponible: ${data.nextPageToken}`);
      }
      
      // Enregistrer le premier ID de vidéo pour les tests suivants
      if (data.videos && data.videos.length > 0) {
        const videoId = data.videos[0].id;
        console.log(`ℹ️ Premier ID de vidéo: ${videoId} (sera utilisé pour les tests suivants)`);
        return videoId;
      }
    } else {
      console.error('❌ Échec de la requête:', data);
    }
  } catch (error) {
    console.error('❌ Erreur lors du test de getUserVideos:', error.message);
  }
  return null;
}

async function testGetVideoDetails(videoId) {
  if (!videoId) {
    console.log('⚠️ Pas d\'ID de vidéo disponible pour tester getVideoDetails');
    return;
  }

  console.log(`\n🔍 Test de l'endpoint GET /api/youtube/videos/${videoId}`);
  try {
    const response = await makeAuthenticatedRequest(`${BASE_URL}/api/youtube/videos/${videoId}`);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Endpoint /api/youtube/videos/${videoId} fonctionnel`);
      console.log('📊 Statistiques de la vidéo:');
      console.log(`   - Vues: ${data.viewCount || 'N/A'}`);
      console.log(`   - Likes: ${data.likeCount || 'N/A'}`);
      console.log(`   - Commentaires: ${data.commentCount || 'N/A'}`);
    } else {
      console.error('❌ Échec de la requête:', data);
    }
  } catch (error) {
    console.error('❌ Erreur lors du test de getVideoDetails:', error.message);
  }
}

async function testGetVideoComments(videoId) {
  if (!videoId) {
    console.log('⚠️ Pas d\'ID de vidéo disponible pour tester getVideoComments');
    return;
  }

  console.log(`\n🔍 Test de l'endpoint GET /api/youtube/videos/${videoId}/comments`);
  try {
    const response = await makeAuthenticatedRequest(`${BASE_URL}/api/youtube/videos/${videoId}/comments`);
    const data = await response.json();

    if (response.ok) {
      console.log(`✅ Endpoint /api/youtube/videos/${videoId}/comments fonctionnel`);
      console.log(`📊 ${data.comments?.length || 0} commentaires récupérés`);
      if (data.comments && data.comments.length > 0) {
        console.log('📝 Premier commentaire:');
        console.log(`   - Auteur: ${data.comments[0].authorDisplayName || 'N/A'}`);
        console.log(`   - Texte: ${data.comments[0].textDisplay?.substring(0, 100) || 'N/A'}...`);
      }
    } else {
      console.error('❌ Échec de la requête:', data);
    }
  } catch (error) {
    console.error('❌ Erreur lors du test de getVideoComments:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Début des tests de l\'API YouTube');
  
  // Tester l'endpoint de récupération des vidéos
  const videoId = await testGetUserVideos();
  
  // Tester l'endpoint de récupération des détails d'une vidéo
  await testGetVideoDetails(videoId);
  
  // Tester l'endpoint de récupération des commentaires d'une vidéo
  await testGetVideoComments(videoId);
  
  console.log('\n✨ Tests terminés');
}

// Exécuter tous les tests
runAllTests();
