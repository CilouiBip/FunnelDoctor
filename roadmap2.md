# FunnelDoctor - Roadmap de Développement (Version Mars 2025 - Stratégie v2)

**Document de Référence Principal**

## 1. Contexte et Vision

**Objectif FunnelDoctor :** Fournir aux infopreneurs et créateurs de contenu une vision claire et unifiée de la performance de leurs funnels marketing et ventes, en particulier pour le trafic organique (YouTube, etc.). L'outil vise à agréger les données de multiples sources (Analytics, CRM, Booking, Paiement) et à les lier au parcours visiteur pour identifier les points forts et les points faibles du funnel, de la source initiale jusqu'à la vente.

**Problème Principal Adressé :** La fragmentation des données et la difficulté à tracker de manière fiable le parcours d'un prospect à travers différents outils (YouTube -> Landing Page -> Opt-in -> Booking -> Paiement), surtout en gérant les identifiants multiples (cookies, emails).

**Stratégie Technique Clé Adoptée :**
Pour assurer un tracking fiable et robuste sans perturber les données marketing de l'utilisateur, nous adoptons l'approche **"Option 2 : Capture Frontend + API Pré-Association"** couplée à une logique de **"Data Stitching" basée sur un modèle "Master Lead"**.

## 2. Principes Directeurs

