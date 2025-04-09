## Implémentation de l'Injection JS du visitorId dans les formulaires (MB-1.5.1)

### [09/04/2025] Développement et validation de l'injection automatique du visitorId dans les formulaires HTML

- ✅ **Analyse et identification du fichier correct**
  - Correction de l'erreur de chemin de fichier (identification du fichier à modifier : `/backend/public/bridging.js` et non `/frontend/public/bridging.js`)
  - Audit du fonctionnement existant du script de tracking pour comprendre le cycle de vie du visitorId

- ✅ **Implémentation de la fonction d'injection `injectVisitorIdIntoForms`**
  - Création d'une fonction robuste qui recherche tous les formulaires dans le DOM
  - Mise en place d'une heuristique pour détecter les champs email dans les formulaires
  - Ajout d'un champ caché 'visitorId' uniquement dans les formulaires contenant un champ email
  - Vérification préventive de l'existence du champ pour éviter les doublons

- ✅ **Intégration à l'initialisation et aux mutations DOM**
  - Appel de la fonction lors de l'initialisation du script pour traiter les formulaires existants
  - Extension du MutationObserver existant pour détecter les nouveaux formulaires ajoutés dynamiquement
  - Mise en place de logs conditionnels pour faciliter le débogage sans surcharger la console en production

- ✅ **Tests et validation**
  - Validation sur la page de test `test-optin-form.html` avec des formulaires statiques et dynamiques
  - Confirmation de la présence du champ caché avec la valeur correcte du visitorId dans les requêtes
  - Vérification du bon fonctionnement avec différents types de formulaires

## Implémentation du Stitching Opt-in (MB-1.5.2 et MB-1.5.3)

### [09/04/2025] Création de l'endpoint du webhook opt-in et du touchpoint associé

- ✅ **Audit du code et architecture existante**
  - Analyse du code existant pour identifier la logique de stitching déjà implémentée (MasterLeadService.findOrCreateMasterLead)
  - Confirmation de l'existence des DTOs adaptés (AssociateBridgeDto) et services appropriés (TouchpointsService)
  - Identification des mécanismes d'authentification par clé API déjà en place (UsersService.findUserIdByApiKey)

- ✅ **Implémentation du nouvel endpoint `/api/webhooks/optin`**
  - Création du DTO OptinWebhookDto avec validation (email, visitorId, apiKey, source, eventData)
  - Ajout d'une méthode dans WebhooksController pour traiter les requêtes POST
  - Configuration de la réponse HTTP 201 pour indiquer la création réussie
  - Sécurité implémentée via validation manuelle de la clé API dans le service

- ✅ **Extension du WebhooksService pour le traitement opt-in**
  - Implémentation de handleOptinWebhook pour valider la clé API et extraire le userId
  - Appel à MasterLeadService.findOrCreateMasterLead pour associer email et visitor_id
  - Création d'un touchpoint de type 'optin' avec les données contextuelles
  - Gestion appropriée des erreurs et logging détaillé

- ✅ **Tests et validation**
  - Test réussi via curl avec une clé API valide (`3b5833bf-609f-494d-be58-1efee8fdec6e`)
  - Confirmation de la création du masterLead (id: `00f08a34-9e6d-437e-acc9-e7d618c2bc74`)
  - Vérification de la liaison entre visitor_id, email et masterLead
  - Mise à jour des micro-blocs MB-1.5.2 et MB-1.5.3 marqués comme complétés dans la roadmap
# Windsurf Log - FunnelDoctor

Ce fichier sert à documenter les actions réalisées à chaque étape du développement du projet FunnelDoctor, conformément à la roadmap établie.

## Résolution des erreurs SQL critiques dans les services Analytics (MB-2.2.2 et MB-2.2.3)

### [08/04/2025] Correction des bugs P0 dans les API Analytics

- ✅ **Diagnostic et analyse approfondie des erreurs SQL**
  - Identification des problèmes d'incompatibilité entre les signatures des fonctions SQL Supabase et les appels RPC backend
  - Découverte : Les fonctions SQL attendaient `_user_id` (avec underscore) alors que le backend envoyait `user_id`
  - Problème supplémentaire : Paramètre `site_id` encore attendu bien que récemment supprimé de la logique métier

