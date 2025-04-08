# Windsurf Log - FunnelDoctor

Ce fichier sert à documenter les actions réalisées à chaque étape du développement du projet FunnelDoctor, conformément à la roadmap établie.

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

- ✅ **Décision stratégique**
  - Adoption d'une stratégie hybride pour maximiser la fiabilité du tracking
  - Priorité à `postMessage` + Bridge API pour les widgets embed JavaScript
  - Fallback sur stitching via Email + liaison `visitorId` par opt-in pour les liens directs et cas où `postMessage` échoue
  - Création d'un document détaillé `CALENDLY_TRACKING_STRATEGY.md` expliquant l'approche complète
  - Mise à jour de la roadmap pour refléter cette orientation stratégique


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
