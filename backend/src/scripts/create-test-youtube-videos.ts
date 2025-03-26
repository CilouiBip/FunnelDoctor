/**
 * Script temporaire pour créer des videos YouTube de test dans la base de données
 * Ce script est uniquement pour des tests et ne doit pas être utilisé en production
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SupabaseService } from '../supabase/supabase.service';

async function createTestYouTubeVideos() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const supabaseService = app.get(SupabaseService);
  
  const TEST_USER_ID = 'a23b3c5f-d742-4c7a-917b-9e1a18832982';
  
  // Données fictives pour 3 vidéos YouTube (sans les stats qui seront dans une table séparée)
  const testVideos = [
    {
      user_id: TEST_USER_ID,
      video_id: 'video123',
      title: 'Test Video 1',
      description: 'Description for test video 1',
      thumbnail_url: 'https://via.placeholder.com/120x90',
      published_at: new Date(new Date().getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 jours avant
      channel_id: 'channel123',
      channel_title: 'Test Channel',
      tags: ['test', 'video', 'example'],
      duration: 'PT5M30S' // 5 minutes et 30 secondes
    },
    {
      user_id: TEST_USER_ID,
      video_id: 'video456',
      title: 'Test Video 2',
      description: 'Description for test video 2 with more content',
      thumbnail_url: 'https://via.placeholder.com/120x90',
      published_at: new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 jours avant
      channel_id: 'channel123',
      channel_title: 'Test Channel',
      tags: ['test', 'content'],
      duration: 'PT8M15S' // 8 minutes et 15 secondes
    },
    {
      user_id: TEST_USER_ID,
      video_id: 'video789',
      title: 'Test Video 3',
      description: 'Description for recent test video 3',
      thumbnail_url: 'https://via.placeholder.com/120x90',
      published_at: new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 jours avant
      channel_id: 'channel123',
      channel_title: 'Test Channel',
      tags: ['recent', 'latest'],
      duration: 'PT3M45S' // 3 minutes et 45 secondes
    }
  ];
  
  try {
    // Insérer les vidéos dans la base de données
    const { data: videosData, error: videosError } = await supabaseService.getAdminClient()
      .from('youtube_videos')
      .upsert(testVideos, { onConflict: 'user_id,video_id' })
      .select('id, video_id');
    
    if (videosError) {
      console.error('Erreur lors de la création des vidéos de test:', videosError);
    } else {
      console.log(`${testVideos.length} vidéos de test créées avec succès`);
      
      // Créer les statistiques pour chaque vidéo
      const now = new Date().toISOString();
      const statsPromises = videosData.map(video => {
        let viewCount, likeCount, commentCount, favoriteCount;
        
        // Attribuer des stats selon l'ID de la vidéo
        switch(video.video_id) {
          case 'video123':
            viewCount = 1250;
            likeCount = 45;
            commentCount = 12;
            favoriteCount = 3;
            break;
          case 'video456':
            viewCount = 2500;
            likeCount = 120;
            commentCount = 45;
            favoriteCount = 10;
            break;
          case 'video789':
            viewCount = 500;
            likeCount = 25;
            commentCount = 8;
            favoriteCount = 1;
            break;
        }
        
        const engagementRate = viewCount > 0 
          ? (likeCount + commentCount) / viewCount 
          : 0;
        
        return supabaseService.getAdminClient()
          .from('youtube_video_stats')
          .insert({
            video_id: video.id, // Utiliser l'ID généré par Supabase, pas l'ID YouTube
            view_count: viewCount,
            like_count: likeCount,
            comment_count: commentCount,
            favorite_count: favoriteCount,
            engagement_rate: engagementRate,
            fetched_at: now,
          });
      });
      
      // Attendre que toutes les stats soient insérées
      const statsResults = await Promise.all(statsPromises);
      console.log(`Statistiques créées pour ${statsResults.length} vidéos`);
      
      // Créer des commentaires fictifs pour la vidéo 3 (video789)
      const video3 = videosData.find(v => v.video_id === 'video789');
      if (video3) {
        const testComments = [
          {
            user_id: TEST_USER_ID,
            video_id: video3.id, // Utiliser l'ID de la BDD, pas l'ID YouTube
            comment_id: 'comment1',
            author_display_name: 'Viewer One',
            author_profile_image_url: 'https://via.placeholder.com/48',
            text_display: 'Great video! Very informative.',
            like_count: 5,
            published_at: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 jours avant
          },
          {
            user_id: TEST_USER_ID,
            video_id: video3.id, // Utiliser l'ID de la BDD, pas l'ID YouTube
            comment_id: 'comment2',
            author_display_name: 'Viewer Two',
            author_profile_image_url: 'https://via.placeholder.com/48',
            text_display: 'I have a question about the topic. Can you explain further?',
            like_count: 2,
            published_at: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 jours avant
          }
        ];
        
        const { error: commentsError } = await supabaseService.getAdminClient()
          .from('youtube_comments')
          .upsert(testComments, { onConflict: 'user_id,video_id,comment_id' });
        
        if (commentsError) {
          console.error('Erreur lors de la création des commentaires de test:', commentsError);
        } else {
          console.log(`${testComments.length} commentaires de test créés avec succès`);
        }
      } else {
        console.log('Vidéo 3 non trouvée, commentaires non créés');
      }
    }
  } catch (error) {
    console.error('Erreur générale lors de la création des données de test:', error);
  } finally {
    await app.close();
  }
}

createTestYouTubeVideos()
  .then(() => console.log('Script terminu00e9 avec succu00e8s'))
  .catch(err => console.error('Erreur dans le script:', err))
  .finally(() => process.exit(0));
