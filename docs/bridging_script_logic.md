# FunnelDoctor - Logique du Script bridging.js

## Objectif de bridging.js

Le script `bridging.js` joue un rôle critique dans l'écosystème FunnelDoctor en établissant un pont entre le mécanisme de tracking (assuré par `funnel-doctor.js` qui stocke les données dans localStorage) et les outils tiers (iClosed, Calendly, formulaires opt-in). 

Son objectif principal est d'assurer la continuité du tracking en transmettant le `visitorId` et les paramètres UTM lorsqu'un utilisateur passe d'une page à une autre ou interagit avec des outils tiers intégrés à la page.

## Données Manipulées

Le script manipule principalement les données suivantes, stockées dans le localStorage par `funnel-doctor.js` :

| Donnée | Clé dans localStorage | Description |
|--------|---------------------|-------------|
| visitorId | `funnel_doctor_visitor_id` | Identifiant unique du visiteur généré par FunnelDoctor |
| utm_source | `funnel_doctor_utm_source` | Source de la visite (ex: google, facebook) |
| utm_medium | `funnel_doctor_utm_medium` | Medium de la visite (ex: cpc, email) |
| utm_campaign | `funnel_doctor_utm_campaign` | Campagne marketing associée |
| utm_content | `funnel_doctor_utm_content` | Contenu spécifique utilisé comme lien (variante) |
| utm_term | `funnel_doctor_utm_term` | Termes de recherche associés |

## Scénarios Gérés (Logique Hybride)

Le script adopte une approche hybride pour gérer différents scénarios de tunnels marketing :

### Scénario 1 : Embed Direct (iClosed, Calendly)

**Principe :** Trouver les embeds (iframes, div, etc.) directement sur la page et modifier leurs attributs pour y inclure les paramètres de tracking.

**Fonctions concernées :**
- `injectParamsIntoIClosedWidgets()` pour les widgets iClosed
- `injectVisitorIdIntoCalendlyLinks()` pour les widgets Calendly

**Méthode :** 
- Recherche d'éléments via des sélecteurs CSS (`.iclosed-widget`, `iframe[src*="iclosed.io"]`, etc.)
- Modification des attributs `src`, `data-url` ou similaires pour y intégrer les paramètres UTM et le visitorId

**Limitations actuelles :**
- Les sélecteurs CSS actuels pourraient ne pas couvrir tous les cas d'usage ou être trop spécifiques
- Amélioration suggérée : utiliser un attribut `data-fd-embed` pour permettre à l'utilisateur de marquer explicitement les embeds à traiter

### Scénario 2 : Lien vers Page de Booking (`<a>`)

**Principe :** Modifier les liens (balises `<a>`) marqués par l'utilisateur qui mènent vers une page de réservation (Calendly, iClosed, autre)

**Fonction concernée :**
- `modifyBookingLinks()`

**L'attribut `data-fd-booking-link` :**

Cet attribut joue un rôle CRUCIAL dans cette approche : il permet à l'utilisateur d'identifier explicitement les liens qui doivent être enrichis avec les données de tracking.

**Comment l'ajouter en HTML :**
```html
<a href="https://app.iclosed.io/e/nom-utilisateur/event" data-fd-booking-link>Réserver</a>
```

**Méthode :**
1. Lire les données de tracking du localStorage
2. Construire une nouvelle URL avec les paramètres
3. Modifier l'attribut `href` du lien

**Paramètres ajoutés :**
- `fd_visitor_id` : ID unique du visiteur
- `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` : Paramètres UTM

## Flux d'Exécution (init())

L'ordre d'exécution des fonctions dans `init()` est important :

1. `injectVisitorIdIntoCalendlyLinks()` : Traitement des liens/widgets Calendly
2. `injectVisitorIdIntoStripeCheckout()` : Traitement des boutons de paiement Stripe
3. `injectVisitorIdIntoForms()` : Injection dans les formulaires d'opt-in
4. `injectParamsIntoIClosedWidgets()` : Traitement des widgets iClosed
5. `setTimeout(modifyBookingLinks, 1000)` : Traitement des liens de booking avec un délai

Le délai pour `modifyBookingLinks` est délibéré : il permet de s'assurer que le DOM est complètement chargé et que `funnel-doctor.js` a eu le temps de lire les UTMs de l'URL et de mettre à jour le localStorage.

## Exemples de Tunnels

### Exemple 1 : VSL → Lien Booking

1. La page VSL charge les scripts `funnel-doctor.js` et `bridging.js`
2. `funnel-doctor.js` capture les UTMs de l'URL et les stocke dans le localStorage
3. `bridging.js` (via `modifyBookingLinks`) trouve le bouton:
   ```html
   <a href="https://app.iclosed.io/e/nom-utilisateur/event" data-fd-booking-link>Réserver un appel</a>
   ```
4. `bridging.js` modifie le href pour intégrer les paramètres:
   ```
   https://app.iclosed.io/e/nom-utilisateur/event?fd_visitor_id=fd_abc123&utm_source=facebook&utm_medium=cpc&...
   ```
5. L'utilisateur clique sur le lien et arrive sur la page de booking avec tous les paramètres de tracking

### Exemple 2 : Embed Direct

1. La page charge les scripts `funnel-doctor.js` et `bridging.js`
2. `funnel-doctor.js` stocke les UTMs et le visitorId dans le localStorage
3. `bridging.js` (via `injectParamsIntoIClosedWidgets`) trouve le widget:
   ```html
   <iframe src="https://app.iclosed.io/embed/..." class="iclosed-widget"></iframe>
   ```
4. `bridging.js` modifie l'attribut src pour intégrer les paramètres
5. L'iframe se charge avec les paramètres de tracking intégrés

## Débogage

Le script utilise plusieurs préfixes de logs pour faciliter le débogage :

| Préfixe | Composant | Description |
|---------|-----------|-------------|
| `[DEBUG-INIT]` | Initialisation | Logs liés à l'initialisation du script et à l'ordre d'exécution |
| `[DEBUG-BOOKING-LINK]` | Links | Logs liés à la modification des liens de booking |
| `[DEBUG-ICLOSED]` | iClosed | Logs liés à la détection et la modification des widgets iClosed |
| `[FD Bridging]` | Formulaires | Logs liés à l'injection dans les formulaires |

## Limitations & Évolutions Futures

1. **Amélioration des sélecteurs d'embeds :**
   - Introduire un attribut standard `data-fd-embed` pour marquer explicitement les embeds à traiter
   - Ajouter un attribut `data-fd-embed-type="iclosed|calendly|other"` pour différencier les types d'embeds

2. **Gestion plus fine des timings :**
   - Rendre le délai de `setTimeout` configurable via un attribut de script
   - Implémenter un système de retry plus sophistiqué pour les cas où le DOM change dynamiquement

3. **Configuration utilisateur :**
   - Permettre à l'utilisateur de configurer les noms des paramètres à utiliser (ex: `visitor_id` au lieu de `fd_visitor_id`)
   - Offrir des options de personnalisation de l'attribut data pour les liens et embeds

4. **Robustesse :**
   - Ajouter plus de vérifications pour éviter les erreurs JavaScript
   - Améliorer la compatibilité avec les différents frameworks (React, Vue, etc.)