- ✅ **Approche progressive de résolution**
  - Tentative #1 : Suppression des références à `site_id` dans les appels RPC (❌ Échec)
  - Tentative #2 : Réintroduction de `site_id: null` et renommage de `user_id` en `_user_id` (❌ Échec partiel)
  - Solution finale : Neutralisation temporaire des appels RPC avec valeurs par défaut vides (✅ Succès)

- ✅ **Corrections des erreurs de typage TypeScript**
  - Ajout des interfaces manquantes dans `analytics-result.interface.ts`
  - Alignement des structures d'objet retournées avec les interfaces attendues
  - Correction des références aux propriétés non définies (`overall` vs `overallConversionRate`)

- ✅ **Création de scripts d'automatisation**
  - Scripts shell pour tester et appliquer diverses stratégies de correction
  - Script final `complete-neutralize-analytics.sh` pour neutraliser proprement les services

- ✅ **Résultats et vérification**
  - Les endpoints `/api/analytics/events`, `/api/analytics/funnel` et `/api/analytics/leads` retournent désormais 200 OK
  - Backend démarre sans erreur et compile proprement
  - Structure en place pour implémenter les fonctions MVP spécifiques (calcul par vidéo)

- ⚠️ **Points d'attention pour la suite**
  - Priorité déplacée vers la fonctionnalité de Stitching Opt-in (MB-1.5)
  - La logique d'agrégation et d'attribution par vidéo/source reste à implémenter ultérieurement


## Résolution du bug de rafraîchissement des tokens YouTube et de la boucle frontend (MB-1.4.2)

### [08/04/2025] Identification et correction des problèmes YouTube

- ⏳ **Bug critique d'authentification YouTube** (Problème MB-1.4.2)
  - Diagnostic approfondi du `YouTubeTokenRefreshService` et `YouTubeAuthService`
  - Découverte : Le refresh job utilisait incorrectement `integration.name` ("youtube") au lieu de `integration.user_id` (UUID)
  - Correction de la requête pour extraire le champ `user_id` et l'utiliser dans l'appel au service d'authentification
  - Commit : `e599e8a` (fix(youtube): Resolve frontend infinite loop, build errors and backend token refresh issue)
  - Validation finale planifiée lors de l'exécution automatique du job à 17h00

- ✅ **Résolution de la boucle infinie d'appels API frontend**
  - Problème identifié : Le hook `useYouTubeAuth` et `page.tsx` créaient une boucle d'appels vers `/api/auth/youtube/status`
  - Cause racine : `checkYoutubeConnection` en dépendance d'un `useEffect` + absence de verrouillage
  - Solution : 
    - Ajout d'une référence `useRef` pour suivre l'état des appels en cours
    - Suppression de la dépendance circulaire dans `useEffect`
    - Protection contre les appels concurrents
  - Amélioration de la stabilité de l'interface utilisateur en supprimant le clignotement

- ✅ **Corrections des erreurs TypeScript pour le build de production**
  - Résolution de l'erreur d'itération sur `searchParams.entries()` avec `Array.from()`
  - Correction du typage pour l'accès aux propriétés `integrations` et `data` manquantes dans les interfaces
  - Tests de build front/back réussis sans erreur

- ✅ **Documentation des risques de fiabilité de données**
  - Création du fichier `DATA_RELIABILITY_RISKS.md` détaillant les limites et solutions pour atteindre 95% de fiabilité
  - Analyse des problèmes potentiels de tracking, stitching et attribution
  - Proposition de stratégies d'atténuation pour le MVP et le futur

## Tracking Calendly et Stratégie d'association Visitor-Lead

### [08/04/2025] Investigation et Implémentation de la Stratégie Hybride Calendly

