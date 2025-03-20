# FunnelDoctor - Roadmap de Développement (MVP Scalable)

Cette roadmap est focalisée sur la livraison d'un MVP en quelques semaines tout en posant des bases techniques suffisamment solides pour scaler par la suite. Nous conserverons l'esprit du MVP, mais nous intégrerons une architecture modulaire et extensible pour ne pas être bloqués si le projet grandit rapidement.

## Aperçu du Projet

**FunnelDoctor** est un micro-SaaS de tracking organique permettant de suivre le parcours des leads depuis YouTube jusqu'à la vente finale. Il offre aux infopreneurs des insights précis sur leur funnel de conversion.

## Vision Générale

FunnelDoctor permet aux créateurs de contenu et infopreneurs de :

1. Générer des liens UTM (avec identifiant unique) pour les descriptions YouTube
2. Tracker automatiquement les visiteurs sur les landing pages
3. Centraliser les événements (email ouvert, rendez-vous pris, achat, etc.)
4. Visualiser le funnel complet avec les taux de conversion
5. Attribuer un score à chaque lead et visualiser sa timeline

## Architecture Technique

### Backend

- **Technologie**: Node.js avec TypeScript
- **Framework**: Express ou Nest.js
- **Endpoints principaux**:
  - POST `/api/leads` - Créer/mettre à jour un lead
  - POST `/api/events` - Enregistrer un événement
  - GET `/api/report/funnel` - Récupérer les statistiques du funnel
  - POST `/api/webhooks/stripe` - Webhook pour les paiements
  - POST `/api/webhooks/calendly` - Webhook pour les rendez-vous
- **Librairies recommandées**:
  - Express/Nest.js pour l'API
  - pg ou ORM (Sequelize/TypeORM) pour la base de données

### Base de Données

- **Technologie**: PostgreSQL (ou Supabase)
- **Schéma principal**:
  - Table `leads` - Stockage des informations sur les leads
  - Table `events` - Suivi des événements du funnel
  - Table `sales` - Détails des ventes (optionnel)
- **Logique clé**:
  - Utilisation du `funnel_doctor_id` jusqu'à l'opt-in
  - Mise à jour du lead pour associer l'ID au email
  - Enregistrement de chaque événement dans la table events

### Snippet de Tracking

- Script JavaScript à inclure sur les landing pages
- Fonctionnalités:
  - Récupération du `funnelDoctor_id` dans l'URL
  - Stockage dans un cookie/localStorage
  - Envoi d'événements via POST vers `/api/events`

### Intégrations Externes

- **Stripe**: Webhook pour les paiements
- **Calendly**: Webhook pour les rendez-vous
- **ActiveCampaign**: Tracking des emails
- **YouTube**: Analytics API pour les statistiques vidéo

### Frontend / Dashboard

- **Framework**: React / Next.js
- **Fonctionnalités principales**:
  - Générateur de liens UTM
  - Visualisation du funnel avec taux de conversion
  - Liste des leads avec score et source
  - Timeline des événements par lead
  - Interface d'onboarding

### Design et Style Visuel

- **Palette de couleurs**:
  - Violet primaire: #9D6AFF
  - Violet secondaire: #6C63FF
  - Blanc: #FFFFFF
  - Fond clair: #F8F9FD
- **Typographie**: Inter ou SF Pro Display
- **Effets visuels**: Ombres, dégradés, coins arrondis

## Plan de Développement Détaillé (3 semaines)

### Semaine 1 : Mise en place des fondations

#### 1.1 Choix des technos & Setup de base
- **Backend** :
  - Utiliser Nest.js (TypeScript) pour un projet modulaire et maintenable (controllers, services, modules).
  - Gérer l'authentification des utilisateurs (infopreneurs) avec JWT (ou Supabase Auth).
- **Base de données** :
  - Supabase (PostgreSQL managé) pour accélérer le prototypage et faciliter l'authentification.
- **Front** :
  - Next.js (React) pour le côté SSR/SSG et la rapidité de déploiement.
  - Tailwind CSS pour construire rapidement l'UI.
