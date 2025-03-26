-- Migration pour ajouter les métriques d'engagement améliorées

-- Ajouter la colonne pour le taux d'engagement normalisé
ALTER TABLE "youtube_video_stats" 
ADD COLUMN IF NOT EXISTS "normalized_engagement_rate" DECIMAL(10, 6);

-- Ajouter la colonne pour le niveau d'engagement (catégorisation textuelle)
ALTER TABLE "youtube_video_stats" 
ADD COLUMN IF NOT EXISTS "engagement_level" TEXT;

-- Recalculer les valeurs existantes avec la nouvelle formule
-- Note: Cela utilisera une formule simplifiée car les anciennes données
-- n'ont pas la pondération likes=1x, comments=5x
UPDATE "youtube_video_stats"
SET 
  "normalized_engagement_rate" = LEAST("engagement_rate" / 0.1, 1),
  "engagement_level" = 
    CASE 
      WHEN "engagement_rate" >= 0.08 THEN 'Exceptionnel'
      WHEN "engagement_rate" >= 0.06 THEN 'Excellent'
      WHEN "engagement_rate" >= 0.04 THEN 'Très bon'
      WHEN "engagement_rate" >= 0.02 THEN 'Bon'
      WHEN "engagement_rate" >= 0.01 THEN 'Moyen'
      ELSE 'Faible'
    END
WHERE "normalized_engagement_rate" IS NULL;

-- Créer un index pour accélérer les requêtes sur le niveau d'engagement
CREATE INDEX IF NOT EXISTS "idx_youtube_video_stats_engagement_level" 
ON "youtube_video_stats"("engagement_level");
