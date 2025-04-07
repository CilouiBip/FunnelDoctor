# FunnelDoctor - Roadmap de Développement (Version Avril 2025 - MVP v2.2 - Focus Analyse Custom)

**Document de Référence Principal**

*(Basé sur le rapport d'état du 03/04/2025, les audits, et la clarification de la vision MVP)*

## 1. Contexte et Vision (MVP Core)

**Objectif FunnelDoctor MVP :** Fournir aux infopreneurs une solution SaaS pour tracker de manière fiable leur funnel marketing et ventes organique (focus YouTube -> Opt-in -> RDV -> Paiement), **définir les étapes clés de LEUR funnel spécifique**, et visualiser les **taux de conversion et le revenu généré à chaque étape** via un dashboard analytique filtrable. La valeur réside dans l'identification précise des points forts/faibles du parcours client personnalisé.

**Problème Principal Adressé :** Fragmentation des données ET impossibilité d'analyser la performance réelle d'un funnel spécifique (pas juste un modèle générique).

**Proposition de Valeur Unique (MVP) :**
1.  **Tracking Fiable & Stitching :** Collecte précise des touchpoints (page vue, optin, rdv, paiement) via snippet + webhooks, et liaison robuste au lead unique (MasterLead) via visitorId/email.
2.  **Funnel Personnalisé :** Interface permettant à l'utilisateur de définir et ordonner les étapes clés de son propre funnel.
3.  **Analyse Actionnable :** Dashboard "Funnel Analytics" visualisant l'entonnoir de conversion basé sur les étapes définies par l'utilisateur, avec KPIs clés (visiteurs, leads, RDV, ventes, CA, taux de conversion) et filtres (période, source).

## 2. Stack Technique et Architecture

*(Identique aux versions précédentes - NestJS, Next.js, Supabase, etc. Focus sur `FunnelStepsModule` et `FunnelAnalyticsModule` pour la logique custom)*

## 3. Roadmap MVP - Implémentation par Micro-Blocs (MB)

---

**(Prérequis : Base de code actuelle sur branche `feat/core-tracking-stitching` avec backend démarrant, et corrections iClosed/Clé API identifiées mais pas encore toutes commitées)**

*   **MB-0.4 : Validation Finale Zapier (CTO)**
    *   **Objectif :** Confirmer que l'action Webhook POST dans le Zap de test personnel (avec vraie clé API) ne renvoie PAS "Cannot POST" ou 404, mais une erreur 400 (Bad Request / Validation DTO échouée à cause du `visitorId` d'exemple invalide).
    *   **Tâches :** Exécuter "Test Step" dans l'éditeur Zapier pour l'action Webhook POST (backend/ngrok doivent tourner).
    *   **Mesure de Succès :** Réception d'une réponse HTTP 400 du backend FunnelDoctor dans Zapier.
    *   **Priorité :** **BLOQUANTE** pour valider la communication Zapier->Backend.
*   **MB-0.5 : Commit Final Corrections Backend (Windsurf)**
    *   **Objectif :** Intégrer dans Git les dernières corrections backend validées.
    *   **Tâches :** Commiter les modifications pour : `fix: Ensure visitor exists...`, `feat: Add migration file for touchpoints source...`, `refactor: Add optional source field...`, `feat: Add migration file for touchpoints user_id...`, `refactor: Add optional user_id field...`, `fix: Remove manual updated_at...`, `fix: Correctly access nested apiKey...`.
    *   **Mesure de Succès :** Commits effectués avec les bons messages. Code propre sur la branche.
    *   **Priorité :** Critique (après MB-0.4).
*   **MB-0.6 : Création Branche Stable (Windsurf)**
    *   **Objectif :** Sauvegarder l'état fonctionnel actuel.
    *   **Tâches :** Créer et pusher `git branch feat/mvp-stable-base && git push origin feat/mvp-stable-base`.
    *   **Mesure de Succès :** Branche créée et disponible sur le dépôt distant.
    *   **Priorité :** Critique (après MB-0.5).

---

**Phase 1 : Finalisation Configuration Intégrations (Frontend)**