1.  **Qualité du Tracking (Priorité #1) :** L'objectif est d'atteindre un niveau de précision et de complétude maximal dans la reconstitution du parcours utilisateur, y compris la gestion des emails multiples.
2.  **Simplicité Utilisateur (Priorité #2) :** Minimiser la friction pour l'infopreneur lors de l'installation et de l'utilisation. Un seul snippet à installer, connexions API simples dans l'application.
3.  **Architecture Scalable et Robuste :** Construire sur des bases techniques saines (NestJS, Next.js, Supabase) permettant l'évolution future et découplées des spécificités excessives des outils tiers.

## 3. Architecture Fondamentale (Option 2 + Stitching)

1.  **Snippet FunnelDoctor (Unique) :**
    *   Installé par l'utilisateur sur toutes les pages de son funnel.
    *   **Partie 1 (`loader.js`) :** Gère l'initialisation, la création/lecture du `visitor_id` (stocké en localStorage/cookie first-party), la capture des UTMs initiaux, et l'envoi des `page_view`.
    *   **Partie 2 (`bridging.js`) :** Surveille les interactions clés (soumission de formulaire opt-in AC/CK, formulaire Calendly/iClosed, potentiellement clic bouton Stripe). **Au moment de l'action**, capture l'**email** entré par l'utilisateur et le **`visitor_id`** actuel.
2.  **API Backend - Bridge (`/api/bridge/associate`) :**
    *   Le snippet envoie `{ email, visitor_id, source_action }` à cet endpoint.
    *   Le backend enregistre cette association (table `bridge_associations` ou cache Redis).
3.  **API Backend - Webhooks Entrants (`/api/.../webhook`) :**
    *   Reçoit les notifications de Calendly, Stripe, AC (si configuré).
    *   Extrait l'**email** du payload du webhook.
4.  **Backend - Logique de Stitching (MVP) :**
    *   Utilise l'email du webhook pour chercher le(s) `visitor_id`(s) associé(s) via la table `bridge_associations`.
    *   Crée ou met à jour un `master_lead` dans Supabase.
    *   Associe l'email et le(s) `visitor_id`(s) à ce `master_lead`.
    *   Enregistre l'événement (RDV, paiement...) dans `touchpoints` en le liant au `master_lead_id` et au `visitor_id` pertinent (si trouvé).
5.  **Base de Données Supabase :**
    *   `visitors`: Stocke les `visitor_id`.
    *   `master_leads`: Table centrale représentant une personne unique.
    *   `lead_emails`: Associe plusieurs emails à un `master_lead`.
    *   `lead_visitor_ids`: Associe plusieurs `visitor_id` à un `master_lead`.
    *   `touchpoints`: Historique de tous les événements (page vue, clic, optin, rdv, paiement...) liés à `visitor_id` et `master_lead_id`.
    *   `bridge_associations`: Stockage temporaire des liens email <-> visitor_id.
    *   `integrations`: Stocke les clés API, tokens OAuth des services connectés.
    *   + Tables spécifiques (YouTube videos/stats, etc.).
6.  **Frontend (Dashboard) :** Lit les données agrégées et stitchées depuis le backend/Supabase pour afficher le parcours reconstitué et les KPIs.

## 4. Périmètre et Objectifs du MVP (Minimum Viable Product)

**Objectif Principal MVP :** Permettre à un infopreneur de tracker de manière fiable le parcours d'un prospect depuis une source (focus YouTube) jusqu'au paiement (Stripe), en passant par un opt-in (AC/CK) et une prise de RDV (Calendly), et de visualiser ce funnel agrégé dans un dashboard.

**INCLUS dans le MVP :**

*   **Tracking Core :** Snippet unique, génération `visitor_id`, capture UTM & `page_view`.
*   **Bridging (Option 2) :** API `/api/bridge/associate` + Logique JS frontend pour capturer email/visitor\_id sur **Calendly** et **ActiveCampaign/ConvertKit (Opt-in)**.
*   **Data Stitching (MVP) :** Modèle DB Master Lead + Logique backend pour associer email <-> visitor\_id <-> master\_lead. (Pas de fusion complexe de doublons en V1).
*   **Intégrations Clés (Connexion & Traitement Webhook/API) :**
    *   **YouTube :** OAuth pour connexion, récupération vidéos & stats de base.
    *   **Calendly :** Connexion via API PAT, setup webhook auto, traitement webhook `invitee.created` (utilisant les données du bridge).
    *   **Stripe :** Connexion via API Keys, setup webhook auto, traitement webhook `charge.succeeded` (utilisant email via bridge ou `visitor_id` via metadata si possible).
    *   **ActiveCampaign / ConvertKit :** Connexion via API Key, traitement association bridge pour opt-in. (Push vers AC = Bonus MVP / V1.1).
*   **Dashboard Minimal :**
    *   Vue "Executive Summary" : KPIs clés (Visiteurs, Leads, RDVs, Ventes, CA).
    *   Vue "Funnel" Simplifiée : Visualisation des étapes clés et taux de conversion (Source -> Visite -> Opt-in -> RDV -> Paiement).
    *   Vue "Sources" : Tableau des performances par `utm_source`.
    *   Vue "YouTube" : Tableau des vidéos + KPIs associés (vues, leads/RDV/ventes attribués).
*   **Onboarding :** Générateur de snippet unique, page d'intégration pour connecter les services.

**EXCLUS du MVP (Post-MVP / V2+) :**

*   Support avancé iClosed (dépendant de leur API).
*   Intégrations API/Webhook ClickFunnels / Systeme.io.
*   Logique de fusion avancée pour les `master_leads` dupliqués.
*   Configuration avancée du funnel ("Puzzle Editor" drag & drop).
*   Tracking avancé (fingerprinting, ad tracking détaillé).
*   Fonctionnalités IA (scoring, analyse prédictive).
*   Intégrations natives / Marketplace Apps.
*   Plugin WordPress / GTM template.
*   Fonctionnalités de reporting avancées (cohortes, segmentation poussée...).

## 5. Roadmap MVP - Implémentation par Micro-Blocs

---

**Phase 0 : Fondation & Investigation Critique (Prérequis)**

*   **MB-0.1 : Validation Faisabilité JS Bridging**
    *   **Objectif :** Confirmer qu'on peut techniquement capturer l'email depuis les formulaires Calendly et AC/CK via le snippet JS externe.
    *   **Tâches :** Investigation par Windsurf (cf. instruction précédente) sur l'accès aux iframes/widgets, écouteurs d'événements, timing d'envoi API.
    *   **Validation :** Rapport de faisabilité détaillé de Windsurf.
    *   **Mesure de Succès :** Décision Go/No-Go sur la fiabilité de l'Option 2. Identification des défis techniques majeurs.
    *   **Priorité :** **BLOQUANTE**.
*   **MB-0.2 : Conception Schéma DB "Master Lead"**
    *   **Objectif :** Définir la structure exacte des tables `master_leads`, `lead_emails`, `lead_visitor_ids` et leur relation avec `visitors`, `touchpoints`, `bridge_associations`.
    *   **Tâches :** Analyse table `leads` actuelle, conception nouveau schéma, préparation migrations Supabase initiales.
    *   **Validation :** Schéma validé par nous.
    *   **Mesure de Succès :** Structure DB prête pour le stitching MVP.
    *   **Priorité :** Haute.
*   **MB-0.3 : Setup Initial Backend & Config**
    *   **Objectif :** Assurer que le backend NestJS est propre, configuration via `.env` stable, CORS OK (dynamique pour prod future, fixe pour dev), logging basique en place.
    *   **Tâches :** Nettoyage `.env`, revue config CORS, setup logger standard.
    *   **Validation :** Démarrage stable, logs clairs, CORS fonctionnel pour `localhost` et `ngrok`.
    *   **Mesure de Succès :** Environnement backend sain.
    *   **Priorité :** Haute.

---

**Phase 1 : Core Tracking & Bridging Backend**

*   **MB-1.1 : Snippet Loader & `visitor_id`**
    *   **Objectif :** Avoir un `funnel-doctor.js` qui génère/lit un `visitor_id` stable et l'envoie avec les `page_view`.
    *   **Tâches :** Finaliser/tester `funnel-doctor.js`, endpoint `POST /api/touchpoints` fonctionnel pour `page_view`.
    *   **Validation :** `visitor_id` visible dans localStorage, `touchpoints` `page_view` créés dans Supabase avec le bon ID.
    *   **Mesure de Succès :** Tracking de base des visites fonctionnel.
    *   **Priorité :** Haute.
*   **MB-1.2 : API Bridge & Stockage Association**
    *   **Objectif :** Créer l'endpoint `/api/bridge/associate` et la table/cache pour stocker `{email, visitor_id, source_action}`.
    *   **Tâches :** Créer contrôleur/service NestJS, créer table `bridge_associations` Supabase (avec TTL logique ou nettoyage), implémenter l'enregistrement.
    *   **Validation :** Test API direct (Postman) pour insérer/lire des associations.
    *   **Mesure de Succès :** Le backend peut recevoir et stocker les pré-associations.
    *   **Priorité :** Haute.
*   **MB-1.3 : Logique Stitching MVP (Backend)**
    *   **Objectif :** Implémenter la logique backend qui utilise les données du bridge et des webhooks pour créer/mettre à jour les `master_leads` et lier les `touchpoints`.
    *   **Tâches :** Développer services (`MasterLeadService`, `StitchingService`?), adapter traitement webhooks (Calendly, Stripe, AC) pour chercher via `bridge_associations` et créer/MAJ `master_leads`, `lead_emails`, `lead_visitor_ids`. Lier `touchpoints.master_lead_id`.
    *   **Validation :** Tests unitaires et d'intégration simulant différents scénarios (nouvel email, email existant, nouveau visiteur...).
    *   **Mesure de Succès :** Le backend associe correctement les événements au bon "Master Lead" dans les cas simples.
    *   **Priorité :** Haute.

---

**Phase 2 : Fiabilisation Snippet JS Bridging (Focus Calendly)**

*   **MB-2.1 : Capture Email/ID Calendly (Embed)**
    *   **Objectif :** Implémenter et tester la logique JS dans `bridging.js` pour capturer email+visitor\_id depuis un **embed** Calendly et appeler `/api/bridge/associate`.
    *   **Tâches :** Codage JS (basé sur l'investigation MB-0.1), tests multi-navigateurs, gestion erreurs.
    *   **Validation :** Tests E2E : embed Calendly -> soumission -> appel API `/bridge/associate` réussi *avant* redirection.
    *   **Mesure de Succès :** Capture fiable pour Calendly Embed.
    *   **Priorité :** Critique (Haut Risque).
*   **MB-2.2 : Capture Email/ID Calendly (Lien Direct)**
    *   **Objectif :** Idem MB-2.1 mais pour un **lien direct** `<a>` pointant vers Calendly. (Peut nécessiter des techniques différentes si le formulaire s'ouvre sur le site Calendly).
    *   **Tâches :** Codage JS, tests.
    *   **Validation :** Tests E2E : clic lien -> soumission formulaire Calendly -> appel API `/bridge/associate` réussi (plus difficile à garantir si redirection externe rapide).
    *   **Mesure de Succès :** Capture fiable (ou meilleure tentative) pour Liens Directs Calendly.
    *   **Priorité :** Haute.

---

**Phase 3 : Intégrations (Setup & Webhooks Backend/Frontend)**

*   **MB-3.1 : Intégration Calendly (Backend + Frontend)**
    *   **Objectif :** Permettre à l'utilisateur de connecter Calendly via API PAT, configurer webhook auto, et traiter le webhook `invitee.created`.
    *   **Tâches :**
        *   Frontend : Page settings pour entrer la clé API PAT.
        *   Backend : API pour stocker clé PAT (sécurisée), API pour lister/créer/supprimer webhook Calendly via leur API, finaliser traitement webhook `/api/rdv/webhook-v2` (incluant validation signature et appel logique stitching MB-1.3).
    *   **Validation :** Connexion réussie dans l'UI, webhook créé dans Calendly, test E2E Calendly complet enregistre le RDV lié au bon `master_lead`.
    *   **Mesure de Succès :** Intégration Calendly fonctionnelle et auto-configurée.
    *   **Priorité :** Haute.
*   **MB-3.2 : Intégration Stripe (Backend + Frontend)**
    *   **Objectif :** Connecter Stripe, configurer webhook auto, traiter paiement réussi.
    *   **Tâches :**
        *   Frontend : Page settings pour entrer clés API Stripe.
        *   Backend : API pour stocker clés (sécurisées), API pour configurer webhook Stripe (`charge.succeeded`), traitement webhook Stripe (extraction email/metadata, appel logique stitching MB-1.3). **Tenter d'ajouter `visitor_id` aux metadata si possible.**
    *   **Validation :** Connexion réussie, webhook créé, test paiement enregistre la vente liée au bon `master_lead`.
    *   **Mesure de Succès :** Intégration Stripe fonctionnelle.
    *   **Priorité :** Haute.
*   **MB-3.3 : Intégration ActiveCampaign/ConvertKit (Opt-in)**
    *   **Objectif :** Connecter AC/CK, fiabiliser capture JS pour opt-in.
    *   **Tâches :**
        *   Frontend : Page settings pour entrer clé API AC/CK.
        *   Backend : API pour stocker clé.
        *   Snippet JS : Fiabiliser capture email/visitor\_id sur formulaires AC/CK (similaire MB-2.1).
        *   Backend : Logique stitching (MB-1.3) gère la source "optin".
    *   **Validation :** Connexion réussie, Test E2E opt-in -> appel API `/bridge/associate` -> `master_lead` créé/mis à jour.
    *   **Mesure de Succès :** Capture des opt-ins fonctionnelle.
    *   **Priorité :** Haute.

---

**Phase 4 : Intégration YouTube**

*   **MB-4.1 : Stabilisation OAuth & Récupération Données**
    *   **Objectif :** Avoir un flux OAuth YouTube fonctionnel et récupérer les vidéos/stats de base.
    *   **Tâches :** Revoir/corriger code OAuth (basé sur rapport ancien CTO), implémenter appels API YouTube (videos.list, analytics reports), stockage dans tables Supabase `youtube_*`. Gérer refresh tokens.
    *   **Validation :** Connexion/déconnexion YT fonctionnelle, vidéos/stats de base récupérées et stockées.
    *   **Mesure de Succès :** L'utilisateur peut connecter YouTube et voir ses vidéos dans FunnelDoctor.
    *   **Priorité :** Haute.

---

**Phase 5 : Dashboard MVP & Finalisation**

*   **MB-5.1 : Développement Frontend Dashboards**
    *   **Objectif :** Afficher les données trackées et stitchées de manière claire.
    *   **Tâches :** Créer composants React/Next.js pour vues Executive Summary, Funnel simple, Sources, YouTube. Appels API vers le backend pour récupérer les données agrégées.
    *   **Validation :** Dashboards affichent des données cohérentes avec les tests E2E.
    *   **Mesure de Succès :** L'utilisateur peut visualiser son funnel de base.
    *   **Priorité :** Haute.
*   **MB-5.2 : Générateur de Snippet Final**
    *   **Objectif :** Fournir UN seul bloc de code simple à copier pour l'utilisateur.
    *   **Tâches :** Mettre à jour l'UI/logique qui génère le snippet pour combiner `loader.js` et `bridging.js` proprement.
    *   **Validation :** Le snippet généré est unique, facile à copier, et fonctionne lors des tests.
    *   **Mesure de Succès :** Expérience d'installation simplifiée.
    *   **Priorité :** Medium (peut être fait en parallèle).
*   **MB-5.3 : Tests E2E Complets & QA**
    *   **Objectif :** Valider le flux complet YouTube -> Landing -> Optin -> Calendly -> Stripe.
    *   **Tâches :** Exécuter des scénarios de tests complets, identifier bugs et incohérences.
    *   **Validation :** Flux fonctionne comme attendu, données correctes dans le dashboard.
    *   **Mesure de Succès :** MVP fonctionnel et prêt pour premiers utilisateurs tests.
    *   **Priorité :** Critique.

---

## 6. Vision Post-MVP (Évolutions Futures)

*   Support avancé iClosed (API ou autre méthode).
*   Intégrations API/Webhook ClickFunnels, Systeme.io.
*   Logique de Fusion Avancée (gestion doublons `master_leads`).
*   Éditeur de Funnel Visuel ("Puzzle Funnel").
*   Amélioration Tracking (Fingerprinting, support Ad Platforms).
*   Reporting Avancé (Filtres complexes, Cohortes, LTV...).
*   Fonctionnalités IA (Lead Scoring, Prédictions...).
*   Intégrations Natives (Marketplaces, Plugin WP...).

## 7. Processus d'Onboarding Utilisateur (Simplifié)

1.  **Inscription** sur FunnelDoctor.
2.  **Copier le Snippet Unique** depuis la section "Tracking".
3.  **Coller le Snippet** sur toutes les pages de son site/funnel (via `<head>` ou GTM).
4.  **Connecter les Intégrations** (YouTube, Calendly, Stripe, AC/CK) via l'interface FunnelDoctor (OAuth ou Clés API). FunnelDoctor gère la configuration des webhooks.
5.  **Consulter les Dashboards.**
*(Support FunnelDoctor disponible pour aider à l'étape 3 si besoin au début).*

## 8. Risques Principaux & Mitigations (Stratégie v2)

*   **Risque 1 : Fiabilité de la Capture JS Frontend (Élevé)**
    *   Impact : Échec de la capture email/visitor\_id depuis formulaires externes (iframes, widgets tiers). Bridging échoue.
    *   Mitigation : Investigation technique approfondie (MB-0.1), tests multi-navigateurs/outils exhaustifs, fallback potentiel sur d'autres méthodes si une intégration spécifique bloque (ex: pour iClosed si pas d'accès JS). Monitoring attentif en production.
*   **Risque 2 : Complexité du Data Stitching**
    *   Impact : Bugs dans la logique de fusion, création de leads incorrects ou dupliqués.
    *   Mitigation : Commencer avec une logique MVP simple, ajouter des tests robustes, améliorer itérativement. Monitoring et outils de débogage/correction manuelle potentielle au début.
*   **Risque 3 : Dépendance aux APIs/Webhooks Externes**
    *   Impact : Changements non annoncés dans les APIs/formats de webhook Calendly, Stripe, etc., cassent l'intégration.
    *   Mitigation : Monitoring actif des webhooks, validation de schéma robuste (mais flexible), bonne gestion des erreurs, veille technologique sur les APIs partenaires.

## 9. Conclusion

Cette roadmap définit un chemin clair vers un MVP puissant et différenciant pour FunnelDoctor, basé sur une architecture de tracking robuste (Option 2 + Stitching) et une expérience utilisateur simplifiée. La priorité absolue est la qualité du tracking. L'implémentation se fera par micro-blocs, en commençant par la validation de la faisabilité technique du bridging JS.