# FunnelDoctor - Roadmap Révisée MVP v4 (Focus iClosed & Analytics) - MISE À JOUR 08/04/2025

## Vision MVP Core Réaffirmée

**Objectif :** SaaS pour infopreneurs pour tracker **fiablement** leur funnel marketing/ventes (YT -> Optin -> **RDV iClosed/Calendly** -> Stripe), **résoudre le lead stitching** (emails/`visitorId`), permettre de **définir les étapes de LEUR funnel**, et obtenir des **KPIs et taux de conversion actionnables par source/vidéo**.

**Point Clé :** Le **"Lead Stitching"** est fondamental (tracker même lead malgré emails différents via `visitorId` ou autre). Analytics/KPIs sont **CORE** au MVP.

## État Actuel (Post Corrections Récentes - 08/04/2025)

*   ✅ Backend/Frontend démarrent.
*   ✅ Auth utilisateur JWT fonctionne.
*   ✅ Intégration Calendly OAuth: Connexion/Reconnexion, Stockage Tokens+URIs OK.
*   ✅ Création Webhook Calendly V2: Configurée avec `/api/rdv/webhook-v2`.
*   ✅ Réception Webhook Calendly: Reçu sur `/api/rdv/webhook-v2`.
*   ✅ Résolution `userId` via Webhook Calendly: Fonctionne (utilise URIs stockées).
*   ✅ Traitement complet Webhook Calendly (`invitee.created`): Correction FK `visitors`, ajout colonne `integration_type`, création `touchpoint` finale.
*   ✅ Snippet JS: Existe (fonctionnalité de base `visitorId`, UTMs).
*   ✅ Endpoints Webhook iClosed (`/api/webhooks/iclosed`) & Stripe (`/api/payments/webhook`): Existent (logique basique).
*   ❓ Logique de Stitching: Existe (UTM, Bridge, Fallback) mais robustesse et configuration à valider (Comment UTM arrive? Comment Bridge est peuplé?).
*   ❌ Définition Funnel Personnalisé (API/UI): Non fait.
*   ❌ Calcul KPIs & Analytics Backend: Non fait.
*   ❌ UI Analytics (Dashboard KPIs, Vue Funnel, Rapport par Source): Non fait.
*   ❌ Sécurisation Webhooks (Signature): Non fait.
*   ❌ Nettoyage Déconnexion (Suppression Webhook): Non fait.

---

## Roadmap Détaillée par Blocs & Micro-Blocs (MB)

### **Phase 1 : Validation Complète du Tracking des Événements Clés**

*(Objectif : Assurer que TOUS les touchpoints (Visite, Opt-in, RDV iClosed/Calendly, Paiement) sont capturés, correctement attribués à un utilisateur et à un lead, et enregistrés dans la DB sans erreur)*

#### **Bloc 1.1 : Finalisation & Validation Webhook Calendly `invitee.created` (Priorité #1 Immédiate)**

*   **MB-1.1.1 : Correction Erreur Clé Étrangère `visitors`**
    *   **Objectif :** Permettre l'association du `visitor_id` fallback au `MasterLead` sans violer la contrainte FK.
    *   **Action :** Modifier `MasterLeadService` pour insérer le `visitor_id` fallback dans la table `visitors` si besoin avant de l'associer dans `lead_visitor_ids`.
    *   **Mesure de Succès :** Absence de l'erreur FK `lead_visitor_ids_visitor_id_fkey` dans les logs lors du traitement du webhook.
    *   **Statut : ✅ COMPLÉTÉ (07/04/2025)**
    *   **Priorité : CRITIQUE**
*   **MB-1.1.2 : Vérification/Correction Colonne `integration_type` Table `touchpoints`**
    *   **Objectif :** Permettre la création du touchpoint avec le type d'intégration.
    *   **Action :** Vérifier structure table `touchpoints` via Supabase Studio. Si `integration_type` manque, créer et appliquer une migration SQL (`ALTER TABLE public.touchpoints ADD COLUMN integration_type TEXT NULL;`). Vérifier absence de faute de frappe.
    *   **Mesure de Succès :** Absence de l'erreur `Could not find the 'integration_type' column...` dans les logs.
    *   **Statut : ✅ COMPLÉTÉ (07/04/2025)**
    *   **Priorité : CRITIQUE**
