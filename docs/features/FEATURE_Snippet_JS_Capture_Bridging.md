# Feature Spec: Snippet JS - Capture Bridging (MB-2.x & MB-3.3 JS)

**Objectif :** Modifier le script Javascript `bridging.js` (ou u00e9quivalent chargu00e9 par le snippet FunnelDoctor) pour qu'il du00e9tecte les interactions clu00e9s de l'utilisateur avec les formulaires ActiveCampaign/ConvertKit et les widgets/liens Calendly, capture l'email entru00e9 et le `visitor_id` FunnelDoctor, et envoie ces informations u00e0 l'API backend `/api/bridge/associate` via `navigator.sendBeacon`.

**Critu00e8res d'Acceptation :**

1.  Lorsqu'un formulaire AC/CK identifiu00e9 est soumis sur la page, l'email soumis et le `visitor_id` courant sont envoyu00e9s via `navigator.sendBeacon` u00e0 `/api/bridge/associate` **avant** la soumission ru00e9elle du formulaire. La soumission normale n'est pas bloquu00e9e.
2.  **(Calendly - Objectif Idu00e9al - u00e0 confirmer faisabilitu00e9)** Lorsqu'un utilisateur interagit avec un widget/lien Calendly et soumet le formulaire de ru00e9servation, l'email soumis et le `visitor_id` courant sont envoyu00e9s via `navigator.sendBeacon` u00e0 `/api/bridge/associate` **avant** la redirection vers la page de confirmation Calendly.
3.  Le script gu00e8re correctement la ru00e9cupu00e9ration du `visitor_id` depuis le localStorage (ou cookie).
4.  Le script identifie de maniu00e8re robuste (mais potentiellement basu00e9e sur des heuristiques) les formulaires AC/CK et les interactions Calendly.
5.  Des logs clairs sont pru00e9sents en mode debug (`config.debug`).
6.  Le script n'introduit pas d'erreurs JS bloquantes sur la page hu00f4te.

**Todo List Technique Du00e9taillu00e9e (pour Windsurf) :**

*   **Tu00e2che 1 (AC/CK - Base) :** Implu00e9menter l'u00e9couteur d'u00e9vu00e9nement `submit` sur `document`.
*   **Tu00e2che 2 (AC/CK - Identification) :** Implu00e9menter la logique pour identifier si `event.target` est un formulaire AC ou CK (basu00e9 sur classes, attributs `data-*`, `action` URL).
*   **Tu00e2che 3 (AC/CK - Extraction Donnu00e9es) :** Implu00e9menter la logique pour trouver le champ email dans le formulaire identifiu00e9 et ru00e9cupu00e9rer sa valeur. Ru00e9cupu00e9rer aussi le `visitor_id` FunnelDoctor (via une fonction `getVisitorId()`).
*   **Tu00e2che 4 (AC/CK - Envoi Beacon) :** Si email et `visitor_id` valides, construire l'objet `data` (avec `source_action: 'optin_ac_ck_submit'`) et l'envoyer via `navigator.sendBeacon('/api/bridge/associate', JSON.stringify(data))`. Ajouter des logs debug.
*   **Tu00e2che 5 (AC/CK - Tests Unitaires) :** u00c9crire 1-2 tests unitaires Jest simulant la soumission d'un faux formulaire AC/CK et vu00e9rifiant que `navigator.sendBeacon` est appelu00e9 avec les bonnes donnu00e9es.
*   **Tu00e2che 6 (Calendly - Investigation Capture Email) :** Investiguer la **meilleure mu00e9thode** pour obtenir l'**email** entru00e9 par l'utilisateur lors d'une interaction avec Calendly (embed ou popup).
    *   Est-ce que l'API `postMessage` de Calendly (qu'on a vue) peut u00eatre utilisu00e9e pour *demander* l'email ? (Probablement non).
    *   Peut-on pru00e9-remplir l'email dans l'URL/embed Calendly (via `bridging.js`) si on connau00eet l'email de l'utilisateur *avant* qu'il n'ouvre Calendly ?
    *   Y a-t-il une autre astuce pour ru00e9cupu00e9rer l'email entru00e9 dans l'iframe avant la soumission ?
    *   **Livrable :** Un ru00e9sumu00e9 des possibilitu00e9s techniques pour obtenir l'email avec Calendly.
*   **Tu00e2che 7 (Calendly - u00c9coute u00c9vu00e9nement Booking) :** Implu00e9menter l'u00e9couteur `window.addEventListener('message', ...)` pour du00e9tecter l'u00e9vu00e9nement `calendly.event_scheduled`.
*   **Tu00e2che 8 (Calendly - Envoi Beacon SI Email Connu) :** Dans le handler de `calendly.event_scheduled` :
    *   Ru00e9cupu00e9rer le `visitor_id`.
    *   **SI** on a ru00e9ussi u00e0 obtenir l'email via la mu00e9thode de la Tu00e2che 6 (ex: email pru00e9-rempli et stocku00e9 temporairement), **ALORS** envoyer `navigator.sendBeacon` avec `email`, `visitor_id` et `source_action: 'calendly_event_scheduled'`.
    *   Sinon (si email inconnu), ne **PAS** envoyer le beacon (car inutile sans email pour notre API bridge). Loguer l'u00e9chec de ru00e9cupu00e9ration de l'email en mode debug.
*   **Tu00e2che 9 (Calendly - Tests Unitaires) :** u00c9crire 1-2 tests unitaires Jest simulant la ru00e9ception d'un message `calendly.event_scheduled` et vu00e9rifiant que `navigator.sendBeacon` est (ou n'est pas) appelu00e9 selon la pru00e9sence simulu00e9e de l'email pru00e9-capturu00e9.
*   **Tu00e2che 10 (Intu00e9gration & Nettoyage) :** S'assurer que les fonctions `setupFormListener` (pour AC/CK) et `setupCalendlyListener` sont bien appelu00e9es dans l'initialisation du script `bridging.js`. Nettoyer le code, ajouter des commentaires si nu00e9cessaire.

**Points Ouverts / Risques :**

*   Fiabilitu00e9 de la du00e9tection des formulaires AC/CK.
*   **Faisabilitu00e9 ru00e9elle de la capture de l'email pour Calendly (Tu00e2che 6). C'est le point le plus critique.** Si impossible, le critu00e8re d'acceptation #2 ne sera pas atteint pour Calendly.
*   Gestion des multiples formulaires/widgets sur une mu00eame page.
