# Risques et Solutions pour la Fiabilité des Données (95% Target)

## Objectif
Ce document identifie les risques principaux liés à notre objectif ambitieux d'avoir 95% de données fiables et de stitching correct, ainsi que les solutions potentielles pour y remédier.

## Risques Liés à la Fiabilité des Données (Tracking & Stitching)

### 1. Perte du `visitorId` (Tracking Interrompu)

**Risque :** 
L'utilisateur vide ses cookies/LocalStorage, utilise la navigation privée systématiquement, change de navigateur ou d'appareil sans se ré-identifier (via opt-in/login). Plusieurs sessions d'un même utilisateur apparaissent comme des visiteurs distincts.

**Impact :** 
Fragmentation du parcours, sous-estimation de la LTV, attribution incorrecte, difficulté à stitcher.

**Solutions / Atténuations :**
- **Cookies First-Party Longue Durée :** Utiliser des cookies first-party (`_fd_vid`, `first_utm_content`) avec une expiration longue (ex: 1 an) en plus du LocalStorage pour augmenter la persistance. (Déjà en place ✅)
- **Encourager l'Identification Précoce :** Inciter fortement les utilisateurs finaux (clients infopreneurs) à placer un Opt-in (formulaire email) tôt dans leur funnel. C'est le **MEILLEUR** moyen de lier rapidement un `visitorId` à un email et de commencer le stitching.
- **Stitching Probabiliste (Avancé / Post-MVP) :** Utiliser des techniques plus avancées qui essaient de deviner si deux sessions anonymes sont la même personne en se basant sur des "empreintes digitales" (fingerprinting) comme l'adresse IP (anonymisée), la résolution d'écran, le user-agent, les polices installées, etc. *Attention : Moins fiable et potentiellement problématique niveau RGPD.*
- **Cross-Device Stitching via Login (Avancé) :** Si FunnelDoctor gérait aussi un espace membre pour les clients de vos clients, un login permettrait de lier différents appareils/navigateurs au même utilisateur. *Hors scope MVP.*
- **Transparence :** Éduquer vos clients sur ces limitations inhérentes au tracking web.

### 2. Échec de la Transmission du `visitorId` aux Points Clés

**Risque :** 
Comme on l'a vu avec Calendly/ConvertKit, même si le `visitorId` existe côté client, il n'est pas toujours possible de le transmettre de manière fiable au backend avec l'événement de conversion (modification de lien bloquée, `postMessage` non émis/reçu, API tierce limitée).

**Impact :** 
Le backend ne peut pas faire le lien direct entre la session et la conversion spécifique. Il doit se baser sur l'email seul ou des fallbacks.

**Solutions / Atténuations :**
- **Stratégie Multi-Points de Contact (LA CLÉ) :** Ne pas dépendre d'UN SEUL mécanisme. Assurer la capture `visitorId` + Email sur **tous les points possibles** :
  - **Opt-in :** Priorité absolue. Mettre en place la capture fiable (champ caché + JS/Zapier...).
  - **Paiement (Stripe) :** Assurer l'injection dans les metadata.
  - **Formulaires de Contact/Autres :** Si applicable.
