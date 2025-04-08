# Stratégie de Tracking Calendly pour FunnelDoctor

## Objectif

Ce document explique comment FunnelDoctor tracke les rendez-vous Calendly et lie le `visitorId` aux leads générés, permettant ainsi une vision complète du parcours utilisateur à travers le funnel marketing et vente.

## Méthode Principale (Widget Embed JavaScript)

### Flux de données

1. **Capture d'événement** : Le script `funnel-doctor.js` charge `bridging.js` qui met en place un écouteur pour les événements `postMessage` générés par le widget Calendly embed.

2. **Détection d'un rendez-vous** : Lorsqu'un événement `calendly.event_scheduled` est détecté, le script extrait:
   - Le `visitorId` stocké localement (généré lors de l'arrivée initiale du visiteur)  
   - L'email du participant (si disponible dans l'événement)

3. **Transmission au backend** : Le script envoie ces informations à l'endpoint `/api/bridge/associate` via `sendBeacon` ou `fetch` fallback, **même si l'email n'est pas disponible**.

4. **Stockage de l'association** : Le backend (via `BridgingService.createAssociation()`) stocke cette association dans la table `bridge_associations`.

5. **Webhook Calendly** : Séparément, le webhook Calendly `/api/rdv/webhook-v2` est déclenché avec les détails complets du rendez-vous, incluant l'email du participant.

6. **Corrélation finale** : L'association entre le `visitorId` (session) et le rendez-vous (lead) est établie grâce à:
   - L'association directe dans `bridge_associations` (si le widget embed a fonctionné)
   - Une corrélation temporelle et le lien via le `MasterLead`

### Recommandation pour les clients

**L'utilisation du widget embed JavaScript de Calendly est fortement recommandée** pour garantir un tracking précis de la session. C'est la seule méthode qui permet de capturer de manière fiable le `visitorId` au moment de la prise de rendez-vous.

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

## Méthode Fallback (Lien Direct / Échec `postMessage` / Contexte ConvertKit)

### Cas d'utilisation concernés

- Utilisation d'un lien direct vers Calendly (sans widget embed)
- Intégration dans certaines plateformes comme ConvertKit où le widget est encapsulé
- Situations où l'événement `postMessage` ne parvient pas au script `bridging.js`

### Limites identifiées

1. **Échec de la modification de lien** : La tentative d'ajouter `utm_content` avec le `visitorId` dans les liens Calendly échoue sur certaines plateformes (notamment ConvertKit).

2. **Non-transmission des UTM** : Calendly ne renvoie pas les paramètres `utm_content` dans le webhook standard `invitee.created`.

3. **Absence d'événement `postMessage`** : Les liens directs vers Calendly ne déclenchent pas l'événement `calendly.event_scheduled` nécessaire au tracking via `bridging.js`.

### Solution de fallback

Dans ces situations, le stitching se base **uniquement sur l'email** reçu via le webhook Calendly `/api/rdv/webhook-v2`. 

- Le touchpoint `rdv_scheduled` sera correctement attribué au bon `MasterLead` basé sur l'email
- Un `visitorId` de fallback (format `calendly_uuid`) sera généré
- La session de visite initiale ne sera pas directement liée au rendez-vous

### Importance cruciale de l'Opt-in

Pour assurer un suivi complet du parcours utilisateur dans ce scénario fallback, il est **INDISPENSABLE** de capturer l'**email ET le `visitorId`** lors d'un événement **précédent fiable**, typiquement un **Opt-in**.

Configuration recommandée pour l'opt-in:
1. Intégrer un champ caché contenant le `visitorId` dans le formulaire d'opt-in
2. S'assurer que l'email ET le `visitorId` sont transmis au backend FunnelDoctor via:
   - JavaScript côté client
   - Intégration Zapier
   - Webhook natif de l'outil d'opt-in

Lorsque l'email est capturé à la fois pendant l'opt-in et le rendez-vous Calendly, le système peut reconstituer le parcours complet même sans lien direct entre la session initiale et le rendez-vous.

## Limitations Connues

1. **Widget Calendly requis** : Seul le widget embed JavaScript permet un tracking fiable du `visitorId` au moment de la prise de rendez-vous.

2. **Échec avec ConvertKit** : L'intégration dans ConvertKit présente des défis particuliers:
   - Modification de liens non supportée
   - Événements `postMessage` non transmis au script `bridging.js`

3. **Non-transmission des UTM** : Calendly ne transmet pas les paramètres UTM (notamment `utm_content`) via son webhook standard.

4. **Dépendance à l'opt-in** : Sans opt-in préalable capturant email + `visitorId`, la reconstitution complète du parcours peut être compromise dans les scénarios de fallback.

## Prochaines Étapes Potentielles (Post-MVP)

1. **Question personnalisée Calendly** : Explorer l'ajout d'une question personnalisée invisible dans le formulaire Calendly pour transmettre le `visitorId`.

2. **Page intermédiaire** : Développer une page intermédiaire qui stockerait le `visitorId` en session et redirigerait vers Calendly avec des paramètres fiables.

3. **Intégration API Calendly** : Explorer les possibilités d'une intégration plus profonde via l'API Calendly pour les comptes Premium.

4. **Amélioration du stitching** : Raffiner l'algorithme de corrélation temporelle pour améliorer la précision dans les scénarios de fallback.

---

**Note technique** : Cette stratégie hybride a été validée après des tests approfondis avec différentes configurations. Le compromis entre fiabilité et flexibilité a été soigneusement calibré pour maximiser la précision du tracking tout en tenant compte des limitations techniques des plateformes tierces.