*   **MB-1.1 : Intégration Stripe (Frontend - Windsurf)**
    *   **Objectif :** Permettre à l'utilisateur d'enregistrer ses clés API Stripe.
    *   **Tâches :** Implémenter le formulaire (clé publique/secrète) et l'appel API (`POST /api/integrations/stripe` via `fetchWithAuth`) dans `/settings/integrations/page.tsx`. Gérer état chargement/succès/erreur. Afficher statut "Connecté".
    *   **Tests (CTO Manuel) :** Entrer clés test, enregistrer. Vérifier logs backend (succès sauvegarde), vérifier statut "Connecté" après refresh.
    *   **Mesure de Succès :** Sauvegarde des clés fonctionnelle, statut UI mis à jour.
    *   **Priorité :** Haute.
*   **MB-1.2 : Intégration Calendly OAuth (Frontend/Backend - Windsurf)** ✅
    *   **Objectif :** Permettre à l'utilisateur de connecter son compte Calendly via le flux OAuth.
    *   **Tâches TERMINÉES (07/04/2025) :** 
        * Mise en place du flux OAuth Calendly complet (initiate, authorize, callback)
        * Correction de la contrainte BD empêchant plusieurs utilisateurs d'avoir une intégration Calendly
        * Amélioration de la fonction d'extraction d'URL d'autorisation avec logs détaillés
        * Tests avec plusieurs comptes utilisateurs pour valider l'implémentation
    *   **Mesure de Succès :** ✅ Connexion Calendly fonctionnelle, redirection OAuth réussie, statut UI correctement mis à jour.
    *   **Priorité :** Haute.
*   **MB-1.3 : Intégration Email Marketing (AC/CK) (Frontend - Windsurf)**
    *   **Objectif :** Permettre à l'utilisateur d'enregistrer sa clé API AC ou CK.
    *   **Tâches :** Implémenter formulaire (Clé API) et appel API (`POST /api/integrations/email-marketing` via `fetchWithAuth`) dans `/settings/integrations/page.tsx`. Gérer état/messages. Afficher statut "Connecté".
    *   **Tests (CTO Manuel) :** Entrer clé test, enregistrer. Vérifier logs backend (si endpoint existe et gère), vérifier statut UI.
    *   **Mesure de Succès :** Sauvegarde clé fonctionnelle (si backend OK), statut UI mis à jour.
    *   **Priorité :** Moyenne (moins critique que Stripe/Calendly pour le flux E2E initial).
*   **MB-1.4 : Intégration YouTube (Frontend - Windsurf)**
    *   **Objectif :** Finaliser l'UI pour connecter/déconnecter YouTube et gérer le retour de callback.
    *   **Tâches :** Implémenter l'utilisation de `useYouTubeAuth` pour afficher état/boutons. Implémenter la gestion des paramètres `?youtube_status=` dans l'URL pour afficher toast et rafraîchir état. Vérifier appel `connect()` et `disconnect()`. (Correction redirection callback backend déjà faite).
    *   **Tests (CTO Manuel) :** Tester le cycle complet : Connecter -> Consentement Google -> Redirection vers Settings -> Toast Succès -> Statut "Connecté" -> Déconnecter -> Toast Succès -> Statut "Non connecté".
    *   **Mesure de Succès :** Flux connexion/déconnexion YouTube fonctionnel et UI à jour.
    *   **Priorité :** Haute.

---

**Phase 2 : Définition du Funnel par l'Utilisateur**

*   **MB-2.1 : Backend - API Funnel Steps (Audit & Ajustements - Windsurf)**
    *   **Objectif :** Comprendre et si nécessaire, ajuster l'API `/api/funnel-steps` pour permettre la définition d'étapes basées sur les `event_type` des touchpoints.
    *   **Tâches :** Auditer `FunnelStepsModule` (contrôleur, service, DTOs, entité). Confirmer que l'API permet de créer/MAJ/lister/ordonner des étapes avec au moins un `user_id`, un `label`, une `position`, et un `type` correspondant aux `event_type` clés (`page_view`, `optin`, `rdv_scheduled`, `payment_succeeded`). Ajouter un critère simple (ex: `source` pour `rdv_scheduled`) si possible et pertinent pour le MVP. Assurer que les étapes par défaut sont créées.
    *   **Tests (Windsurf - Unitaire/API si possible) :** Vérifier CRUD API via Postman ou tests automatisés si possible.
    *   **Mesure de Succès :** API `/api/funnel-steps` confirmée comme fonctionnelle pour définir un funnel simple basé sur les types de touchpoints MVP.
    *   **Priorité :** Critique.