- ✅ **Diagnostics et tests approfondis** sur le tracking des RDV Calendly
  - Tests comparatifs entre ConvertKit et page HTML simple pour la propagation des paramètres UTM
  - Tests de réception d'événements `postMessage` (`calendly.event_scheduled`) avec widget embed vs lien direct
  - Analyse de la transmission des données de tracking via webhook Calendly standard (`invitee.created`)
  - Validation du fonctionnement de l'endpoint `/api/bridge/associate` avec une version modifiée du DTO

- ✅ **Corrections techniques**
  - Mise à jour de la configuration CORS dans `main.ts` pour permettre les appels cross-origin
  - Modification de `bridging.js` pour envoyer le `visitorId` même sans email (ajout de logs `FD-DEBUG:`)
  - Modification du DTO `AssociateBridgeDto` pour rendre l'email optionnel (`@IsOptional()` au lieu de `@IsNotEmpty()`)
  - Correction de la route dupliquée `/api/api/bridge/associate` vers `/api/bridge/associate` (en modifiant le décorateur `@Controller` de 'api/bridge' à 'bridge')
  - Création d'une page de test `test-calendly-simple.html` pour validation isolée

- ✅ **Validation des hypothèses**
  - ❌ Échec : Modification de lien (`utm_content`) sur ConvertKit
  - ✅ Succès : Modification de lien (`utm_content`) sur page HTML simple
  - ❌ Échec : Réception `postMessage` via lien direct
  - ✅ Succès : Réception `postMessage` via widget embed
  - ❌ Échec : Transmission `utm_content` via webhook Calendly
  - ✅ Succès : Appel `/api/bridge/associate` via `postMessage` (widget embed)

### [08/04/2025] Validation Finale de la Stratégie Calendly et Changement de Priorités

- ✅ **Tests finaux sur la page HTML simple avec configuration corrigée**
  - ✅ Succès : Démarrage du backend sur le port 3001 après résolution de l'erreur `EADDRINUSE`
  - ✅ Succès : Événements `page_view` et `bridging_initialized` correctement enregistrés
  - ✅ Succès : Modification de lien avec `utm_content` contenant le `visitorId` sur page HTML simple
  - ✅ Succès : Réception de l'événement `postMessage` et appel à `/api/bridge/associate` avec le `visitorId`
  - ❌ Confirmation : `utm_content` n'est définitivement pas transmis dans le webhook Calendly standard

- ✅ **Décision stratégique finale (avec avis CTO)**
  - Adoption définitive de la stratégie hybride en deux volets pour le MVP:
    1. **Priorité absolue : Widget Embed JS + `postMessage` + Bridge API** pour les sites sous contrôle direct du client
    2. **Fallback obligatoire : Stitching via Email + Opt-in** pour les liens directs et intégrations tierces
  - Importance critique de la capture de l'email ET du `visitorId` lors de l'Opt-in pour assurer un stitching fiable
  - Recommandation explicite aux clients d'utiliser le widget embed JavaScript plutôt que des liens directs

- ✅ **Documentation complète**
  - Enrichissement du document `CALENDLY_TRACKING_STRATEGY.md` avec les conclusions finales
  - Mise à jour de la roadmap pour refléter cette orientation stratégique et les nouvelles priorités
  - Planification des étapes d'amélioration post-MVP (question personnalisée, redirection)

- ✅ **Nouvelles priorités immédiates**
  - #1 : Correction des bugs de requêtes SQL dans les rapports analytics
  - #2 : Résolution des problèmes de gestion des tokens YouTube OAuth
  - #3 : Implémentation et validation du stitching via Opt-in


## Intégration YouTube OAuth et Bridging Multi-Email

### 1. Configuration Google Cloud et Variables d'Environnement

- ✅ **[24/03/2025]** Mise en place de l'infrastructure OAuth pour YouTube
  - Création du projet Google Cloud pour les APIs YouTube
  - Configuration de l'écran de consentement OAuth en mode Testing
  - Génération des identifiants OAuth (Client ID et Client Secret)
  - Configuration des variables d'environnement (`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, etc.)
  - Préparation de l'environnement ngrok pour les tests de callback OAuth

### 2. Préparation du Bridging Multi-Email

