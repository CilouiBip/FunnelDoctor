# Stratégie de Tracking Calendly pour FunnelDoctor – VERSION FINALE MVP

## Objectif

Ce document définit la stratégie **FINALE VALIDÉE** pour le tracking des rendez-vous Calendly dans FunnelDoctor et la méthode retenue pour lier le `visitorId` aux leads générés, permettant ainsi une vision complète du parcours utilisateur du premier clic jusqu'à la conversion.

## Méthode Principale (Widget Embed JavaScript) - **RECOMMANDÉE**

> **RECOMMANDATION OFFICIELLE POUR LE MVP** : Cette méthode est la seule garantissant un tracking fiable et direct entre la session (visitorId) et le RDV Calendly. Elle doit être privilégiée dans toutes les intégrations que le client peut contrôler.

### Flux de données

1. **Capture d'événement** : Le script `funnel-doctor.js` charge `bridging.js` qui met en place un écouteur pour les événements `postMessage` générés par le widget Calendly embed.

2. **Détection d'un rendez-vous** : Lorsqu'un événement `calendly.event_scheduled` est détecté, le script extrait:
   - Le `visitorId` stocké localement (généré lors de l'arrivée initiale du visiteur)  
   - L'email du participant (si disponible dans l'événement)

3. **Transmission au backend** : Le script envoie ces informations à l'endpoint `/api/bridge/associate` via `sendBeacon` ou `fetch` fallback, **même si l'email n'est pas disponible** (récent ajustement pour plus de robustesse).

4. **Stockage de l'association** : Le backend (via `BridgingService.createAssociation()`) stocke cette association dans la table `bridge_associations`.

5. **Webhook Calendly** : Séparément, le webhook Calendly `/api/rdv/webhook-v2` est déclenché avec les détails complets du rendez-vous, incluant l'email du participant.

6. **Corrélation finale** : L'association entre le `visitorId` (session) et le rendez-vous (lead) est établie grâce à:
   - L'association directe dans `bridge_associations` (si le widget embed a fonctionné)
   - Une corrélation temporelle et le lien via le `MasterLead`

### Implémentation Recommandée pour les Clients

**L'utilisation du widget embed JavaScript de Calendly est la SEULE méthode recommandée officiellement** pour le MVP. Les tests ont démontré de manière conclusive que c'est la seule approche garantissant un tracking fiable de la session visiteur.

**⚠️ IMPORTANT** : Les clients doivent être explicitément informés que l'utilisation de liens directs Calendly (sans embed) compromet significativement la précision du tracking.

Exemple d'implémentation recommandée:

```html
<!-- Snippet FunnelDoctor (à placer avant Calendly) -->
<script src="https://funnel.doctor/funnel-doctor.js" data-fd-site="votre-site-id"></script>

<!-- Script Bridging (pour liaison visitor_id) -->
<script src="https://funnel.doctor/bridging.js"></script>

<!-- Widget Calendly (embed JavaScript) -->
<div class="calendly-inline-widget" data-url="https://calendly.com/votre-compte/..." style="min-width:320px;height:630px;"></div>
<script type="text/javascript" src="https://assets.calendly.com/assets/external/widget.js" async></script>
```

## Méthode Fallback (Lien Direct / Échec `postMessage` / Contexte ConvertKit) - **SOLUTION DE REPLI**

> **AVERTISSEMENT** : Cette méthode est considérée comme un **FALLBACK OBLIGATOIRE** mais **non optimal**. Son utilisation affecte significativement la précision du tracking et nécessite absolument une étape d'Opt-in préalable pour fonctionner correctement.

### Cas d'utilisation concernés

- Utilisation d'un lien direct vers Calendly (sans widget embed)
- Intégration dans certaines plateformes comme ConvertKit où le widget est encapsulé
- Situations où l'événement `postMessage` ne parvient pas au script `bridging.js`
- Généralement tout environnement où le client n'a pas le contrôle total sur l'intégration Calendly

### Limites Identifiées (CONFIRMÉES DÉFINITIVEMENT après tests approfondis)

1. **Échec définitif de la modification de lien** : La tentative d'ajouter `utm_content` avec le `visitorId` dans les liens Calendly échoue systématiquement sur ConvertKit et d'autres plateformes tierces.

2. **Non-transmission des UTM par Calendly** : Calendly ne renvoie **JAMAIS** les paramètres `utm_content` dans le webhook standard `invitee.created`, rendant cette approche inutilisable.

3. **Absence d'événement `postMessage`** : Les liens directs vers Calendly ne déclenchent pas l'événement `calendly.event_scheduled` nécessaire au tracking via `bridging.js`.

### Solution de Fallback (DÉCISION FINALISÉE)