*   **MB-2.2 : Frontend - Page "Funnel Mapping" (Windsurf)**
    *   **Objectif :** Créer l'interface utilisateur permettant de visualiser, réordonner, et potentiellement renommer/personnaliser (couleur?) les étapes du funnel.
    *   **Tâches :** Créer la page `/funnel-mapping`. Appeler `GET /api/funnel-steps` pour afficher les étapes existantes (ou par défaut). Implémenter une interface (liste simple, drag and drop basique si possible) pour changer l'ordre (`position`). Appeler `POST /api/funnel-steps/positions` (ou `PATCH /api/funnel-steps/:step_id` pour chaque étape) pour sauvegarder les changements. Permettre de modifier le `label` (et `couleur`?).
    *   **Tests (CTO Manuel) :** Créer/afficher les étapes par défaut. Modifier l'ordre, sauvegarder, rafraîchir, vérifier persistance. Modifier un label, sauvegarder, vérifier.
    *   **Mesure de Succès :** L'utilisateur peut visualiser et personnaliser l'ordre/nom de ses étapes de funnel.
    *   **Priorité :** Critique.

---

**Phase 3 : Développement Analyse Funnel Custom**

*   **MB-3.1 : Backend - Logique Analyse Custom (`FunnelAnalyticsService` - Windsurf)**
    *   **Objectif :** Implémenter la logique de calcul des conversions basée sur les `funnel_steps` définis par l'utilisateur et les `touchpoints` enregistrés.
    *   **Tâches :**
        *   Créer la méthode principale (ex: `calculateCustomFunnelAnalytics(userId, period)`).
        *   Injecter `FunnelStepsService` et `TouchpointsService` (ou utiliser Supabase client directement).
        *   Récupérer les `funnel_steps` ordonnés pour l'`userId`.
        *   Pour chaque étape N :
            *   Déterminer les critères de touchpoint (ex: `event_type`, `source`).
            *   **Écrire la requête SQL/logique complexe** pour compter les `master_leads` uniques ayant atteint l'étape N (touchpoint correspondant DANS la période) ET ayant aussi atteint les étapes N-1, N-2... 1.
            *   Stocker le nombre de leads pour chaque étape.
            *   Agréger le CA pour l'étape 'payment_succeeded'.
        *   Calculer les taux de conversion.
        *   Retourner les données formatées pour l'entonnoir.
    *   **Tests (Windsurf - Unitaire) :** Écrire des tests unitaires pour cette logique de calcul avec des données de touchpoints simulées et différentes définitions de funnel.
    *   **Mesure de Succès :** La logique de calcul est implémentée et validée par des tests unitaires pour différents scénarios.
    *   **Priorité :** **CRITIQUE - Cœur du MVP**.
*   **MB-3.2 : Backend - API Analyse Custom (`FunnelAnalyticsController` - Windsurf)**
    *   **Objectif :** Exposer la logique de calcul via une API REST sécurisée.
    *   **Tâches :** Créer l'endpoint `GET /api/analytics/custom-funnel` (protégé par `JwtAuthGuard`). Accepter le paramètre `period`. Appeler `funnelAnalyticsService.calculateCustomFunnelAnalytics`. Retourner les données formatées.
    *   **Tests (Windsurf - API via `supertest` si possible) :** Tester l'endpoint avec différentes périodes et s'assurer qu'il renvoie les données attendues (basées sur les mocks des tests unitaires du service).
    *   **Mesure de Succès :** L'API est fonctionnelle et renvoie les données d'analyse calculées.
    *   **Priorité :** Critique (après MB-3.1).
