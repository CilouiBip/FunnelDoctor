-- Fichier: youtube_oauth_migrations.sql

-- 1. Mettre u00e0 jour la colonne integration_type (NOT NULL avec valeur par du00e9faut)
ALTER TABLE "integrations" 
  ALTER COLUMN "integration_type" SET NOT NULL,
  ALTER COLUMN "integration_type" SET DEFAULT 'unknown';

-- 2. Ajouter une contrainte d'unicitu00e9
ALTER TABLE "integrations" 
  ADD CONSTRAINT IF NOT EXISTS unique_user_integration UNIQUE (user_id, integration_type);
  
-- 3. Vu00e9rifier les colonnes existantes
COMMENT ON COLUMN "integrations"."config" IS 'Stockage des configurations OAuth (tokens, etc.)';
COMMENT ON COLUMN "integrations"."integration_type" IS 'Type d''intu00e9gration (youtube, etc.)';

-- 4. Cru00e9ation d'une table de log si elle n'existe pas du00e9ju00e0
CREATE TABLE IF NOT EXISTS "oauth_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" TEXT NOT NULL,
  "integration_type" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "details" JSONB DEFAULT '{}',
  "error" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);
