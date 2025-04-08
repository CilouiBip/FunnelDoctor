# FunnelDoctor - Roadmap de Développement (Version Mars 2025 - Stratégie v2)

**Document de Référence Principal**

## 1. Contexte et Vision

**Objectif FunnelDoctor :** Fournir aux infopreneurs et créateurs de contenu une vision claire et unifiée de la performance de leurs funnels marketing et ventes, en particulier pour le trafic organique (YouTube, etc.). L'outil vise à agréger les données de multiples sources (Analytics, CRM, Booking, Paiement) et à les lier au parcours visiteur pour identifier les points forts et les points faibles du funnel, de la source initiale jusqu'à la vente.

**Problème Principal Adressé :** La fragmentation des données et la difficulté à tracker de manière fiable le parcours d'un prospect à travers différents outils (YouTube -> Landing Page -> Opt-in -> Booking -> Paiement), surtout en gérant les identifiants multiples (cookies, emails).

**Stratégie Technique Clé Adoptée :**
Pour assurer un tracking fiable et robuste sans perturber les données marketing de l'utilisateur, nous adoptons l'approche **"Option 2 : Capture Frontend + API Pré-Association"** couplée à une logique de **"Data Stitching"** basée sur un modèle "Master Lead".

## 1.1 Objectif Actuel : Visitor-Lead Bridging

Notre priorité actuelle est d'implémenter une solution robuste de "Cookie + Payment (et RDV) Bridging" permettant de :
- Lier les identités des visiteurs (via cookies) aux leads lors des processus de paiement et de prise de rendez-vous
- Assurer un suivi précis et fusionner les identités lorsque les utilisateurs fournissent différents emails à différentes étapes
- Créer un système modulaire pour cette fonctionnalité, facilitant les améliorations futures

### Progrès réalisés (23/03/2025) :

#### Authentification et E-mails
- ✅ **Système de vérification d'email** : Implémentation complète avec tokens, table `reset_tokens`, et mise à jour des statuts utilisateurs
- ✅ **Réinitialisation de mot de passe** : Endpoints fonctionnels (`/auth/forgot-password`, `/auth/reset-password`) avec mesures de sécurité
- ✅ **Service d'emails modulaire** : Architecture prête pour SendGrid/SMTP en production, simulation en développement

#### Intégration Calendly et Bridging
- ✅ **Intégration Calendly V2** : Résolution des problèmes de Row-Level Security et des erreurs de schéma SQL
- ✅ **Bridging Webhooks** : Optimisation du traitement des webhooks Calendly pour associer correctement les visitor_id aux leads
- ✅ **Schéma Supabase** : Mise à jour du schéma de la table `conversion_events` pour stocker les données d'événement et URLs
- ✅ **Analyse d'impact** : Audit complet des structures de données existantes

#### Intégration YouTube OAuth et Bridging Multi-Email
- ✅ **Configuration Google Cloud** : Création du projet, configuration OAuth, activation APIs YouTube
- ✅ **Variables d'environnement** : Ajout des variables pour l'intégration YouTube dans le fichier .env
- 🔄 **Implémentation des services Day 2** : EncryptionService, IntegrationService, LeadMatchingService
- 🔄 **Implémentation des services Day 3** : YouTubeAuthService, YouTubeController, YouTubeTokenRefreshService
- 🔄 **Structure multi-email** : Ajout de `secondary_emails` aux leads et création d'endpoints pour capturer les emails secondairest triggers pour maintenir la cohérence système

### Prochaines actions (alignées avec le plan du CTO) :

#### Phase A : Vérification du Flow Complet (UTM → Calendly → Stripe)
- ✅ **Flow complet UTM → Landing** : Vérifier la capture des paramètres UTM et la génération du visitor_id

#### Bloc 1.3 : Validation Stitching `visitorId`
- ❌ **MB-1.3.1 (Test Calendly via UTM)** : **ÉCHEC DÉFINITIF / ABANDONNÉ** - Échec modification lien sur ConvertKit ET `utm_content` non fiable/non renvoyé par webhook Calendly.
- ✅ **MB-1.3.2 (Test Calendly via postMessage + Bridge API)** : **SUCCÈS (pour Widget Embed JS)** - Stratégie `postMessage` + `/api/bridge/associate` validée fonctionnellement (widget embed JS), capture `visitorId` sans email via bridge.
- 📝 **Note Stratégique Globale sur Calendly** : Stratégie Calendly MVP : Hybride. **Priorité #1 : Widget Embed JS + `postMessage` + Bridge API** (capture `visitorId` via bridge). **Fallback (Lien direct / échec postMessage) :** Stitching via Email (webhook) uniquement pour l'événement RDV, liaison `visitorId` <-> Email indispensable via **Opt-in** ou autre événement.