*   **MB-3.3 : Frontend - Page "Funnel Analytics" (Windsurf)**
    *   **Objectif :** Afficher l'entonnoir de conversion dynamique basé sur les données de l'API custom.
    *   **Tâches :** Modifier la page `/funnel-analytics`. Remplacer les données MOCK par un appel à `GET /api/analytics/custom-funnel` (via `fetchWithAuth`) en passant la période sélectionnée. Utiliser une librairie de graphiques (si déjà présente) ou une simple représentation HTML/CSS pour afficher l'entonnoir avec les étapes, les nombres, et les taux de conversion reçus de l'API. Ajouter un sélecteur de période (ex: 7 jours, 30 jours, 90 jours).
    *   **Tests (CTO Manuel) :** Vérifier l'affichage correct de l'entonnoir pour différentes périodes. Comparer les chiffres avec les attentes basées sur les données de test E2E.
    *   **Mesure de Succès :** L'utilisateur peut visualiser son funnel personnalisé et ses performances pour différentes périodes.
    *   **Priorité :** Critique (après MB-3.2).

---

**Phase 4 : Finalisation et Tests E2E**

*   **MB-4.1 : Backend - API Lister Touchpoints (MVP-7 - Windsurf)**
    *   **Objectif :** Permettre au frontend d'afficher la timeline brute des événements pour le débogage ou une vue détaillée.
    *   **Tâches :** Implémenter `GET /api/touchpoints/my` (authentifié) qui retourne les touchpoints de l'utilisateur, triés par date.
    *   **Tests (Windsurf/CTO) :** Appel API simple.
    *   **Mesure de Succès :** Endpoint fonctionnel.
    *   **Priorité :** Moyenne.
*   **MB-4.2 : Frontend - Générateur Snippet (MVP-8 - Windsurf)**
    *   **Objectif :** Fournir à l'utilisateur le snippet JS à copier/coller.
    *   **Tâches :** Créer/Finaliser la page `/tracking-snippet`. Afficher la balise `<script>` complète, en incluant dynamiquement le `data-fd-site` unique de l'utilisateur (à récupérer via `GET /api/users/me` ou à générer/stocker). Ajouter un bouton "Copier".
    *   **Tests (CTO Manuel) :** Vérifier affichage, vérifier copie.
    *   **Mesure de Succès :** L'utilisateur peut facilement récupérer son snippet personnalisé.
    *   **Priorité :** Haute.
*   **MB-4.3 : Frontend - Dashboard Minimal (MVP-9bis - Optionnel / Simplifié)**
    *   **Objectif :** Fournir une vue rapide, peut-être juste les KPIs globaux issus de l'analyse custom.
    *   **Tâches :** Modifier la page `/dashboard` pour appeler `/api/analytics/custom-funnel` et afficher quelques chiffres clés (Total Visites, Leads, RDV, Ventes, CA sur la période par défaut).
    *   **Tests (CTO Manuel) :** Vérifier affichage.
    *   **Mesure de Succès :** Vue d'accueil basique fonctionnelle.
    *   **Priorité :** Basse (Funnel Analytics est plus important).
*   **MB-4.4 : Tests E2E Complets & QA (MVP-10 - CTO + Windsurf)**
    *   **Objectif :** Valider l'ensemble des flux utilisateurs clés de bout en bout.
    *   **Tâches :**
        *   Test Complet iClosed (Page Test -> Résa -> Zapier -> Backend -> DB -> Funnel Analytics).
        *   Test Complet Stripe (Page Test -> Paiement Test -> Webhook -> Backend -> DB -> Funnel Analytics).
        *   Test Complet Calendly (Page Test -> Résa -> Webhook -> Backend -> DB -> Funnel Analytics).
        *   Test Opt-in AC/CK (Page Test avec Form -> Soumission -> API Bridge -> Backend -> DB -> Funnel Analytics).
        *   Test Connexion/Déconnexion YouTube.
        *   Validation Funnel Mapping.
        *   Validation Funnel Analytics (exactitude des chiffres, filtres).
    *   **Mesure de Succès :** Tous les flux principaux fonctionnent comme attendu, les données sont correctes et cohérentes dans l'application. MVP prêt pour bêta.
    *   **Priorité :** **FINALE ET CRITIQUE.**

---

Ce plan est beaucoup plus détaillé et intègre la partie Funnel Analytics custom comme un élément central du MVP. C'est ambitieux mais aligné avec ta vision.

**Prochaine Étape Concrète :**

1.  Windsurf doit commiter les dernières corrections backend.
2.  Windsurf doit créer la branche stable.
3.  Windsurf peut commencer **MB-1.1 (Intégration Stripe Frontend)** pendant que tu **valides le Test Zapier (MB-0.4)**.
