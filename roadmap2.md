# FunnelDoctor - Roadmap de Développement (Version Avril 2025 - Stratégie v2.1 - Post-CTO Review)

**Document de Référence Principal**

*(Basé sur le rapport d'état du 03/04/2025 et la revue du CTO externe)*

## 1. Contexte et Vision

**Objectif FunnelDoctor :** Fournir aux infopreneurs, créateurs de contenu et coachs une solution SaaS pour tracker et analyser la performance de leurs funnels marketing et ventes **organiques** de bout en bout, avec une attribution claire des conversions à la source d'origine (ex: vidéo YouTube spécifique).

**Problème Principal Adressé :** La fragmentation extrême des données analytics à travers de multiples outils (YouTube Analytics, CRM, Booking, Paiement, Emailing) rend l'attribution des conversions (leads, RDV, ventes) quasi impossible. Les créateurs ne savent pas quel contenu génère réellement du revenu.

**Proposition de Valeur Unique :**
1.  **Qualité du Tracking (Priorité #1) :** Reconstitution précise et complète du parcours utilisateur via un snippet intelligent, des intégrations serveur, et une logique de **"Data Stitching"** robuste (modèle "Master Lead") pour gérer les identités multiples (visitor_id anonyme, emails).
2.  **Simplicité Utilisateur (Priorité #2) :** Un seul snippet JS à installer, connexions API/OAuth intuitives dans l'application.
3.  **Architecture Scalable et Robuste :** Stack technique moderne (NestJS, Next.js, Supabase) découplée des spécificités des outils tiers.

## 2. Principes Directeurs

1.  **Focus sur la Fiabilité du Tracking :** L'exactitude des données est primordiale.
2.  **Expérience Développeur (et IA) Claire :** Architecture modulaire, code typé, processus de développement par micro-blocs testables.
3.  **MVP Strict :** Valider le flux de tracking E2E et la valeur du stitching avant d'ajouter des fonctionnalités complexes.

## 3. Stack Technique et Versions Clés (Avril 2025)

*   **Backend :** NestJS (Node.js, TypeScript)
    *   *Note : Versions approximatives à confirmer - NestJS v9/v10, TypeScript v4.x/v5.x*
    *   *Dette Technique Connue :* ~120 erreurs TS (`TS1240`/`TS1241`) liées aux décorateurs (`class-validator`, `class-transformer`). N'empêchent pas l'exécution JS mais nécessiteront une investigation post-MVP (probablement alignement des versions + `tsconfig.json`). Versions `class-validator`/`class-transformer` à vérifier.
*   **Frontend :** Next.js (v13+ App Router), React, TypeScript, Tailwind CSS
    *   *Structure :* Standard App Router (ex: `/app/settings/integrations/page.tsx`, `/app/dashboard/page.tsx`)
*   **Base de Données :** Supabase (PostgreSQL)
*   **Authentification :** **Supabase Auth** (gestion des utilisateurs et génération de JWT). Le frontend envoie le JWT dans les headers `Authorization: Bearer <token>` pour les appels API backend. Le backend valide le JWT pour identifier l'utilisateur.
*   **Infrastructure (Probable) :** Vercel (Frontend), Render/Fly.io (Backend), Supabase (DBaaS)
*   **Tests :** Jest (Unitaires Backend)
*   **Contrôle de Version :** Git / GitHub (Branche principale de travail : `feat/core-tracking-stitching`)

## 4. Architecture Fondamentale (Option 2 + Stitching + iClosed via Zapier)

*(Description détaillée de l'architecture, incluant Snippet JS, API Bridge, Webhooks, Logique de Stitching Backend, Schéma DB - voir rapport complet pour le détail. Points clés renforcés suite à la revue CTO)*

*   **Liaison UserID dans Webhooks (Critique) :**
    *   Chaque webhook entrant (Stripe, Calendly, iClosed/Zapier) **DOIT** être lié de manière fiable à l'utilisateur FunnelDoctor (`userId`) qui a configuré l'intégration.
    *   **Stratégie :**
        *   **Stripe :** Injecter `userId` (ou `orgId`) FunnelDoctor dans les `metadata` de la session Checkout. Le webhook lira cette metadata.
        *   **Calendly :** Lors de la création du webhook via l'API Calendly, si possible, inclure le `userId` FunnelDoctor dans l'URL du webhook (ex: `/webhook?userId=...`) ou via un scope/filtrage si l'API le permet. Sinon, nécessitera une table de mapping `webhook_id_calendly -> userId`.
        *   **iClosed (via Zapier) :** L'utilisateur configure sa **Clé API FunnelDoctor** personnelle dans l'action Webhook POST du Zap. Le backend utilise cette clé pour identifier le `userId`.
    *   Le backend **valide systématiquement** cette liaison avant de traiter l'événement pour garantir la multi-location.

## 5. Périmètre et Objectifs Stricts du MVP

*(Liste détaillée des fonctionnalités INCLUSES et EXCLUES - voir rapport complet. Le but est de prouver le tracking E2E et le stitching pour le flux principal : Source (YT) -> Landing -> Opt-in (AC/CK) -> Booking (Calendly/iClosed) -> Paiement (Stripe).)*

*   **INCLUS - Points Clés :**
    *   Snippet JS avec écriture cookie `_fd_vid`.
    *   Backend gérant le stitching et les webhooks (avec liaison `userId` fiable).
    *   Intégrations YT, Calendly, Stripe, AC/CK (opt-in), iClosed (via Zapier Template).
    *   Frontend minimal : Auth, Settings (connexions + section iClosed/Zapier), page Snippet, Dashboard affichant la **timeline brute des `touchpoints`**.
*   **EXCLUS - Points Clés :**
    *   Fusion avancée de leads, KPIs complexes, dashboards visuels, éditeur de funnel.
    *   Tests E2E automatisés, monitoring avancé.
    *   Support iClosed sans Zapier.

## 6. Roadmap MVP Finale Priorisée (Micro-Blocs Testables)

*(Actions séquentielles pour construire le MVP sur la branche `feat/core-tracking-stitching`)*

1.  **MVP-1 : Snippet JS - Écriture Cookie `_fd_vid` & UTMs.** (Développement JS)
    *   **Test:** Vérifier manuellement la création/mise à jour des cookies (`_fd_vid`, `_fd_utm_*`) dans le navigateur.
2.  **MVP-2 : Backend - Validation Démarrage & Test Initial Flux YouTube OAuth.** (Infrastructure/Exécution)
    *   **Test:** Confirmer démarrage backend sans erreur bloquante. Déclencher manuellement le flux OAuth YT et vérifier le stockage des tokens dans la BDD pour l'utilisateur test.
3.  **MVP-3 : Backend - Endpoint Webhook iClosed (`/api/webhooks/iclosed`).** (Développement Backend)
    *   **Test:** Envoyer un POST simulé (Postman) avec `apiKey`, `email`, `visitorId`. Vérifier création `touchpoint` lié au bon `userId` et `master_lead`. Tests unitaires Jest.
4.  **MVP-4 : Préparation Ressource - Création Template Zapier iClosed.** (Configuration Externe)
    *   **Test:** Activer le template sur un compte Zapier test, vérifier qu'il envoie le payload attendu à un outil de test (ex: webhook.site).
5.  **MVP-5 : Frontend - Finalisation Page Settings/Integrations.** (Développement Frontend)
    *   **Test:** Interaction UI : Connecter/déconnecter chaque service. Vérifier sauvegarde clés API. Flux OAuth YT E2E depuis le bouton. Affichage correct section iClosed (clé API user, lien Zap).
6.  **MVP-6 : Backend - API pour Lister les Touchpoints (`GET /api/touchpoints/my`).** (Développement Backend)
    *   **Test:** Appeler l'API (Postman) avec JWT valide. Vérifier retour des `touchpoints` attendus. Vérifier refus sans JWT ou avec JWT invalide. Tests unitaires Jest.
7.  **MVP-7 : Frontend - Finalisation Page Générateur de Snippet.** (Développement Frontend)
    *   **Test:** Charger la page, vérifier affichage du snippet correct et personnalisé pour l'utilisateur loggué.
8.  **MVP-8 : Frontend - Développement Dashboard Minimal (Timeline Touchpoints).** (Développement Frontend)
    *   **Test:** Charger la page, vérifier appel API (MVP-6) et affichage correct des données brutes des touchpoints.
9.  **MVP-9 : Tests E2E Manuels Complets & QA.** (Tests Fonctionnels)
    *   **Test:** Exécuter le scénario complet : Visite YT -> Landing (UTM) -> Optin -> Calendly -> iClosed -> Stripe. Vérifier la présence et la liaison correcte de tous les touchpoints dans le Dashboard Minimal.
10. **MVP-10 : Stabilisation & Préparation Beta.** (Finitions)
    *   **Test:** Revue générale, correction bugs mineurs. Création mini-guide utilisateur (surtout Zapier). *Stretch Goal :* Investigation/correction erreurs TS décorateurs.

## 7. Vision Post-MVP

*   Support avancé iClosed (si API disponible).
*   Intégrations additionnelles (ClickFunnels, Systeme.io...).
*   Logique de Fusion Avancée `master_leads`.
*   Dashboards Analytiques & KPIs.
*   Éditeur de Funnel Visuel.
*   Amélioration Tracking (Fingerprinting...).
*   Reporting Avancé (Cohortes...).
*   Fonctionnalités IA.
*   Tests E2E automatisés, Monitoring avancé.
*   Plugin WordPress / Template GTM.

## 8. Risques Principaux & Mitigations

*   **Risque : Fiabilité Capture JS Frontend (AC/CK).** Mitigation : Tests, monitoring, fallback si besoin.
*   **Risque : Dépendance Template Zapier (iClosed).** Mitigation : Documentation utilisateur claire, support.
*   **Risque : Changements APIs/Webhooks Externes.** Mitigation : Monitoring, validation robuste, veille.
*   **Risque : Complexité Stitching (Doublons).** Mitigation : Logique MVP simple, itérations, monitoring.

## 9. Conclusion

Cette roadmap mise à jour intègre les retours pour fournir un chemin clair vers un MVP fonctionnel et validant les hypothèses clés. La priorité absolue reste la fiabilité du tracking et la liaison correcte des événements aux utilisateurs. L'implémentation par micro-blocs testables facilitera le développement itératif.