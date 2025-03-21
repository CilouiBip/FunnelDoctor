# FunnelDoctor - Roadmap de Développement

Cette roadmap représente la vision détaillée du produit FunnelDoctor, incluant la configuration du "puzzle funnel", le traitement des données et l'architecture technique. Le document sert de référence pour toute l'équipe et guide le développement futur.

## 1. Rappel du Contexte

**FunnelDoctor** est un outil permettant de tracer le parcours d'un lead depuis la source (YouTube/Instagram/etc.) jusqu'à la conversion finale (CTA, Book Call, Payment).

**Composants clés :**
- **Snippet** : Captation UTMs, insertion d'événements "click," "page_view," "purchase," etc. envoyés au backend.
- **Dashboard** : Un ensemble de pages d'analyse (Executive Summary, Funnel Analytics, Source Breakdown, Vidalytics integration).

**État actuel :**
- ✅ Tables dans Supabase : leads, touchpoints, conversion_events, etc.
- ✅ Snippet fonctionnel (en local) + migrations sur Supabase.
- 🔄 À finaliser : UX puzzle funnel + traitement des données.

## 2. Vision d'ensemble du Puzzle Funnel (Option A)

### 2.1 Approche Option A

Au moment de l'arrivée d'un nouvel événement, on détermine "En quel step du puzzle se situe-t-il ?" d'après la config courante du funnel, et on enregistre cette information (ex. event.funnel_step_id).

**Principes clés :**
- Si l'utilisateur modifie le puzzle plus tard (réordonne, supprime un step…), les anciens events ne changent pas
- On ne recalcule pas l'historique → c'est le plus simple, on évite de casser la data
- Plus tard, si on veut basculer sur un "versioning," on pourra adapter la DB sans tout casser

## 3. Roadmap & Architecture

### 3.1 Structure globale du Dashboard

#### 1. Executive Summary
- KPI cards : #Leads, #RDVs, #Ventes, CA total…
- Comparaison "cette semaine / la semaine dernière"
- Lien vers plus de détails

#### 2. Funnel Analytics
- Puzzle funnel config (les "blocs" / "steps")
- Visualisation (graphe ou steps horizontales) montrant combien sont passés Step 1 → Step 2, etc.
- Taux de drop-off
- Filtre (source = YouTube, Instagram, etc.)

#### 3. Source Breakdown
- Tableau par source (YouTube, Instagram, Email, etc.)
- #Leads, #Appointments, #Sales, CA, ratio lead→sale…
- Graphique Recharts si besoin (line chart des leads par jour/semaine)

#### 4. Video Analytics (Vidalytics)
- Optionnel : comparer 2 vidéos, voir watchers, CTA in-video, etc.

### 3.2 "Puzzle Editor" (Funnel Analytics)

#### User Flow :
1. L'utilisateur va sur /dashboard/funnel (ou "Funnel Analytics")
2. Il voit la liste de "Steps" existants (ex. "Landing," "Calendly," "Payment")
3. Il peut drag-and-drop pour réordonner, ou cliquer "+ Add Step"
4. Quand il ajoute un step :
   - Donne un "name" ("VSL," "Upsell," etc.)
   - Sélectionne un "type" ou "condition," ex. :
     - event_type = 'page_view' + page_url = 'myvsl.com'
     - event_type = 'rdv_scheduled'
     - event_type = 'purchase_made'
5. Il enregistre → Les futurs events qui matcheront cette "condition" seront assignés à ce step

#### Storage :
- Table funnel_steps :
  - id (UUID)
  - step_order (int)
  - name (text)
  - match_condition (jsonb) ex. {"event_type": "purchase_made", "page_url": "myvsl.com"}

- At dispatch : quand le backend reçoit un event, il scanne la config "funnel_steps" → s'il en trouve un match, on met event.funnel_step_id = thisStepId

#### Affichage :
- UI : On affiche Step1, Step2… StepN en barres, indiquant "X leads passés, Y% drop-off"

### 3.3 Data Processing (traitement)

#### Réception de l'event :
- POST /api/touchpoints → backend
- On lit touchpoints.matchStep(), ex. un code comme :

```
for step in funnel_steps:
  if event_type == step.match_condition.event_type && 
     page_url == step.match_condition.page_url:
     event.funnel_step_id = step.id
     break
```

- On enregistre en DB touchpoints (funnel_step_id)

#### Lecture / "alimente dashboard"
- Quand on calcule "#Leads" ou "rdv," on regarde les events (funnel_step_id) correspondants
- Ex. "sales = count of events with step 'purchase'"
- On fait un agrégat pour la vue globale

