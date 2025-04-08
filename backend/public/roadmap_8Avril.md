FunnelDoctor - Roadmap Consolidée MVP v4.1 (État au 08/04/2025)

Objectif Macro du MVP : Fournir aux infopreneurs une solution fiable et centralisée pour tracker le parcours de leurs prospects depuis une source identifiée (vidéo YouTube spécifique via lien tracké) jusqu'à la conversion clé (RDV, Paiement), en résolvant le stitching visitorId <-> emails multiples, et en fournissant des KPIs de base attribués par vidéo source.

Légende Statut :

✅ : Complété et Validé

🆗 : Fonctionnel mais avec limitations/bugs mineurs connus OU étape intermédiaire validée

⏳ : En cours / À Tester / À Valider (Code existant mais test E2E manquant)

❓ : À Définir / À Investiguer (Logique ou approche à préciser)

❌ : À Faire / Non Implémenté / Bloqué

Phase 1 : Validation Complète du Tracking & Stitching des Événements Clés

(Objectif : Assurer la capture fiable de chaque interaction et la liaison correcte visiteur-lead)

Bloc 1.0 : Tracking Frontend & visitorId

MB-1.0.1 : Snippet JS (funnel-doctor.js) - Création/Stockage visitorId & Cookies : ✅ COMPLÉTÉ. Génère funnel_doctor_visitor_id (note: nom de clé confirmé), stocke en LocalStorage, crée cookies _fd_vid et first_utm_content.

MB-1.0.2 : Snippet JS (funnel-doctor.js) - Capture UTMs & page_view : ✅ COMPLÉTÉ. Capture UTMs de l'URL, envoie page_view à /api/touchpoints.

MB-1.0.3 : Snippet JS (bridging.js) - Chargement & Initialisation : ✅ COMPLÉTÉ. Chargé après funnel-doctor.js, envoie bridging_initialized.

MB-1.0.4 : Configuration CORS Backend : ✅ COMPLÉTÉ. main.ts corrigé pour autoriser les origines requises (localhost, Ngrok, functions-js.kit.com).

Bloc 1.1 : Intégration Calendly

MB-1.1.1 : Connexion OAuth & Statut : ✅ COMPLÉTÉ. Flux OAuth fonctionne, /api/auth/calendly/status OK.

MB-1.1.2 : Réception Webhook /api/rdv/webhook-v2 (invitee.created) : ✅ COMPLÉTÉ. Webhook reçu, User ID résolu via URI.

MB-1.1.3 : Traitement Webhook & Stitching Email : ✅ COMPLÉTÉ. Backend traite le webhook, identifie/crée le MasterLead via l'email, crée touchpoint rdv_scheduled.

MB-1.1.4 : Stitching visitorId via Modification Lien (utm_content) : ❌ ÉCHEC / ABANDONNÉ. Fonctionne sur HTML simple mais échoue sur ConvertKit ET Calendly ne renvoie pas utm_content dans le webhook standard. Mesure de Succès : Non applicable.

MB-1.1.5 : Stitching visitorId via postMessage + API Bridge : 🆗 FONCTIONNEL (pour Widget Embed JS). bridging.js détecte event_scheduled (si widget embed), appelle /api/bridge/associate avec visitorId (email=null). Backend reçoit l'appel (route corrigée) et stocke dans bridge_associations. Mesure de Succès : Appel /api/bridge/associate reçu au backend après RDV via widget embed. Limitation : Ne fonctionne pas pour les liens Calendly directs / non-embed.

MB-1.1.6 : Stratégie Finale Calendly : ✅ DÉCIDÉE. Priorité à MB-1.1.5 (widget embed). Fallback : Stitching par Email (MB-1.1.3) + liaison visitorId via Opt-in (MB-1.4.3). Mesure de Succès : Stratégie documentée (MB-Doc-Final).

Bloc 1.2 : Intégration iClosed (via Zapier)

MB-1.2.1 : Réception Webhook /api/webhooks/iclosed : ✅ COMPLÉTÉ. Endpoint fonctionnel, User ID via API Key OK.