*   **MB-1.1.3 : Test E2E Webhook Calendly `invitee.created` (Post-Corrections)**
    *   **Objectif :** Confirmer que le flux complet (Réception Webhook -> Résolution UserId -> Stitching Lead (Fallback) -> Création Touchpoint) fonctionne sans aucune erreur.
    *   **Action :** Prendre un RDV test Calendly. Observer les logs backend. Vérifier la DB (`touchpoints` et `master_leads`).
    *   **Mesure de Succès :** Log `Touchpoint 'rdv_scheduled' créé avec succès...`. Enregistrement correct dans `touchpoints` lié au bon `user_id` et `master_lead_id`. AUCUNE ERREUR.
    *   **Statut : ✅ COMPLÉTÉ (07/04/2025)**
    *   **Priorité : CRITIQUE**

#### **Bloc 1.2 : Validation Webhook iClosed via Zapier (Priorité #2)**

*   **MB-1.2.1 : Configuration & Test Zap iClosed -> FunnelDoctor**
    *   **Objectif :** Assurer l'envoi correct des données iClosed (statut confirmé) vers `/api/webhooks/iclosed`.
    *   **Action (Mehdi/CTO) :** Configurer/tester le Zapier. Observer les logs backend FunnelDoctor.
    *   **Mesure de Succès :** Log de réception sur l'endpoint iClosed avec les données attendues.
    *   **Statut : À FAIRE/VALIDER**
    *   **Priorité : HAUTE**
*   **MB-1.2.2 : Validation Traitement Webhook iClosed & Stitching**
    *   **Objectif :** Confirmer traitement backend, stitching (comment `visitorId` ou email est récupéré/transmis via Zap ?), et création touchpoint `rdv_scheduled` ou `rdv_confirmed`.
    *   **Action (Windsurf/Mehdi) :** Analyser/Modifier contrôleur/service iClosed. Exécuter test Zapier. Vérifier logs & DB.
    *   **Mesure de Succès :** Touchpoint créé, lié au bon `user_id` et `MasterLead`.
    *   **Statut : À FAIRE/VALIDER**
    *   **Priorité : HAUTE**

#### **Bloc 1.3 : Validation Tracking Snippet & Stitching `visitorId` (Priorité #3)**

*   **MB-1.3.1 : Test Tracking Visite -> RDV (Calendly via UTM `visitorId`)**
    *   **Objectif :** Confirmer le stitching via `visitorId` passé en UTM `utm_content`.
    *   **Action (Mehdi) :** 1. Visite page (note `visitorId`). 2. RDV Calendly avec `?utm_content=VISITOR_ID` et email différent. Vérifier logs & DB.
    *   **Mesure de Succès :** Stitching utilise `visitorId` UTM, touchpoint lié au `MasterLead` initial.
    *   **Statut : À FAIRE**
    *   **Priorité : HAUTE**
*   **MB-1.3.2 : Test Tracking Visite -> RDV (iClosed via `visitorId` transmis par Zapier)**
    *   **Objectif :** Confirmer le stitching `visitorId` pour iClosed.
    *   **Action (Mehdi/CTO/Windsurf) :** 1. Visite page (note `visitorId`). 2. Simuler RDV iClosed via Zapier, **assurer transmission `visitorId`** (clarifier comment Zapier récupère/envoie ce `visitorId`). Email différent. Vérifier logs & DB.
    *   **Mesure de Succès :** Stitching utilise `visitorId` reçu, touchpoint lié au `MasterLead` initial.
    *   **Statut : À FAIRE (Clarification requise)**
    *   **Priorité : HAUTE**

#### **Bloc 1.4 : Finalisation Autres Intégrations (Priorité #4)**

*   **MB-1.4.1 : Validation Complète Stripe (Config + Webhook + Touchpoint `payment_succeeded`)**
    *   **Action (Mehdi/Windsurf) :** Configurer, tester paiement, vérifier logs & DB.
    *   **Mesure de Succès :** Touchpoint `payment_succeeded` créé et lié.
    *   **Statut : À FAIRE/VALIDER**
    *   **Priorité : HAUTE**