#### Création de "North Star" (Executive Summary)
- On additionne "touchpoints" ou "conversions" par step "payment/purchase"
- On fait un "SELECT date_trunc('week', created_at), count(*) FROM touchpoints WHERE funnel_step_id=somePurchaseStep … GROUP BY date_trunc('week', …)"

### 3.4 Sur "Changement" du puzzle
- Option A (simple) : On ne recalcule pas. Les events existants conservent funnel_step_id. S'ils ont un step qui n'existe plus, tant pis, c'est orphelin
- L'utilisateur comprend que "ce nouveau funnel step n'affecte que le futur"

### 3.5 Vers un "Option B (versioning)"
- Plus tard, si on veut :
  - On rajoute un champ "funnel_version_id" sur touchpoints
  - On fait un "publish" d'une nouvelle version
  - Les events futurs prennent funnel_version=2, etc.

## 4. Impact sur la DB & Migrations

### 4.1 Nouvelles tables
- `funnel_steps` (id, step_order, name, match_condition, created_at, updated_at)
- Optionnel: `funnel` (id, funnel_name, user_id, created_at, updated_at) pour gérer plusieurs funnels

### 4.2 Modifications de tables existantes
- Ajout d'une colonne `funnel_step_id` (UUID, NULL) à `touchpoints`, référençant `funnel_steps.id`
- Préparation pour un éventuel `version_id` futur

### 4.3 Migrations
- Création d'un script SQL pour les nouvelles tables et modifications
- Implémentation via le système de migrations Supabase

## 5. Organisation des Vues du Dashboard

### 5.1 Dashboard principal (`/dashboard`)
- Executive Summary avec KPIs principaux
- Graphiques d'évolution sur les 4-5 dernières semaines

### 5.2 Funnel Analytics (`/dashboard/funnel`)
- Éditeur de puzzle avec drag-and-drop
- Visualisation du funnel avec barres horizontales indiquant les volumes et conversions

### 5.3 Source Analysis (`/dashboard/source`)
- Breakdown par utm_source
- Ratios de conversion par source

### 5.4 Video Analytics (`/dashboard/video`) - Optionnel
- Intégration des statistiques Vidalytics

## 6. Questions UX & Risques identifiés

### 6.1 Questions UX détaillées
- **Suppression d'étapes :** Devons-nous autoriser la suppression d'un step existant s'il contient déjà des events ?
  - Solution probable : "soft delete" ou avertir l'utilisateur qu'il perd l'historique
- **Wizard initial :** Faut-il un wizard initial "Define your funnel steps" ?
  - Envisageable pour une version future

### 6.2 Risques identifiés et mitigations

#### Risque 1 : Confusion de l'utilisateur lors des modifications de funnel
- **Impact :** L'utilisateur pourrait être désorienté si les données historiques ne reflètent pas sa configuration actuelle
- **Mitigation :** 
  - Interface explicite sur le fait que les modifications n'affectent que les futurs événements
  - Avertissements clairs lors de réorganisations majeures
  - Documentation dans l'aide contextuelle

#### Risque 2 : Performance du matching des conditions
- **Impact :** Latence lors du traitement d'événements si le matching des conditions est complexe
- **Mitigation :** 
  - Indexation des champs de recherche fréquente
  - Cache des configurations de funnel
  - Optimisation des requêtes JSONB sur PostgreSQL

#### Risque 3 : Évolution future vers versioning
- **Impact :** Difficultés à évoluer vers un système de versioning si nécessaire plus tard
- **Mitigation :**
  - Structure de données conçue pour permettre cette évolution
  - Documentation détaillée de l'architecture
  - Tests anticipant cette possible évolution

## 7. Feuille de Route d'Implémentation

### Phase 1 : Structure de données (Semaine 1)
1. Créer la table `funnel_steps` dans Supabase
2. Modifier `touchpoints` pour ajouter `funnel_step_id`
3. Mettre à jour le code de traitement des événements

### Phase 2 : Éditeur de funnel (Semaine 2)
1. Développer l'interface d'édition sur `/dashboard/funnel`
2. Implémenter le drag-and-drop pour la réorganisation
3. Créer le formulaire d'ajout/édition d'étape

### Phase 3 : Visualisation et analyses (Semaine 3)
1. Développer les graphiques de funnel steps avec Recharts
2. Créer l'executive summary avec KPIs
3. Implémenter les filtres par source et périodes

### Phase 4 : Tests et optimisations (Semaine 4)
1. Tests de performance et validation du workflow complet
2. Optimisations d'UX et corrections de bugs
3. Documentation utilisateur

## 8. Conclusion

- L'approche Option A (sans versioning) reste le plus simple et flexible pour le MVP
- La structure permet une évolution vers Option B (versioning) si nécessaire plus tard
- Les futures optimisations pourront inclure des analyses plus avancées par segment, cohorte, etc.
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
