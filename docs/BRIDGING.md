# Visitor-Lead Bridging

Ce document explique comment fonctionne le systu00e8me de bridging entre visitors (identifiu00e9s via cookies) et leads (identifiu00e9s via email) dans FunnelDoctor.

## Table des matiu00e8res

1. [Pru00e9sentation de la solution](#pru00e9sentation-de-la-solution)
2. [Architecture technique](#architecture-technique)
3. [Installation sur votre site](#installation-sur-votre-site)
4. [Intu00e9gration avec Calendly](#intu00e9gration-avec-calendly)
5. [Intu00e9gration avec Stripe](#intu00e9gration-avec-stripe)
6. [Personnalisation avancu00e9e](#personnalisation-avancu00e9e)
7. [Diagnostics et du00e9pannage](#diagnostics-et-du00e9pannage)

## Pru00e9sentation de la solution

Le bridging est une solution qui permet de suivre un visiteur tout au long de son parcours sur votre funnel, mu00eame lorsqu'il passe par des systu00e8mes externes comme Calendly (pour prendre rendez-vous) ou Stripe (pour effectuer un paiement).

### Problu00e8me ru00e9solu

Sans bridging, lorsqu'un visiteur prend rendez-vous via Calendly ou effectue un paiement via Stripe, vous perdez sa trace et ne pouvez pas relier ces actions u00e0 ses pru00e9cu00e9dentes visites sur votre site. Le bridging ru00e9sout ce problu00e8me en propageant l'identifiant du visiteur (`visitor_id`) u00e0 travers ces services externes.

### Avantages

- **Consolidation des donnu00e9es** : Associez automatiquement les visiteurs aux leads
- **Tracking pru00e9cis** : Suivez l'ensemble du parcours client mu00eame u00e0 travers les services externes
- **Analytics amu00e9lioru00e9s** : Obtenez des rapports de conversion plus pru00e9cis
- **Fusion de leads** : Consolidez automatiquement les leads dupliquu00e9s

## Architecture technique

Le systu00e8me de bridging repose sur une architecture en deux parties :

### 1. Scripts cu00f4tu00e9 client

- **funnel-doctor.js** : Script principal qui gu00e9nu00e8re et stocke le `visitor_id`
- **bridging.js** : Script spu00e9cifique qui ajoute le `visitor_id` aux liens Calendly et boutons de paiement

### 2. Webhooks cu00f4tu00e9 serveur

- **Stripe Webhook** : Reu00e7oit les notifications de paiement et associe le `visitor_id` au lead
- **Calendly Webhook** : Reu00e7oit les notifications de rendez-vous et associe le `visitor_id` au lead

![Architecture de bridging](https://example.com/bridging-architecture.png)

## Installation sur votre site

### u00c9tape 1: Installation du script principal

Ajoutez le script `funnel-doctor.js` u00e0 **toutes** les pages de votre site :

```html
<!-- Script principal FunnelDoctor - u00e0 ajouter dans le <head> de toutes vos pages -->
<script src="https://votre-domaine.com/funnel-doctor.js" data-site-id="votre-site-id"></script>
```

### u00c9tape 2: Installation du script de bridging

Ajoutez le script `bridging.js` uniquement sur les pages ou00f9 vous avez des boutons Calendly ou des boutons de paiement :

```html
<!-- Script de bridging - u00e0 ajouter sur les pages avec Calendly/Stripe -->
<script src="https://votre-domaine.com/bridging.js" 
        data-calendly-selectors=".my-calendly-button, a[href*='calendly.com']" 
        data-payment-selectors=".my-stripe-button, .buy-now"></script>
```

> **Important** : Le script `bridging.js` doit toujours u00eatre chargu00e9 **apru00e8s** le script `funnel-doctor.js`.

## Intu00e9gration avec Calendly

### Configuration standard

Le script `bridging.js` modifie automatiquement tous les liens Calendly pour ajouter le `visitor_id` comme paramu00e8tre UTM :

- `utm_source=visitor_id`
- `utm_medium=[VISITOR_ID_VALUE]`

Aucune configuration supplu00e9mentaire n'est nu00e9cessaire cu00f4tu00e9 client.

### Configuration Webhook (cu00f4tu00e9 Calendly)

1. Connectez-vous u00e0 votre compte Calendly
2. Allez dans `Integrations > Webhooks`
3. Ajoutez un nouveau webhook :
   - URL: `https://votre-domaine.com/api/rdv/webhook`
   - u00c9vu00e9nement: `invitee.created`
4. Sauvegardez le webhook

## Intu00e9gration avec Stripe

### Configuration standard

Pour les boutons de paiement avec Stripe, vous pouvez utiliser deux approches :

#### Option 1: Redirection automatique (recommandu00e9e)

Utilisez des boutons avec des attributs data pour une redirection automatique vers Stripe :

```html
<button class="payment-button" 
        data-price-id="price_1234567890" 
        data-success-url="https://votre-site.com/merci" 
        data-cancel-url="https://votre-site.com/annulation">
  Acheter maintenant - 97u20ac
</button>
```

#### Option 2: API JavaScript

Utilisez l'API JavaScript pour du00e9clencher une redirection Stripe :

```javascript
FunnelDoctorBridging.createStripeCheckout({
  priceId: 'price_1234567890',
  successUrl: 'https://votre-site.com/merci',
  cancelUrl: 'https://votre-site.com/annulation'
});
```

### Configuration Webhook (cu00f4tu00e9 Stripe)

1. Connectez-vous u00e0 votre dashboard Stripe
2. Allez dans `Du00e9veloppeurs > Webhooks`
3. Ajoutez un endpoint :
   - URL: `https://votre-domaine.com/api/payments/webhook`
   - u00c9vu00e9nements: `checkout.session.completed`
4. Notez le "Signing secret" gu00e9nu00e9ru00e9 et ajoutez-le u00e0 votre configuration FunnelDoctor

## Personnalisation avancu00e9e

### Su00e9lecteurs de boutons personnalisu00e9s

Vous pouvez personnaliser les su00e9lecteurs CSS utilisu00e9s pour du00e9tecter les boutons Calendly et les boutons de paiement :

```html
<script src="https://votre-domaine.com/bridging.js" 
        data-calendly-selectors=".my-custom-calendly-class, #my-calendly-button" 
        data-payment-selectors=".my-custom-payment-class, #my-payment-button"></script>
```

### Mode Debug

Activez le mode debug pour voir les logs dans la console du navigateur :

```html
<script src="https://votre-domaine.com/bridging.js" data-debug="true"></script>
```

### Endpoint API personnalisu00e9

Si vous hu00e9bergez l'API FunnelDoctor sur un domaine diffu00e9rent :

```html
<script src="https://votre-domaine.com/bridging.js" 
        data-api-endpoint="https://api.votre-domaine.com/api"></script>
```

## Diagnostics et du00e9pannage

### Vu00e9rification de l'installation

Pour vu00e9rifier que le bridging fonctionne correctement :

1. Ouvrez la console du navigateur (F12)
2. Activez le mode debug sur le script bridging
3. Cliquez sur un bouton Calendly ou un bouton de paiement
4. Vu00e9rifiez que le message "FunnelDoctor Bridging: Handler attachu00e9..." s'affiche

### Problu00e8mes courants

**Les paramu00e8tres UTM ne sont pas ajoutu00e9s aux liens Calendly**
- Vu00e9rifiez que `funnel-doctor.js` est bien chargu00e9 avant `bridging.js`
- Assurez-vous que le su00e9lecteur CSS correspond bien u00e0 vos boutons Calendly

**Les redirections Stripe ne fonctionnent pas**
- Vu00e9rifiez que l'attribut `data-price-id` est correctement renseignu00e9
- Assurez-vous que votre clu00e9 API Stripe est valide

**Les webhooks ne reu00e7oivent pas les donnu00e9es**
- Vu00e9rifiez les URL des webhooks dans Stripe et Calendly
- Consultez les logs du serveur pour du00e9tecter d'u00e9ventuelles erreurs