#### Nouvelles Priorités Immédiates (selon avis CTO)
- 🔴 **#1 Correction Analytics SQL** : Résolution prioritaire des bugs de requêtes SQL dans les rapports analytics
- 🔴 **#2 Correction YouTube Token** : Résolution des problèmes de gestion des tokens YouTube OAuth
- 🔴 **#3 Implémentation/Validation Stitching via Opt-in** : Assurer la capture et l'association correcte de `visitorId` + Email lors des événements d'opt-in

#### Suite Phase A (après résolution des priorités ci-dessus)
- ⬜ **Flow Calendly → Stripe** : Implémenter l'association visiteur-paiement via webhook Stripe
- ⬜ **Test intégration complète** : Valider le flux entier de l'UTM jusqu'au paiement
- ⬜ **Dashboard analytics** : Visualiser les taux de conversion à chaque étape du funnel

#### Améliorations Post-MVP (Calendly)
- ⬜ **Question Personnalisée Calendly** : Explorer l'ajout d'une question cachée pour transmettre le `visitorId`
- ⬜ **Page de Redirection Intermédiaire** : Développer une solution de redirection permettant un meilleur tracking pour les liens directs

#### Phase B : Intégration OAuth YouTube (future)
- ⬜ **Service OAuth** : Développer les endpoints d'autorisation et callback pour YouTube
- ⬜ **Récupération des métriques** : Intégrer l'API YouTube Data pour les statistiques de vidéos
- ⬜ **Analytics croisés** : Relier les performances des vidéos aux conversions via UTMs

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

## 9. Roadmap d'Implémentation du Visitor-Lead Bridging (Micro-Blocs)

La roadmap suivante détaille en micro-blocs l'implémentation de la solution "Cookie + Payment (et RDV) Bridging" avec deux scripts distincts (loader + bridging) pour assurer un suivi précis des visiteurs à travers le funnel.

### Micro-Bloc 1 : Finalisation BDD & Migrations

**Objectif** :
- S'assurer que les tables nécessaires existent :
  - `leads` (email, status, converted_at, etc.)
  - `visitors` (visitor_id, lead_id, first_seen_at, last_seen_at, etc.)
  - `conversion_events` (lead_id, event_name='payment'/'rdv', etc.)
  - Vérifier si funnel_steps, funnels, etc., sont déjà en place selon besoin.

**Tâches** :
- Créer/ajuster les colonnes si manquantes (status, converted_at dans leads, etc.).
- Ajouter index si nécessaire (ex: visitor_id, lead_id).

**Validation/Tests** :
- Vérifier la migration en local/Dev (aucune erreur).
- Contrôler qu'on peut insérer un visitor_id dans visitors et faire un lien vers leads.

**Mesure de succès** :
- La DB est prête pour stocker (visitor_id) + associer conversions (RDV, paiement).

### Micro-Bloc 2 : UTM Tracking & Script Loader

**Objectif** :
- Gérer la capture UTM et la génération du visitor_id via funnel-doctor.js (le loader snippet).
- Stocker visitor_id (et UTMs) en cookie/localStorage.

**Tâches** :
- S'assurer que le loader snippet (celui que l'infopreneur colle dans la page) charge funnel-doctor.js.
- Dans funnel-doctor.js, générer ou retrouver visitor_id, stocker en localStorage.
- Gérer les attributs (data-fd-site, etc.) pour config.

**Validation/Tests** :
- Tester en local : on ouvre la landing, devtools → check localStorage['fd_visitor_id'] créé.
- Optionnel : Vérifier UTMs stockés si ?utm_source=xxx est présent.

**Mesure de succès** :
- Sur toute landing page où ce snippet est collé, on a un visitor_id stable.

### Micro-Bloc 3 : FunnelStepsEditor & Auth (Déjà Partiellement Fait)

**Objectif** :
- Stabiliser la page de mapping (drag-and-drop, CRUD) et s'assurer que le mode debug ne l'emporte pas en production.
- Gérer JWT auth (si le user est authentifié, on persiste en DB).

**Tâches** :
- Vérifier que la persistance fonctionne (funnel steps en DB).
- Gérer le fallback debug proprement.

