-- Script SQL pour créer la table funnel_steps dans Supabase

CREATE TABLE IF NOT EXISTS funnel_steps (
  step_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  slug VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(20),
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Créer un index sur user_id pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_funnel_steps_user_id ON funnel_steps(user_id);

-- Créer un index sur la combinaison user_id et position
CREATE INDEX IF NOT EXISTS idx_funnel_steps_user_position ON funnel_steps(user_id, position);

-- Commentaire sur la table
COMMENT ON TABLE funnel_steps IS 'Table qui stocke les étapes du funnel pour chaque utilisateur';
