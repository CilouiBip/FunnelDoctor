-- Migration pour cru00e9er les tables de stockage des donnu00e9es YouTube

-- Activer l'extension uuid-ossp pour gu00e9nu00e9rer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- Table des vidu00e9os YouTube
CREATE TABLE IF NOT EXISTS "youtube_videos" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "user_id" TEXT NOT NULL,
  "video_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "published_at" TIMESTAMP WITH TIME ZONE NOT NULL,
  "thumbnail_url" TEXT,
  "channel_id" TEXT NOT NULL,
  "channel_title" TEXT,
  "duration" TEXT,
  "tags" TEXT[],
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("user_id", "video_id")
);

-- Table des statistiques de vidu00e9os YouTube (permet le suivi historique)
CREATE TABLE IF NOT EXISTS "youtube_video_stats" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "video_id" UUID NOT NULL REFERENCES "youtube_videos"("id") ON DELETE CASCADE,
  "view_count" INTEGER NOT NULL DEFAULT 0,
  "like_count" INTEGER NOT NULL DEFAULT 0,
  "comment_count" INTEGER NOT NULL DEFAULT 0,
  "favorite_count" INTEGER NOT NULL DEFAULT 0,
  "engagement_rate" DECIMAL(10, 6),
  "fetched_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE("video_id", "fetched_at")
);

-- Index pour amu00e9liorer les performances des requu00eates
CREATE INDEX IF NOT EXISTS "idx_youtube_videos_user_id" ON "youtube_videos"("user_id");
CREATE INDEX IF NOT EXISTS "idx_youtube_videos_video_id" ON "youtube_videos"("video_id");
CREATE INDEX IF NOT EXISTS "idx_youtube_videos_published_at" ON "youtube_videos"("published_at");
CREATE INDEX IF NOT EXISTS "idx_youtube_video_stats_video_id" ON "youtube_video_stats"("video_id");
CREATE INDEX IF NOT EXISTS "idx_youtube_video_stats_fetched_at" ON "youtube_video_stats"("fetched_at");

-- Fonction pour mettre u00e0 jour le timestamp "updated_at"
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW(); 
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour mettre u00e0 jour le timestamp "updated_at" automatiquement
DROP TRIGGER IF EXISTS update_youtube_videos_updated_at ON "youtube_videos";
CREATE TRIGGER update_youtube_videos_updated_at
BEFORE UPDATE ON "youtube_videos"
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
