-- Ajouter la colonne config à la table integrations
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "config" JSONB DEFAULT '{}';