MB-1.2.2 : Traitement & Stitching (Email + visitorId) : ✅ COMPLÉTÉ. Backend traite le payload, appelle MasterLeadService avec email ET visitorId (si fourni par Zapier depuis cookie first_utm_content), crée touchpoint rdv_scheduled. Mesure de Succès : RDV iClosed avec visitorId connu lie correctement le touchpoint au bon lead et visiteur.

MB-1.2.3 : Template Zapier : ⏳ À FAIRE. Créer template incluant lecture cookie first_utm_content et envoi visitorId. Priorité : HAUTE. Mesure de Succès : Template Zapier fonctionnel et partageable.

Bloc 1.3 : Intégration Stripe

MB-1.3.1 : Réception & Vérification Webhook /api/payments/webhook : ✅ COMPLÉTÉ. Endpoint OK, vérification signature OK.

MB-1.3.2 : Traitement & Stitching (Email + visitorId) : ✅ COMPLÉTÉ. Backend traite checkout.session.completed, extrait email, cherche visitorId (metadata Stripe puis fallback Bridge), appelle MasterLeadService, crée touchpoint payment_succeeded (si visitorId trouvé). Mesure de Succès : Paiement Stripe lie correctement le touchpoint au bon lead et visiteur (via metadata ou bridge).

MB-1.3.3 : Injection visitorId par Snippet : ✅ COMPLÉTÉ. bridging.js contient la logique pour patcher stripe.redirectToCheckout et ajouter visitor_id aux metadata. Mesure de Succès : visitor_id présent dans les metadata Stripe lors d'un paiement test.

Bloc 1.4 : Intégration YouTube

MB-1.4.1 : Connexion OAuth : ✅ COMPLÉTÉ. Flux OAuth fonctionne.

MB-1.4.2 : Statut API & Refresh Token : ❌ BLOQUÉ / À CORRIGER. Problème critique de refresh token (erreur 400, job échoue, /status invalide). Priorité : CRITIQUE. Mesure de Succès : /api/auth/youtube/status renvoie statut valide, refresh token automatique fonctionne sans erreur.

Bloc 1.5 : Intégration Opt-in (ConvertKit ou autre)

MB-1.5.1 : Définition Stratégie Capture visitorId + Email : ❓ À DÉFINIR. Comment récupérer visitorId (LocalStorage) depuis le formulaire Opt-in et l'envoyer avec l'email au backend ? (Champ caché + JS ? Zapier ? Webhook natif ?). Priorité : HAUTE. Mesure de Succès : Méthode fiable identifiée et documentée.

MB-1.5.2 : Implémentation Backend Réception Opt-in : ❓ À FAIRE (ou vérifier). Quel endpoint reçoit ces données (/api/bridge/associate ou autre) ? Appelle-t-il MasterLeadService avec email ET visitorId ? Priorité : HAUTE. Mesure de Succès : Endpoint fonctionnel recevant email+visitorId et créant/mettant à jour l'association MasterLead.

MB-1.5.3 : Création Touchpoint optin : ❓ À FAIRE (ou vérifier). Un touchpoint optin est-il créé et lié au bon lead/visiteur ? Priorité : HAUTE. Mesure de Succès : Touchpoint optin créé et correctement associé.

Phase 2 : Développement Logique Métier & Interface Utilisateur

Bloc 2.1 : Définition du Funnel Utilisateur

MB-2.1.1 : API Funnel Steps (CRUD & Ordonnancement) : ✅ COMPLÉTÉ.

MB-2.1.2 : UI Funnel Mapping : ✅ COMPLÉTÉ.

Bloc 2.2 : Calcul KPIs & Logique Analytics

MB-2.2.1 : Tracking RDV "Réalisé" : ❓ À DÉFINIR. Comment savoir si un RDV scheduled a eu lieu ? (Webhook invitee.canceled ? Update manuel ? API externe ?). Priorité : HAUTE (pour KPIs fiables). Mesure de Succès : Méthode définie et logique backend prête à être implémentée.

