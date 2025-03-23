-- Migration pour ajouter le champ is_verified et les champs de gestion des tokens

-- Ajouter le champ is_verified à la table users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;

-- Création d'une table pour les tokens de réinitialisation de mot de passe
CREATE TABLE IF NOT EXISTS public.reset_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  used BOOLEAN DEFAULT FALSE,
  token_type TEXT NOT NULL -- 'password_reset' ou 'email_verification'
);

-- Création d'un index pour la recherche rapide par token
CREATE INDEX IF NOT EXISTS reset_tokens_token_idx ON public.reset_tokens(token);

-- Création d'un index pour la recherche par user_id
CREATE INDEX IF NOT EXISTS reset_tokens_user_id_idx ON public.reset_tokens(user_id);

-- Trigger pour supprimer automatiquement les tokens expirés ou utilisés après 7 jours
CREATE OR REPLACE FUNCTION clean_old_tokens()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.reset_tokens 
  WHERE 
    (expires_at < now() OR used = TRUE) 
    AND created_at < (now() - interval '7 days');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà pour éviter les doublons
DROP TRIGGER IF EXISTS clean_tokens_trigger ON public.reset_tokens;

-- Créer le trigger pour nettoyer les tokens à chaque insertion
CREATE TRIGGER clean_tokens_trigger
AFTER INSERT ON public.reset_tokens
FOR EACH STATEMENT
EXECUTE FUNCTION clean_old_tokens();

-- Commentaires sur les nouvelles tables et colonnes
COMMENT ON COLUMN public.users.is_verified IS 'Indique si l''adresse email de l''utilisateur a été vérifiée';
COMMENT ON TABLE public.reset_tokens IS 'Stocke les tokens de réinitialisation de mot de passe et de vérification d''email';
COMMENT ON COLUMN public.reset_tokens.token_type IS 'Type de token: password_reset ou email_verification';
