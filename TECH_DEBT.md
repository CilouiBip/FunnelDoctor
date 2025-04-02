# FunnelDoctor - Dette Technique

Ce document recense les compromis techniques conscients faits durant le développement, ainsi que le plan pour les rembourser.

## Dette Actuelle

*   **Logique de Fusion Master Leads (Stitching Avancé) :** La logique actuelle (`MasterLeadService`) ne gère pas la fusion de `master_leads` distincts qui pourraient correspondre à la même personne (ex: via `visitor_id` commun mais emails différents).
    *   *Impact :* Risque de doublons de contacts dans l'analyse.
    *   *Remboursement :* À implémenter en Post-MVP (V1.1 ou V2). Nécessite une logique de détection et de fusion plus complexe.
*   **Support iClosed Fiable :** Le tracking automatisé et fiable des réservations iClosed (liaison email + visitor_id) est reporté Post-MVP en raison des limitations techniques actuelles (pas de webhook simple, iframe probable sans API JS). Le support MVP sera dégradé (au mieux, lien via email si Zapier utilisé par le client).
    *   *Impact :* Moins de valeur pour les utilisateurs d'iClosed.
    *   *Remboursement :* Surveiller les évolutions de l'API iClosed, ou implémenter la solution via Zapier (documentée) ou la redirection manuelle (moins idéale).
*   **Triggers & RLS Supabase :** La création des triggers (ex: `updated_at`) et des politiques RLS a été volontairement retirée de la migration initiale du schéma Master Lead (MB-0.2).
    *   *Impact :* Moins d'automatisation/sécurité au niveau DB pour l'instant.
    *   *Remboursement :* À ajouter via des migrations séparées une fois le schéma de base et la logique applicative validés.
*   **Migration Données Existantes :** La migration des données depuis l'ancien schéma `leads` vers la nouvelle structure (`lead_emails`...) n'a pas été incluse dans la migration MB-0.2.
    *   *Impact :* Les données préexistantes ne sont pas encore dans le nouveau format.
    *   *Remboursement :* Créer et exécuter un script/migration de migration de données dédié.
*   **Vérification Signature Webhook Calendly :** La méthode `verifyWebhookSignature` dans `CalendlyV2Service` retourne `true` pour l'instant.
    *   *Impact :* Faille de sécurité potentielle (accepte des webhooks non authentiques).
    *   *Remboursement :* Implémenter la vérification cryptographique réelle avant passage en production.
*   **Tests Automatisés (Unitaires & E2E) :** Couverture de tests très limitée pour l'instant.
    *   *Impact :* Risque de régressions plus élevé. Débogage plus long.
    *   *Remboursement :* Ajouter progressivement des tests unitaires (via la nouvelle règle de travail) et des tests E2E pour les flux critiques.

*(Ce fichier sera mis à jour au fil du développement)*

## Absence de Tests Unitaires pour RdvService

*   **Date:** 2025-04-02
*   **Fichier Concerné:** `backend/src/rdv/rdv.service.ts`
*   **Description:** Le service `RdvService`, responsable du traitement des webhooks liés aux rendez-vous (potentiellement Calendly ou autre) et de la création des associations/leads/touchpoints correspondants, ne possède actuellement **aucun fichier de test unitaire** (`rdv.service.spec.ts` est manquant).
*   **Risque:** Régression non détectée lors de modifications futures. Difficulté à valider le comportement isolé du service. Manque de documentation exécutable.
*   **Action Future (Post-MVP ou si ce service devient critique):** Créer une suite de tests unitaires pour `RdvService`, en mockant ses dépendances (`BridgingService`, `MasterLeadService`, `TouchpointsService`, `SupabaseService` si utilisé pour `conversion_events`).
