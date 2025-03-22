-- Migration pour ajouter le champ slug aux funnel_steps existants
ALTER TABLE funnel_steps ADD COLUMN IF NOT EXISTS slug VARCHAR(50);

-- Mise à jour des enregistrements existants avec des slugs générés à partir des types
UPDATE funnel_steps
SET slug = CASE 
    WHEN type = 'SOCIAL_ORIGIN' THEN 'social'
    WHEN type = 'LANDING' THEN 'landing'
    WHEN type = 'VSL' THEN 'vsl'
    WHEN type = 'CALL_SCHEDULING' THEN 'call_sched'
    WHEN type = 'CALL_CLOSING' THEN 'call_closing'
    WHEN type = 'PAYMENT' THEN 'payment'
    WHEN type = 'DIRECT_BUY' THEN 'direct_buy'
    ELSE LOWER(REPLACE(label, ' ', '_')) || '_' || SUBSTRING(REPLACE(step_id::text, '-', ''), 1, 8)
END
WHERE slug IS NULL;

-- Rendre le champ slug obligatoire
ALTER TABLE funnel_steps ALTER COLUMN slug SET NOT NULL;