**Validation/Tests** :
- Vérifier sur Dev : on crée, édite, supprime steps → tout persiste.
- Pas d'errors 401 en boucle.

**Mesure de succès** :
- Le funnel mapping est stable, on peut passer à l'étape bridging sans freeze.

### Micro-Bloc 4 : Bridging (Deux Scripts : Loader + Bridging)

#### 4.1 Script "Loader" (Déjà fait)
- C'est le snippet que l'infopreneur colle (voir Micro-Bloc 2).

#### 4.2 Nouveau Script "Bridging"

**Objectif** :
- Séparer la logique "au clic sur tel bouton, on récupère visitor_id et on construit l'URL Calendly/iClose (ou Stripe metadata)."
- Permettre de brancher la page funnel avec des services externes (RDV, paiement).

**Tâches** :
- Créer un "bridging.js" ou équivalent dans funnel-doctor codebase.
- Dans ce script :
  1. Localiser les boutons "Prendre RDV" / "Payer maintenant."
  2. Au clic, lire visitor_id depuis localStorage.
  3. Construire l'URL (ex: Calendly → ?utm_source=visitor_id&utm_medium=xxx).
  4. Gérer l'appel POST vers /create-checkout-session (Stripe) en y mettant metadata.visitor_id.
- Mettre à jour l'UI "Snippet" dans l'app : pour que l'infopreneur voie 2 scripts à coller :
  1. Le script loader
  2. Le bridging snippet

**Validation/Tests** :
- Front : Sur la landing page, on inclut :
```html
<script>...Loader code...</script>
<script>...Bridging code...</script>
```
- Vérifier qu'en local, quand on clique "Calendly" => on atterrit sur ?utm_source=visitor_id&utm_medium=abc123.
- Vérifier qu'on appelle /api/payments/create-checkout-session avec metadata.visitor_id = abc123.

**Mesure de succès** :
- Infopreneur peut coller ces 2 snippets, rien d'autre => bridging se fait.
- On obtient visitor_id dans Calendly (webhook) ou Stripe (metadata).

#### 4.3 Webhooks & Consolidation

**Tâches** :
1. Stripe : /api/payments/webhook
   - Récupère metadata.visitor_id, associe la vente à la table leads → fallback email si pas de visitor_id.
   - Merge si duplicata.
2. Calendly : "invitee.created" → tracking.utm_source / utm_medium.
   - S'il = "visitor_id" / "abc123", associer RDV au lead.

**Validation** :
- On fait un test local + un test staging :
  - Simuler un RDV Calendly → Sur webhook, on voit visitor_id=abc123.
  - Simuler un paiement → On voit metadata.visitor_id.

### Micro-Bloc 5 : Analytics & Reporting

**Objectif** :
- Exploiter la data (leads, events, etc.) pour afficher Taux de Conversion, CA, Show-up rate, etc.

**Tâches** :
- Endpoint "funnel-analytics" : calculer #leads, #rdv, #ventes.
- UI de reporting.

**Validation** :
- On vérifie 95%+ leads mappés (simulations QA).
- Taux de conversion cohérent.

**Mesure de succès** :
- L'infopreneur voit un funnel complet (Landing → RDV → Vente), stats par source, etc.

## 10. Récapitulatif des Mesures de Succès Globales

1. **Micro-Bloc 1 (BDD)** : DB stable, tables correctes.
2. **Micro-Bloc 2 (Loader)** : Sur la landing, visitor_id est généré + UTMs stockés.
3. **Micro-Bloc 3 (FunnelStepsEditor)** : CRUD stable, fallback debug maîtrisé.
4. **Micro-Bloc 4 (Bridging)** :
   - 2 scripts dans l'onglet Snippet : loader + bridging.
   - Sur Calendly + Stripe, on obtient visitor_id.
   - Webhooks unifient le lead (≥95% leads).
5. **Micro-Bloc 5 (Analytics)** : Taux de conversion global + stats par étape + par source.

## 11. Points Clés pour l'Implémentation

- **Deux scripts distincts** :
  1. Loader snippet (capture UTMs, set visitor_id).
  2. Bridging snippet (au clic "Calendly"/"Stripe checkout," on ajoute visitor_id dans l'URL/metadata).
- **Modification de l'UI** : Onglet Snippet dans l'App affichera 2 `<script>` tags distincts pour l'infopreneur.
- **Critère de succès** : 95% leads consolidés + Taux conversion complet.
- **Ordre d'implémentation** : BDD → UTM loader → Editor → Bridging → Analytics.
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