Dans ces situations, le stitching se base **exclusivement sur l'email** reçu via le webhook Calendly `/api/rdv/webhook-v2`. 

- Le touchpoint `rdv_scheduled` sera correctement attribué au bon `MasterLead` basé sur l'email
- Un `visitorId` de fallback (format `calendly_uuid`) sera généré
- La session de visite initiale ne sera pas directement liée au rendez-vous sans étape complémentaire

### CRITIQUE : Opt-in Obligatoire comme Pont entre VisitorId et Email

Pour assurer un suivi complet du parcours utilisateur dans ce scénario fallback, il est **ABSOLUMENT INDISPENSABLE** de capturer l'**email ET le `visitorId`** lors d'un événement **précédent fiable**, typiquement un **Opt-in**. Sans cette étape, le parcours visiteur sera incomplet.

Configuration recommandée pour l'opt-in:
1. Intégrer un champ caché contenant le `visitorId` dans le formulaire d'opt-in
2. S'assurer que l'email ET le `visitorId` sont transmis au backend FunnelDoctor via:
   - JavaScript côté client
   - Intégration Zapier
   - Webhook natif de l'outil d'opt-in

Lorsque l'email est capturé à la fois pendant l'opt-in et le rendez-vous Calendly, le système peut reconstituer le parcours complet même sans lien direct entre la session initiale et le rendez-vous.

## Limitations Connues - CONFIRMATION FINALE

⚠️ **Ces limitations ont été confirmées par des tests exhaustifs et validées dans la stratégie finale par l'équipe technique.**

1. **Widget Embed JavaScript OBLIGATOIRE pour tracking direct** : Seul le widget embed JavaScript permet un tracking fiable et direct du `visitorId` au moment de la prise de rendez-vous. Les liens directs ne peuvent pas transmettre cette information.

2. **Incompatibilité CONFIRMÉE avec ConvertKit et plateformes similaires** :
   - Modification de liens Calendly bloquée de manière systématique
   - Événements `postMessage` non transmis au script `bridging.js` en raison de l'encapsulation
   - Aucune solution directe disponible dans le cadre du MVP

3. **Non-transmission définitive des UTM par Calendly** : Les tests ont confirmé que Calendly ne transmet jamais les paramètres UTM (notamment `utm_content`) via son webhook standard `invitee.created`, rendant cette approche inutilisable.

4. **Dépendance CRITIQUE à l'opt-in pour le fallback** : Sans opt-in préalable capturant email + `visitorId`, **il est IMPOSSIBLE de reconstituer le parcours visiteur complet** dans les scénarios de fallback (liens directs, ConvertKit).

## Prochaines Étapes (Post-MVP) - DÉPRIORISÉES

> **NOTE IMPORTANTE** : Suite à l'avis du CTO, ces améliorations sont **officiellement dépriorisées** en faveur des corrections d'Analytics SQL et YouTube Token. Elles seront reconsidérées uniquement après stabilisation des fonctionnalités actuelles.

1. **Question personnalisée Calendly** : Explorer l'ajout d'une question personnalisée invisible dans le formulaire Calendly pour transmettre le `visitorId`.

2. **Page intermédiaire de redirection** : Développer une page intermédiaire qui stockerait le `visitorId` en session et redirigerait vers Calendly avec des paramètres fiables.

3. **Intégration API Calendly avancée** : Explorer les possibilités d'une intégration plus profonde via l'API Calendly pour les comptes Premium.

4. **Amélioration du stitching algorithmique** : Raffiner l'algorithme de corrélation temporelle pour améliorer la précision dans les scénarios de fallback.

---

## Conclusion et Recommandation Finale CTO

Suite aux tests exhaustifs et à l'analyse approfondie réalisée jusqu'au 08/04/2025, la stratégie **FINALE OFFICIELLE pour le MVP** est la suivante :

1. **Priorité Absolue : Widget Embed JavaScript + `postMessage` + Bridge API**
   - Seule solution garantissant un tracking direct et fiable
   - Fortement recommandée pour tous les sites contrôlés par le client

2. **Fallback Obligatoire : Stitching via Email + Opt-in Préalable**
   - Pour les liens directs Calendly et les intégrations dans des plateformes tierces
   - **Nécessite impérativement** la capture de l'email et du `visitorId` lors de l'opt-in
   
### Décision Finale du CTO :

> "La stratégie hybride est validée définitivement. Suite à l'analyse complète, l'équipe doit maintenant se focaliser sur la correction des bugs critiques d'Analytics SQL et de gestion des tokens YouTube avant toute optimisation ultérieure du tracking Calendly. L'implémentation actuelle couvre les besoins du MVP et les améliorations de cette partie sont déprioritisées."
