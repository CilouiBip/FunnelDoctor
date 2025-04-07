-- Migration : Ajout de la colonne integration_type à la table touchpoints
-- Date : 2025-04-07

-- Vérifier si la colonne existe déjà pour éviter les erreurs
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_schema='public' AND table_name='touchpoints' 
                  AND column_name='integration_type') THEN
        ALTER TABLE public.touchpoints
        ADD COLUMN integration_type TEXT NULL;
        
        COMMENT ON COLUMN public.touchpoints.integration_type IS 'Source integration type (e.g., calendly, stripe, youtube)';
    END IF;
END
$$;