- **Mécanisme de Bridge Robuste :** L'API `/api/bridge/associate` est essentielle pour stocker les liens `visitorId` <-> Email dès qu'ils sont connus.
- **Stitching Basé sur Email (Fallback Fiable) :** Toujours utiliser l'email comme identifiant principal pour le `MasterLead` lorsque le `visitorId` n'est pas disponible directement avec l'événement.
- **Recommandations Client :** Guider les utilisateurs vers les intégrations les plus fiables (ex: widget embed Calendly JS plutôt que lien direct si `postMessage` fonctionne avec l'embed).
- **Explorer Alternatives Techniques (Post-MVP ?) :** Redirection intermédiaire, Question perso Calendly (si validé).

### 3. Utilisation d'Emails Multiples par le Même Lead

**Risque :** 
Un utilisateur utilise `email1@...` pour l'opt-in, `email2@...` pour Calendly, `email3@...` pour Stripe.

**Impact :** 
Sans stitching via `visitorId`, le backend crée plusieurs `MasterLead` distincts pour la même personne. Le parcours est fragmenté, les KPIs par personne sont faux.

**Solutions / Atténuations :**
- **Stitching via `visitorId` (Fondamental) :** Si l'utilisateur utilise le même navigateur/appareil (et donc le même `visitorId`) pour toutes ces étapes, ET si on a réussi à lier CE `visitorId` à AU MOINS UN de ces emails (idéalement l'opt-in), alors le `MasterLeadService` devrait pouvoir les regrouper. Quand `email2` arrive, il trouve Lead 2. Quand `email3` arrive, il trouve Lead 3. Mais si les touchpoints associés à ces leads partagent le même `visitorId` qu'un autre lead (Lead via Opt-in), une logique de *fusion* (post-MVP ?) ou d'analyse croisée pourrait les relier.
- **Liaison Forte via Opt-in :** Encore une fois, capturer `visitorId` + Email à l'opt-in est la meilleure défense. Ça crée le lien initial.
- **Fusion Manuelle/Semi-Automatique (Post-MVP) :** Prévoir une fonctionnalité (peut-être pour l'admin FunnelDoctor au début) pour détecter les doublons potentiels (ex: leads avec noms similaires, IPs proches, activité rapprochée) et proposer/permettre une fusion manuelle des `MasterLead`.

### 4. Données Incomplètes ou Incorrectes des Tiers

**Risque :** 
Un webhook n'arrive pas, arrive en retard, contient des données incorrectes ou partielles (ex: `utm_content` `null`), l'API tierce change...

**Impact :** 
Trous dans le tracking, données erronées.

**Solutions / Atténuations :**
- **Monitoring & Alerting :** Surveiller les taux d'erreur des webhooks et des appels API.
- **Gestion Robuste des Erreurs :** Le backend doit gérer les erreurs gracieusement (ne pas planter, logger l'erreur, éventuellement réessayer si c'est une erreur temporaire).
- **Validation des Données :** Utiliser des DTOs avec validation (`class-validator`) pour s'assurer que les données reçues ont le bon format avant de les traiter.
- **Fallback Logique :** Avoir des stratégies de repli (comme le fallback sur email quand le `visitorId` manque).
- **Documentation Claire des Intégrations :** Bien documenter comment chaque intégration doit être configurée (ex: Zapier iClosed avec lecture cookie).

### 5. Complexité de l'Attribution (Surtout Multi-Touch)

**Risque :** 
Un utilisateur voit une vidéo YT (obtient `visitorId` A), revient plus tard via une pub FB (nouvelle session, `visitorId` B ? Ou même session A avec nouveaux UTMs ?), fait un opt-in, prend RDV... À quelle source attribuer la conversion finale ?

**Impact :** 
KPIs par source peuvent être faussés si l'attribution est trop simpliste.

**Solutions / Atténuations (MVP) :**
- **Attribution "First Touch" (Simplifiée) :** Pour le MVP, se concentrer sur l'attribution à la **première source UTM connue** associée au `visitorId` qui a mené à la chaîne de conversion. C'est le plus simple et souvent suffisant au début. Le `MasterLeadService` et les touchpoints doivent conserver cette info UTM initiale liée au `visitorId`.
- **Stockage de TOUS les Touchpoints :** Garder l'historique complet des interactions (`touchpoints`) permettra des analyses d'attribution plus complexes *plus tard*.
- **(Post-MVP) :** Implémenter des modèles d'attribution plus avancés (Last Touch, Linéaire, Time Decay...).

## En résumé, pour atteindre ~95% de fiabilité :

* **Solidifier le lien Opt-in (`visitorId` + Email)** est la priorité #1 pour le stitching multi-emails.
* **Accepter les limitations** de certaines intégrations (Calendly lien direct) et se reposer sur le fallback email + lien via Opt-in.
* **Rendre le backend robuste** aux erreurs et aux données partielles.
* **Privilégier un modèle d'attribution simple** (First Touch via UTM/`visitorId`) pour le MVP.
* **Être transparent** avec les utilisateurs sur les limites inhérentes au tracking web.

Cela demande un travail technique rigoureux, mais c'est faisable en se concentrant sur les bons points de capture et de liaison.