*   **MB-1.4.2 : Validation Complète YouTube (OAuth + Statut API)**
    *   **Action (Mehdi/Windsurf) :** Tester OAuth YT. Corriger erreur `/api/auth/youtube/status` (multiple rows).
    *   **Mesure de Succès :** Connexion/Déconnexion YT OK. Statut fiable.
    *   **Statut : À FAIRE/VALIDER**
    *   **Priorité : MOYENNE**
*   **MB-1.4.3 : Validation Complète Opt-in (Webhook + Stitching/Bridge)**
    *   **Action (Mehdi/Windsurf) :** Tester webhook opt-in. Vérifier création `MasterLead` et potentielle alimentation table `bridge`.
    *   **Mesure de Succès :** Touchpoint `optin` créé et lead associé. `bridge` alimenté si applicable.
    *   **Statut : À FAIRE/VALIDER**
    *   **Priorité : MOYENNE**

---

### **Phase 2 : Développement Interface & Logique Funnel/Analytics**

*(Objectif : Construire la couche de valeur métier visible par l'utilisateur)*

#### **Bloc 2.1 : Définition du Funnel**

*   **MB-2.1.1 : API Funnel Steps (CRUD & Ordonnancement)**
    *   **Objectif :** API REST `/api/funnel-steps` pour gérer les étapes par utilisateur, liées aux `event_type`.
    *   **Action :** Développer/Valider `FunnelStepsModule`. Tests API.
    *   **Mesure de Succès :** Gestion complète des étapes via API.
    *   **Statut : À FAIRE**
    *   **Priorité : HAUTE**
*   **MB-2.1.2 : UI Funnel Mapping**
    *   **Objectif :** Interface pour visualiser/réordonner/sauvegarder les étapes.
    *   **Action :** Développer page Next.js `/funnel-mapping`.
    *   **Mesure de Succès :** Utilisateur peut gérer son funnel visuellement.
    *   **Statut : À FAIRE**
    *   **Priorité : HAUTE**

#### **Bloc 2.2 : Calcul des KPIs & Analytics**

*   **MB-2.2.1 : Décision Archi Statut RDV "Réalisé" & Attribution Vidéo**
    *   **Objectif :** Décider techniquement COMMENT tracker RDV "réalisé" et attribuer à une vidéo YT source.
    *   **Action (CTO/Mehdi) :** Discussion et décision technique.
    *   **Mesure de Succès :** Stratégies claires définies.
    *   **Statut : À FAIRE**
    *   **Priorité : HAUTE**
*   **MB-2.2.2 : Implémenter `FunnelAnalyticsService` (Calcul KPIs)**
    *   **Objectif :** Logique backend pour calculer KPIs clés (Leads, RDV Gen, RDV Réal, Ventes, CA, Taux Conv...) par période/source/vidéo, basée sur funnel user.
    *   **Action :** Développer service NestJS. Tests unitaires.
    *   **Mesure de Succès :** Calculs corrects validés par tests.
    *   **Statut : À FAIRE**
    *   **Priorité : CRITIQUE**
*   **MB-2.2.3 : Créer Endpoints API Analytics (`/summary`, `/funnel`, `/by-source`)**
    *   **Objectif :** Exposer les calculs via API REST.
    *   **Action :** Développer contrôleur NestJS.
    *   **Mesure de Succès :** API renvoie données formatées pour UI.
    *   **Statut : À FAIRE**
    *   **Priorité : CRITIQUE**

#### **Bloc 2.3 : Affichage Frontend des Analytics**

*   **MB-2.3.1 : UI Dashboard Principal avec KPIs & Vue Funnel Simple**
    *   **Objectif :** Afficher KPIs agrégés et visualisation simple du funnel.
    *   **Action :** Développer page Next.js `/dashboard` (revue). Appels API `/summary`, `/funnel`.
    *   **Mesure de Succès :** KPIs clés visibles. Funnel visualisé.
    *   **Statut : À FAIRE**
    *   **Priorité : CRITIQUE**
*   **MB-2.3.2 : UI Rapport par Source/Vidéo**
    *   **Objectif :** Afficher performance ventilée (Leads, RDV, Ventes, CA...) par Vidéo YT.
    *   **Action :** Développer page/composant Next.js. Appel API `/by-source?groupBy=video`. Affichage tableau/graph.
    *   **Mesure de Succès :** Utilisateur peut analyser performance par contenu source.
    *   **Statut : À FAIRE**
    *   **Priorité : CRITIQUE**

---

### **Phase 3 : Finalisation & Tests E2E**

*(Objectif : Polir, refactoriser, tester de bout en bout)*

#### **Bloc 3.1 : Outils Utilisateur**

*   **MB-3.1.1 : Générateur de Snippet Finalisé**
    *   **Action :** Finaliser page `/tracking-snippet` avec `data-fd-site` dynamique. Bouton Copier.
    *   **Mesure de Succès :** Utilisateur récupère facilement son snippet.
    *   **Statut : À FAIRE/VALIDER**
    *   **Priorité : HAUTE**
*   **MB-3.1.2 : Template Zapier iClosed Finalisé**
    *   **Action (CTO/Mehdi) :** Créer et tester le template Zapier partageable.
    *   **Mesure de Succès :** Template fonctionnel et facile à utiliser.
    *   **Statut : À FAIRE**
    *   **Priorité : HAUTE**

#### **Bloc 3.2 : Refactoring & Améliorations Techniques**

*   **MB-3.2.1 : Refactoring Frontend (Hooks Custom - `useCalendlyAuth`, etc.)**
    *   **Action :** Nettoyer composants (ex: `/settings/integrations`) via hooks.
    *   **Mesure de Succès :** Code frontend plus propre et maintenable.
    *   **Statut : À FAIRE**
    *   **Priorité : MOYENNE**
*   **MB-3.2.2 : Sécurisation Webhooks (Vérification Signature Calendly/Stripe)**
    *   **Action :** Implémenter vérification signature dans contrôleurs webhook.
    *   **Mesure de Succès :** Endpoints sécurisés contre requêtes invalides.
    *   **Statut : À FAIRE**
    *   **Priorité : HAUTE (Sécurité)**
*   **MB-3.2.3 : Nettoyage Déconnexion (Suppression Webhook Calendly)**
    *   **Action :** Ajouter appel API DELETE webhook Calendly dans logique `revoke`.
    *   **Mesure de Succès :** Ressources Calendly nettoyées lors déconnexion.
    *   **Statut : À FAIRE**
    *   **Priorité : MOYENNE**

#### **Bloc 3.3 : Tests End-to-End & QA**

*   **MB-3.3.1 : Exécution Scénarios E2E Complets (Focus iClosed & KPIs)**
    *   **Action (Mehdi/CTO) :** Tester parcours complets (Visite YT -> Optin -> RDV iClosed -> Paiement Stripe). Vérifier stitching. Vérifier exactitude KPIs/Analytics affichés.
    *   **Mesure de Succès :** MVP fonctionnel, fiable et renvoie des données correctes et cohérentes.
    *   **Statut : À FAIRE**
    *   **Priorité : CRITIQUE (Validation Finale MVP)**

---

## Prochaine Étape IMMU00c9DIATE

**Étant donné que les blocs 1.1.1 et 1.1.2 ont été complétés avec succès (07/04/2025) :**

1. **Priorité #1 - Bloc 1.2 :** Validation du flux iClosed
   * Configuration du Zap iClosed
   * Test du webhook et vérification de la création du touchpoint

2. **Priorité #2 - Bloc 1.3 :** Validation du stitching via `visitorId`
   * Test du passage de `visitorId` via UTM pour Calendly
   * Clarification de la transmission du `visitorId` pour iClosed

3. **Priorité #3 - Bloc 2.1 :** Définition du funnel utilisateur
   * Développer/valider l'API REST `/api/funnel-steps`
   * Créer l'interface permettant de définir les étapes du funnel