MB-2.2.2 : Services Analytics Backend : ❌ BLOQUÉ / À CORRIGER. Services existent mais requêtes SQL échouent (erreur site_id). Logique d'agrégation/conversion basée sur funnel_steps utilisateur et attribution vidéo source à implémenter. Priorité : CRITIQUE (Correction Erreurs SQL + Implémentation Logique Attribution). Mesure de Succès : Services capables de calculer KPIs de base (Visiteurs, Leads, RDV, Ventes, CA, Taux Conv.) par source UTM/Vidéo SANS erreur SQL.

MB-2.2.3 : API Analytics : ❌ BLOQUÉ / À CORRIGER. Endpoints /api/analytics/... (généraux : /summary, /funnel, /by-source) à créer/finaliser après correction MB-2.2.2. L'endpoint /youtube-funnel existant est aussi bloqué. Priorité : CRITIQUE (Après MB-2.2.2). Mesure de Succès : API REST fonctionnelle renvoyant les KPIs agrégés et par source/vidéo.

Bloc 2.3 : Affichage Frontend Analytics

MB-2.3.1 : UI Dashboard Principal : ⏳ À FINALISER. UI existe mais doit consommer les API générales (MB-2.2.3) une fois fonctionnelles. Priorité : CRITIQUE (Après API). Mesure de Succès : Dashboard affichant KPIs clés et vue funnel agrégée corrects.

MB-2.3.2 : UI Rapport Performance Vidéos : ⏳ À FINALISER. UI existe (probablement) mais doit consommer l'API /by-source (MB-2.2.3) une fois fonctionnelle. Priorité : CRITIQUE (Après API). Mesure de Succès : Tableau/Graphique affichant Visiteurs, Leads, RDV, Ventes, CA par vidéo YouTube source.

Phase 3 : Finalisation, Outils & Tests

Bloc 3.1 : Outils Utilisateur

MB-3.1.1 : Générateur de Snippet Finalisé : ⏳ À FAIRE. Mettre à jour la page UI /tracking-snippet pour générer le snippet V2 (chargement 2 temps) avec le Site ID dynamique de l'utilisateur. Priorité : HAUTE. Mesure de Succès : Snippet correct et facilement copiable par l'utilisateur.

MB-3.1.2 : Template Zapier iClosed : ⏳ À FAIRE. (cf MB-1.2.3). Priorité : HAUTE.

Bloc 3.2 : Sécurité & Technique

MB-3.2.1 : Sécurisation Webhook Calendly (Signature) : ⏳ À FAIRE. Récupérer clé secrète Calendly, implémenter vérification dans CalendlyV2Service. Priorité : HAUTE. Mesure de Succès : Webhooks Calendly non signés rejetés.

MB-3.2.2 : Nettoyage Déconnexion Calendly (Webhook) : ❌ À FAIRE. Ajouter appel API DELETE webhook Calendly lors de la révocation. Priorité : MOYENNE. Mesure de Succès : Webhook supprimé chez Calendly à la déconnexion.

MB-3.2.3 : Correction Bug Validation DTO iClosed : ❓ À INVESTIGUER/CORRIGER. Erreur 400 post-succès sur /api/webhooks/iclosed. Priorité : BASSE. Mesure de Succès : Absence de l'erreur 400 après traitement succès.

MB-3.2.4 : Refactoring Frontend (Hooks) : ❌ À FAIRE. Priorité : MOYENNE/BASSE (Post-MVP ?).

Bloc 3.3 : Tests & Documentation

MB-3.3.1 : Tests End-to-End Scénarios Clés : ⏳ À FAIRE. Tester parcours complets (YT -> LP -> Opt-in -> RDV iClosed/Calendly Embed -> Paiement Stripe). Vérifier stitching via Opt-in. Vérifier KPIs/Attribution Vidéo après corrections. Priorité : CRITIQUE. Mesure de Succès : Données cohérentes et KPIs corrects affichés pour les parcours testés.

MB-3.3.2 : Documentation Finale (TRACKING_SETUP.md, CALENDLY_TRACKING_STRATEGY.md, Logs, Roadmap) : ⏳ À FAIRE. Priorité : MOYENNE (Avant/Pendant QA). Mesure de Succès : Documentation claire, complète et à jour.