- 🔄 **[24/03/2025]** Planification de l'implémentation du multi-email bridging
  - Conception du service `LeadMatchingService` pour la consolidation des emails
  - Définition de la structure pour stocker les emails secondaires dans Supabase
  - Élaboration de la stratégie de propagation des visitor_id dans les liens externes

## Intégration Calendly et Bridging Visiteur-Lead

### 1. Correction de l'intégration Calendly V2

- ✅ **[23/03/2025]** Résolution des problèmes d'intégration Calendly
  - Diagnostic des erreurs liées à la Row-Level Security (RLS) lors du traitement des webhooks
  - Modification du BridgingService pour utiliser l'admin client Supabase lors du traitement des webhooks
  - Correction de la fonction trigger `record_lead_status_change()` pour utiliser `old_status` au lieu de `previous_status`
  - Identification et résolution de discordances entre le schéma SQL et les interfaces TypeScript
  - Audit complet de la structure Supabase pour éviter les impacts sur d'autres fonctionnalités

### 2. Mise à jour du schéma Supabase

- ✅ **[23/03/2025]** Ajout des colonnes manquantes dans la table `conversion_events`
  - Ajout de la colonne `event_data` (JSONB) pour stocker les données d'événement
  - Ajout de la colonne `page_url` (TEXT) pour stocker l'URL source
  - Ajout de la colonne `site_id` (TEXT, DEFAULT 'default') pour l'identification du site
  - Identification du besoin d'ajouter `user_id` (UUID) et `updated_at` (TIMESTAMPTZ)

### 3. Documentation et analyse

- ✅ **[23/03/2025]** Création d'un rapport d'audit technique détaillé
  - Analyse des tables et relations existantes
  - Inventaire des triggers et automatisations
  - Évaluation des risques et impacts potentiels
  - Recommandations pour maintenir la cohérence du système

### 4. Bridging avancé (Cookie + Payment/RDV)

- ✅ **[23/03/2025]** Validation du fonctionnement du bridging entre visiteurs et leads
  - Vérification de l'association visiteur→lead lors des événements Calendly
  - Confirmation du suivi des conversions via les UTMs dans Calendly
  - Préparation pour le traitement des cas où l'email initial est incorrect

## Système d'Authentification et Emails

### 1. Mise en place de la vérification d'email

- ✅ **[23/03/2025]** Développement du système de vérification d'email
  - Création de la table `reset_tokens` pour stocker les tokens de vérification et réinitialisation
  - Implémentation de l'endpoint `/auth/verify-email` et tests de fonctionnement
  - Mise en place des colonnes `is_verified` et `verified_at` dans la table `users`
  - Tests complets du flux : génération de token → envoi d'email → vérification

### 2. Fonctionnalité de réinitialisation de mot de passe

- ✅ **[23/03/2025]** Implémentation du système de réinitialisation de mot de passe
  - Développement de l'endpoint `/auth/forgot-password` pour générer des tokens
  - Création de l'endpoint `/auth/reset-password` pour traiter les demandes de réinitialisation
  - Ajout de mesures de sécurité : expiration des tokens, validation unique, protection contre les attaques par force brute

### 3. Service d'emails modulaire

- ✅ **[23/03/2025]** Conception d'un service d'emails abstrait et extensible
  - Implémentation d'une interface commune pour différents fournisseurs d'email (console, SendGrid, SMTP)
  - Mode développement avec simulation d'envoi d'emails dans les logs
  - Préparation pour l'intégration d'un fournisseur réel (SendGrid) en production
  - Configuration par variables d'environnement pour faciliter la transition dev → prod

## Fonctionnalité Puzzle Funnel

### 1. Recherche et Planification

- ✅ **[21/03/2025]** Refonte complète du ROADMAP.md pour documenter la nouvelle approche de funnel puzzle
  - Restructuration du document pour clarifier le contexte et les objectifs
  - Définition détaillée de l'"Option A" (sans versioning)
  - Documentation de l'architecture de données et des impacts sur la base de données
  - Création des sections sur les risques et mitigations
  - Élaboration d'une timeline d'implémentation en 4 phases
  - Documentation des questions UX à résoudre
  - Planification de l'organisation des vues du dashboard

