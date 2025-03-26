const { createClient } = require('@supabase/supabase-js');

// Configuration Supabase depuis les variables d'environnement
require('dotenv').config();
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erreur: Variables d\'environnement SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquantes');
  process.exit(1);
}

// Créer le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// ID utilisateur de test - utilisateur existant dans la base de données
const TEST_USER_ID = 'a89ad1a0-1cb1-47a4-9a6c-e4934f2cd93c'; // mehdi.benchaffi@gmail.com

// Données de test
const testOAuthData = {
  user_id: TEST_USER_ID,
  integration_type: 'youtube',
  name: 'YouTube Integration',
  access_token: 'fake_access_token_for_testing',
  refresh_token: 'fake_refresh_token_for_testing',
  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(), // expire dans 1 heure
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const testVideos = [
  {
    id: crypto.randomUUID(),
    user_id: TEST_USER_ID,
    video_id: 'test_video_id_1',
    title: 'Vidéo de test 1',
    description: 'Description de la vidéo de test 1',
    published_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    thumbnail_url: 'https://via.placeholder.com/480x360',
    channel_id: 'test_channel_id',
    channel_title: 'Canal de Test',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    user_id: TEST_USER_ID,
    video_id: 'test_video_id_2',
    title: 'Vidéo de test 2',
    description: 'Description de la vidéo de test 2',
    published_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    thumbnail_url: 'https://via.placeholder.com/480x360',
    channel_id: 'test_channel_id',
    channel_title: 'Canal de Test',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const testVideoStats = [
  {
    id: crypto.randomUUID(),
    video_id: testVideos[0].video_id,
    user_id: TEST_USER_ID,
    view_count: 1250,
    like_count: 85,
    dislike_count: 5,
    favorite_count: 12,
    comment_count: 25,
    created_at: new Date().toISOString(),
  },
  {
    id: crypto.randomUUID(),
    video_id: testVideos[1].video_id,
    user_id: TEST_USER_ID,
    view_count: 3750,
    like_count: 210,
    dislike_count: 15,
    favorite_count: 35,
    comment_count: 48,
    created_at: new Date().toISOString(),
  },
];

async function seedTestData() {
  console.log('🌱 Insertion des données de test pour YouTube...');

  // 1. Vérifier si l'utilisateur existe
  const { data: userExists, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', TEST_USER_ID)
    .single();

  if (userError) {
    console.error('❌ Erreur lors de la vérification de l\'utilisateur:', userError);
    process.exit(1);
  }

  console.log(`✅ Utilisateur de test trouvé: ${userExists.id} (${userExists.email})`);

  // 2. Insérer ou mettre à jour les données d'intégration OAuth
  const { error: oauthError } = await supabase
    .from('integrations')
    .upsert(testOAuthData, { onConflict: 'user_id,integration_type' });

  if (oauthError) {
    console.error('❌ Erreur lors de l\'insertion des données OAuth:', oauthError);
    process.exit(1);
  }
  console.log('✅ Données OAuth insérées avec succès');

  // 3. Supprimer les anciennes vidéos de test pour cet utilisateur (pour éviter les doublons)
  const { error: deleteVideosError } = await supabase
    .from('youtube_videos')
    .delete()
    .eq('user_id', TEST_USER_ID);

  if (deleteVideosError) {
    console.error('❌ Erreur lors de la suppression des anciennes vidéos:', deleteVideosError);
    process.exit(1);
  }

  // 4. Insérer les vidéos de test
  const { error: videosError } = await supabase
    .from('youtube_videos')
    .insert(testVideos);

  if (videosError) {
    console.error('❌ Erreur lors de l\'insertion des vidéos:', videosError);
    process.exit(1);
  }
  console.log('✅ Vidéos insérées avec succès');

  // 5. Supprimer les anciennes statistiques de vidéos de test pour cet utilisateur
  const { error: deleteStatsError } = await supabase
    .from('youtube_video_stats')
    .delete()
    .eq('user_id', TEST_USER_ID);

  if (deleteStatsError) {
    console.error('❌ Erreur lors de la suppression des anciennes statistiques:', deleteStatsError);
    process.exit(1);
  }

  // 6. Insérer les statistiques de vidéos de test
  const { error: statsError } = await supabase
    .from('youtube_video_stats')
    .insert(testVideoStats);

  if (statsError) {
    console.error('❌ Erreur lors de l\'insertion des statistiques:', statsError);
    process.exit(1);
  }
  console.log('✅ Statistiques des vidéos insérées avec succès');

  console.log('\n🎉 Données de test YouTube insérées avec succès!');
  console.log(`🔑 ID Utilisateur de test: ${TEST_USER_ID}`);
  console.log(`📹 Vidéo ID 1: ${testVideos[0].video_id}`);
  console.log(`📹 Vidéo ID 2: ${testVideos[1].video_id}`);
  console.log('\n🔍 Vous pouvez maintenant tester l\'API YouTube avec ces données');
}

seedTestData()
  .catch(error => {
    console.error('❌ Erreur non gérée:', error);
    process.exit(1);
  });
