-- Supprimer l'ancienne contrainte d'unicité basée sur (name, integration_type)
-- Cette contrainte est la cause du problème qui empêche plusieurs utilisateurs d'avoir une intégration Calendly
ALTER TABLE integrations DROP CONSTRAINT IF EXISTS unique_name_integration;

-- La contrainte correcte 'integrations_user_id_integration_type_unique' existe déjà
-- Cette migration ne fait que supprimer la contrainte problématique