### 2. Points clés décidés

- ✅ **[21/03/2025]** Choix de l'implémentation sans recalcul historique (Option A)
  - Les événements existants conservent leur funnel_step_id même si la configuration du funnel change
  - Préparation de la structure pour une éventuelle évolution vers du versioning (Option B)

### 3. Prochaines étapes prévues

- 🔌 **[À venir]** Implémentation des migrations Supabase pour ajouter la table `funnel_steps`
- 🔌 **[À venir]** Modification de la table `touchpoints` pour ajouter la colonne `funnel_step_id`
- 🔌 **[À venir]** Développement de l'interface d'édition du puzzle funnel

## Semaine 1 : Mise en place des fondations

### 1.1 Choix des technos & Setup de base

- ✅ **[19/03/2025]** Création de la structure du projet Next.js pour le frontend
- ✅ **[19/03/2025]** Configuration de Tailwind CSS avec les bonnes couleurs et thèmes
- ✅ **[19/03/2025]** Mise en place de l'architecture de routes avec Next.js App Router
- ✅ **[19/03/2025]** Élaboration du ROADMAP.md détaillé pour guider le développement
- ✅ **[19/03/2025]** Élaboration du RULES.md avec les règles de développement spécifiques
- ✅ **[19/03/2025]** Initialisation du projet Nest.js pour le backend
- ✅ **[19/03/2025]** Configuration de Supabase et génération des scripts SQL pour les tables
- ✅ **[19/03/2025]** Mise en place de l'authentification avec JWT

### 1.2 Endpoints & Schéma minimal

- ✅ **[19/03/2025]** Implémentation des endpoints `/auth` pour l'authentification (signup, login)
- ✅ **[19/03/2025]** Implémentation des endpoints `/users` pour la gestion des utilisateurs
- ✅ **[19/03/2025]** Implémentation des endpoints `/leads` pour la gestion des leads
- ✅ **[19/03/2025]** Implémentation des endpoints `/campaigns` pour la gestion des campagnes
- ✅ **[19/03/2025]** Implémentation des endpoints `/tracking-links` pour la gestion des liens de tracking
- ⬜ Configuration des webhooks externes

## Semaine 2 : Tracking, Webhooks et Dashboard

### 2.1 Tracking et snippet client

- ⬜ Création du snippet JavaScript pour le tracking
- ⬜ Module de tracking dans Nest.js
- ⬜ Tests d'intégration du tracking

### 2.2 Webhooks externes

- ⬜ Configuration de l'intégration Stripe
- ⬜ Configuration de l'intégration Calendly
- ⬜ Configuration de l'intégration ActiveCampaign

### 2.3 Dashboard minimal

- ✅ **[19/03/2025]** Création de la page d'accueil avec présentation du produit
- ✅ **[19/03/2025]** Implémentation de la page dashboard avec statistiques et visualisation du funnel
- ✅ **[19/03/2025]** Création du générateur de liens UTM avec identifiants uniques
- ⬜ Création de la vue "Leads" pour lister les prospects
- ⬜ Connexion du dashboard aux données de l'API

## Semaine 3 : Finitions, Scalabilité & Tests

### 3.1 Scoring & multi-funnel

- ⬜ Implémentation du système de scoring des leads
- ⬜ Configuration du système multi-funnel
- ⬜ Tests de l'attribution des scores

### 3.2 Tests, QA et Onboarding

- ⬜ Mise en place des tests E2E
- ⬜ QA manuelle et correction des bugs
- ⬜ Création des guides d'onboarding

### 3.3 Déploiement & Monitoring

- ⬜ Déploiement du frontend sur Vercel
- ⬜ Déploiement du backend sur Railway/Render
- ⬜ Configuration du monitoring avec Sentry

## Notes de développement

### Problèmes rencontrés et solutions