- **Infrastructure** :
  - Déploiement du front sur Vercel.
  - Backend sur Railway / Render.
  - DB sur Supabase.
  - (Optionnel) Mise en place d'un petit Redis managé (Upstash) si nécessaire.

**Tâches concrètes (Jour 1 & 2)**
1. Créer un repo Git et initialiser Nest.js + Next.js.
2. Mettre en place la base Supabase et définir les tables principales :
   - funnels (pour gérer plusieurs funnels),
   - leads,
   - events,
   - éventuellement sales ou events = "PURCHASE".
3. Implémenter la configuration d'auth via JWT ou Supabase Auth.
4. Setup CI/CD avec GitHub Actions pour automatiser les déploiements.

#### 1.2 Endpoints & Schéma minimal
- **Endpoints Nest.js à créer** :
  1. `/auth` : inscription / login (JWT).
  2. `/funnels` : CRUD sur les funnels.
  3. `/leads` : création/mise à jour d'un lead (associer funnel_doctor_id / email).
  4. `/events` : réception d'événements (opt-in, page_view, etc.).
  5. `/webhooks` : pour Stripe, Calendly (et ActiveCampaign si webhook est utilisé).

**Tâches concrètes (Jour 3 & 4)**
1. Implémenter la logique Nest.js, test unitaire minimal.
2. Migrer la DB (tables + index sur funnel_doctor_id, email).
3. Gérer un champ funnel_id dans leads et events pour distinguer plusieurs funnels.

### Semaine 2 : Tracking, Webhooks et Dashboard

#### 2.1 Tracking et snippet client
- **Snippet JS** :
  - Récupérer funnel_doctor_id depuis l'URL, stocker en cookie + localStorage.
  - Envoyer "PAGE_VIEW" en POST /events.
  - Sur opt-in (si possible), capturer l'email et faire un appel à /leads ou /events (event = "OPTIN").
- **Fingerprinting (facultatif pour MVP)** :
  - Rester pour l'instant sur un funnel_doctor_id + cookie.
  - Prévoir une API modulaire pour ajouter plus tard du fingerprinting si nécessaire.

**Tâches concrètes (Jour 1 & 2)**
1. Écrire le snippet JS (Tailwind / Next.js).
2. Mettre en place un module "Tracking" dans Nest.js pour enregistrer les événements.
3. Intégrer le snippet sur une page test et valider le flux.

#### 2.2 Webhooks externes
- **Stripe** :
  - Endpoint `/webhooks/stripe`.
  - Sur checkout.session.completed, récupérer email/ID client → associer à un lead → créer un event "PURCHASE".
- **Calendly** :
  - Endpoint `/webhooks/calendly`.
  - Sur "invitee.created", récupérer l'email → event_type = "APPOINTMENT_BOOKED".
- **ActiveCampaign** :
  - Soit webhook (ou polling). Sur nouveau contact ou changement de statut, associer email → event "EMAIL_OPEN", "EMAIL_CLICK", etc.

**Tâches concrètes (Jour 3 & 4)**
1. Configurer un module WebhooksModule dans Nest.js.
2. Tester Stripe / Calendly en sandbox.
3. Vérifier la persistance dans la DB (table events).

#### 2.3 Dashboard minimal
- **Next.js front** :
  1. Générateur de lien UTM + funnel_doctor_id (ou ID auto) → l'utilisateur (infopreneur) crée un nouveau funnel + clique sur "Générer Lien".
  2. Vue "Funnel" : barres de progression (visites → optins → RDV → ventes).
  3. Vue "Leads" : liste de leads (email, date, source funnel).
  4. Timeline lead : suite d'events (page_view, optin, purchase…).

**Tâches concrètes (Jour 5)**
1. Créer un "DashboardModule" front (ou pages Next.js "/dashboard", "/funnels", "/leads/:id").
2. Consommer l'API Nest.js pour afficher stats, conversions, etc.
3. Mettre en place un design minimal avec Tailwind CSS.

### Semaine 3 : Finitions, Scalabilité & Tests

