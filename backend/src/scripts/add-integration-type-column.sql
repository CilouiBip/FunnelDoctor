-- Ajouter la colonne integration_type u00e0 la table integrations
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "integration_type" TEXT;