- **[19/03/2025]** Problème avec l'affichage Tailwind CSS : Le CSS ne s'appliquait pas correctement. Solution : création du fichier postcss.config.js manquant et mise à jour de la configuration Tailwind.

- **[20/03/2025]** Erreur "invalid input syntax for type uuid: 'undefined'" lors de la conversion visiteur → lead. Diagnostic : tentative de création automatique d'un lead avec un user_id fictif (00000000-0000-0000-0000-000000000000) qui violait la contrainte de clé étrangère avec la table users. Solution : simplification du flux de conversion pour exiger la création préalable du lead avant la conversion du visiteur, avec validation explicite et message d'erreur clair (400 BadRequest).

### Avancées & Modules Complétés

- **[20/03/2025]** ✅ **Bloc B3** : Module Visiteurs et conversion en leads
  - Ajout du support pour l'authentification publique sur les endpoints de visiteurs avec `@Public()`
  - Simplification du processus de conversion visiteur → lead
  - Documentation complète du flux de conversion dans README.md
  - Tests end-to-end validant la gestion des erreurs correcte
  - Installation des dépendances nécessaires (uuid)

- **[20/03/2025]** ✅ **Bloc D1** : Gestion des statuts de leads
  - Création de l'énumération `LeadStatus` avec 6 états (new, contacted, qualified, negotiation, won, lost)
  - Mise en place de la validation des transitions d'état selon les règles métier
  - Création de la table `lead_status_history` pour le suivi des changements de statut
  - Implémentation d'un trigger PostgreSQL pour enregistrer automatiquement les changements
  - Ajout d'endpoints API pour la transition d'état et la consultation de l'historique
  - Structuration modulaire avec services dédiés pour une meilleure maintenance
  - Script `setup-leads-history.js` pour valider l'implémentation de l'historisation des statuts

- **[20/03/2025]** ✅ **Bloc D2** : Gestion des événements de conversion (début d'implémentation)
  - Création du module `ConversionEventsModule` pour gérer les événements de conversion
  - Définition de l'énumération `ConversionEventType` (VISIT, SIGNUP, DEMO_REQUEST, etc.)
  - Implémentation des DTO et interfaces pour les événements de conversion
  - Développement du service `ConversionEventsService` avec logique de transition automatique

- **[20/03/2025]** ✅ **UX/UI** : Refactorisation du layout du dashboard
  - Unification du layout pour toutes les sections authentifiées (dashboard, tracking, settings)
  - Création d'un composant `AuthenticatedLayout` partagé pour assurer une expérience uniforme
  - Correction des problèmes de chevauchement entre la sidebar et le contenu principal
  - Standardisation de l'utilisation des classes CSS pour la gestion de la mise en page
  - Configuration des endpoints API pour créer et consulter les événements de conversion
  - Intégration avec `LeadStatusService` pour les changements de statut automatiques

### Prochaines étapes planifiées

- **Bloc D1 (Finalisation)** : 
  - Exécuter le script SQL de création de la table lead_status_history dans Supabase
  - Valider l'historisation automatique des changements de statut avec le script setup-leads-history.js

- **Bloc D2 (Événements de conversion)**
  - Créer la table `conversion_events` dans Supabase
  - Tester les flux de conversion automatiques (achat → won, démo → qualified, essai → negotiation)
  - Implémenter les statistiques d'événements de conversion

- **Bloc D3 (Scoring des leads)**
  - Définir l'algorithme de scoring basé sur les événements de conversion
  - Implémenter le calcul et la mise à jour automatique des scores

### Pause du développement backend (20/03/2025)

Une pause du développement backend est prévue pour se concentrer sur l'amélioration de l'UX et du frontend. Lorsque le développement backend reprendra, nous finaliserons:

1. La table d'historique des statuts de leads (Bloc D1)
2. Les événements de conversion (Bloc D2)
3. Le système de scoring des leads (Bloc D3)

### Optimisations futures

- Optimisation des requêtes API pour réduire les temps de chargement
- Implémentation d'un système de cache pour les données fréquemment accédées
- Ajout d'analyses plus avancées pour le suivi des conversions