#### 3.1 Scoring & multi-funnel
- **Scoring** :
  - Ajouter un champ score dans leads.
  - Logique : +1 point sur opt-in, +3 sur RDV, +5 sur achat, etc.
  - Mise à jour du score à chaque event.
- **Gestion multi-funnel** :
  - L'utilisateur peut configurer plusieurs funnels (table funnels), chaque lead/event est relié à un funnel_id.
  - Le dashboard permet de filtrer par funnel.

**Tâches concrètes (Jour 1 & 2)**
1. Implanter un ScoringService (Nest.js).
2. Mettre à jour la table leads sur chaque nouvel event.
3. Afficher le score dans la liste des leads (front Next.js).

#### 3.2 Tests, QA et Onboarding
- **Tests E2E** :
  - Mettre en place quelques end-to-end tests (via Cypress ou Playwright pour le front, Jest pour le backend).
  - Tester la création d'un funnel, la génération d'un lien, l'arrivée sur la page, l'opt-in, la vente, etc.
- **Onboarding** :
  - Un petit tutoriel dans le dashboard expliquant comment intégrer le snippet, configurer les webhooks Stripe / Calendly.
  - Vérifier la prise en compte du consentement RGPD si on vise l'UE.

**Tâches concrètes (Jour 3 & 4)**
1. QA manuelle du parcours complet.
2. Rédaction d'un mini guide d'onboarding.
3. Correction des bugs éventuels.

#### 3.3 Déploiement & Monitoring
- **Déploiement** :
  - Front Next.js sur Vercel.
  - Backend Nest.js sur Railway ou Render (connexion à Supabase).
- **Monitoring** :
  - Intégrer Sentry pour traquer les exceptions (front & backend).
  - (Optionnel) Un début de logs structurés sur la backend DB ou un service type Logtail, Datadog.

**Tâches concrètes (Jour 5)**
1. Configurer Sentry (ou un équivalent) sur le front + backend.
2. Vérifier la production, paramétrer variables d'environnement (API keys, webhooks, etc.).
3. Faire une démo à 1-2 infopreneurs test.

## Objectifs du MVP

1. Générateur de liens UTM avec identifiant unique
2. Base de données centralisée pour tous les événements
3. Intégrations avec YouTube, ActiveCampaign, Calendly et Stripe
4. Snippet de tracking pour les pages de capture
5. Dashboard minimal (funnel, leads, timeline)

## Critères de Succès

- Suivi précis du parcours des leads de YouTube à la vente
- Affichage clair des taux de conversion entre chaque étape
- Calcul automatique du score des leads
- Interface utilisateur intuitive et moderne
- Temps de chargement rapide des données du dashboard

## Récapitulatif Final

- **Objectif** : Un MVP en 3 semaines, mais codé sur une base scalable (Nest.js, Next.js, Supabase).
- **Semaine 1** : Setup Nest.js & Next.js + DB Supabase + CRUD funnels/leads/events + premières routes + auth JWT + CI/CD.
- **Semaine 2** : Snippet tracking, webhooks externes (Stripe, Calendly, ActiveCampaign) + Dashboard minimal.
- **Semaine 3** : Scoring, multi-funnel, QA/test E2E, onboarding & déploiement.

Au final, on aura un produit qui :
1. Gère plusieurs funnels.
2. Génère des liens trackés.
3. Centralise tous les événements (page_view, optin, RDV, achat, etc.).
4. Affiche un funnel complet (du clic YouTube à la vente).
5. Peut évoluer facilement (fingerprinting avancé, file d'attente pour webhook, analytics tiers, etc.) si le trafic ou les besoins augmentent.

## État d'Avancement Actuel

Le template front-end initial a été mis en place avec Next.js et inclut :

1. Structure du projet avec l'App Router de Next.js
2. Configuration de Tailwind CSS pour la stylisation
3. Page d'accueil avec présentation du produit
4. Dashboard avec visualisation des statistiques de funnel
5. Générateur de liens UTM pour le tracking

Prioritu00e9s suivantes :
- Mise en place du backend Nest.js
- Intégration avec Supabase
- Implémentation des endpoints API
