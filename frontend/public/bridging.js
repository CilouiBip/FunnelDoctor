/**
 * FunnelDoctor Bridging Script
 * Version 1.0.0
 * 
 * Ce script permet d'associer les visitor_id aux leads lors des conversions
 * via Calendly et Stripe. Il doit u00eatre inclus APRES le script funnel-doctor.js
 * et uniquement sur les pages contenant des boutons de conversion (RDV/paiement).
 */

// Configuration par défaut
const VERSION = '1.0.0';

let config = {
  apiEndpoint: 'http://localhost:3001/api',
  selectors: {
    calendlyButtons: 'a[href*="calendly.com"], .calendly-button, [data-url*="calendly.com"]',
    paymentButtons: '.payment-button, .stripe-checkout, [data-stripe-checkout]'
  },
  debug: false
};
  
  // Initialisation du script
  function initialize() {
    // Vérifier que le script principal est chargé (sauf en environnement de test)
    if (typeof window.FunnelDoctor === 'undefined' && !(typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test')) {
      console.error('FunnelDoctor Bridging: Le script principal funnel-doctor.js doit être chargé en premier.');
      return;
    }
    
    // Customisation via data-attributes
    initializeFromAttributes();
    
    // Attacher les événements aux boutons existants
    attachToCalendlyButtons();
    attachToPaymentButtons();
    
    // Attacher l'écouteur pour les formulaires AC/CK
    setupFormListener();
    
    // Attacher l'écouteur pour les événements Calendly
    setupCalendlyListener();
    
    // Configurer le pré-remplissage des liens Calendly
    setupCalendlyPrefill();
    
    // Observer les mutations du DOM pour les nouveaux boutons
    setupMutationObserver();
    
    // Log d'initialisation
    if (config.debug) {
      console.log('FunnelDoctor Bridging: Script initialisé', { version: VERSION, config });
    }
  }
  
  // Ru00e9cupu00e9ration du visitor_id depuis localStorage ou via le loader
  function getVisitorId() {
    // Essayer d'utiliser l'API du script principal si disponible
    if (window.FunnelDoctor && typeof window.FunnelDoctor.getVisitorId === 'function') {
      return window.FunnelDoctor.getVisitorId();
    }
    
    // Fallback: ru00e9cupu00e9rer directement depuis localStorage
    return localStorage.getItem('fd_visitor_id') || null;
  }
  
  // Ru00e9cupu00e9ration des UTM paramu00e8tres stocku00e9s
  function getStoredUTMParams() {
    // Essayer d'utiliser l'API du script principal si disponible
    if (window.FunnelDoctor && typeof window.FunnelDoctor.getUTMParams === 'function') {
      return window.FunnelDoctor.getUTMParams();
    }
    
    // Fallback: traitement manuel
    const storedData = localStorage.getItem('fd_utm_data');
    if (!storedData) return {};
    
    try {
      const utmData = JSON.parse(storedData);
      if (utmData.expires && utmData.expires > Date.now()) {
        return utmData.params || {};
      }
      return {};
    } catch (e) {
      console.error('FunnelDoctor Bridging: Erreur lors de la ru00e9cupu00e9ration des UTM', e);
      return {};
    }
  }
  
  // Initialisation u00e0 partir des attributs data-
  function initializeFromAttributes() {
    const script = document.querySelector('script[src*="bridging.js"]');
    if (!script) return;
    
    // Endpoint API personnalisu00e9
    const apiEndpoint = script.getAttribute('data-api-endpoint');
    if (apiEndpoint) {
      config.apiEndpoint = apiEndpoint;
    }
    
    // Mode debug
    const debug = script.getAttribute('data-debug');
    if (debug === 'true') {
      config.debug = true;
    }
    
    // Su00e9lecteurs personnalisu00e9s
    const calendlySelectors = script.getAttribute('data-calendly-selectors');
    if (calendlySelectors) {
      config.selectors.calendlyButtons = calendlySelectors;
    }
    
    const paymentSelectors = script.getAttribute('data-payment-selectors');
    if (paymentSelectors) {
      config.selectors.paymentButtons = paymentSelectors;
    }
  }
  
  // Attacher les u00e9vu00e9nements aux boutons Calendly
  function attachToCalendlyButtons() {
    const buttons = document.querySelectorAll(config.selectors.calendlyButtons);
    if (config.debug) {
      console.log(`FunnelDoctor Bridging: ${buttons.length} boutons Calendly du00e9tectu00e9s`);  
    }
    
    buttons.forEach(button => {
      // u00c9viter d'attacher plusieurs fois le mu00eame u00e9vu00e9nement
      if (button.hasAttribute('data-fd-bridging-attached')) return;
      
      button.setAttribute('data-fd-bridging-attached', 'true');
      button.addEventListener('click', handleCalendlyClick);
      
      // Pru00e9-traitement de l'URL (pour les liens directs)
      preprocessCalendlyLink(button);
      
      if (config.debug) {
        console.log('FunnelDoctor Bridging: Handler attachu00e9 u00e0 un bouton Calendly', button);
      }
    });
  }
  
  // Pru00e9-traitement des liens Calendly
  function preprocessCalendlyLink(button) {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    
    // Traiter seulement les liens (<a>) avec href
    if (button.tagName.toLowerCase() === 'a' && button.hasAttribute('href')) {
      const href = button.getAttribute('href');
      if (href && href.includes('calendly.com')) {
        try {
          const url = new URL(href);
          url.searchParams.set('utm_source', 'visitor_id');
          url.searchParams.set('utm_medium', visitorId);
          button.setAttribute('href', url.toString());
          
          if (config.debug) {
            console.log('FunnelDoctor Bridging: URL Calendly mise u00e0 jour avec visitor_id', {
              original: href,
              updated: url.toString(),
              visitorId
            });
          }
        } catch (err) {
          console.error('FunnelDoctor Bridging: Erreur lors de la mise u00e0 jour de l\'URL Calendly', err);
        }
      }
    }
    
    // Traiter les data-url (pour les intu00e9grations Calendly)
    if (button.hasAttribute('data-url')) {
      const dataUrl = button.getAttribute('data-url');
      if (dataUrl && dataUrl.includes('calendly.com')) {
        try {
          const url = new URL(dataUrl);
          url.searchParams.set('utm_source', 'visitor_id');
          url.searchParams.set('utm_medium', visitorId);
          button.setAttribute('data-url', url.toString());
          
          if (config.debug) {
            console.log('FunnelDoctor Bridging: data-url Calendly mise u00e0 jour avec visitor_id', {
              original: dataUrl,
              updated: url.toString(),
              visitorId
            });
          }
        } catch (err) {
          console.error('FunnelDoctor Bridging: Erreur lors de la mise u00e0 jour du data-url Calendly', err);
        }
      }
    }
  }
  
  // Gestion du clic sur un bouton Calendly
  function handleCalendlyClick(e) {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    
    const button = e.currentTarget;
    
    // Capturer l'u00e9vu00e9nement en analytics
    if (window.FunnelDoctor && typeof window.FunnelDoctor.track === 'function') {
      window.FunnelDoctor.track('RDV', {
        action: 'calendly_click',
        visitor_id: visitorId,
        element_id: button.id || null,
        element_class: button.className || null,
        element_text: button.innerText || null
      });
    }
    
    // Si c'est un lien, on a du00e9ju00e0 mis u00e0 jour l'URL au moment de l'attachement
    // Pour les widgets Calendly, l'intu00e9gration est plus complexe car les paramu00e8tres
    // sont gu00e9ru00e9s par le widget lui-mu00eame
    
    // Vu00e9rifier si Calendly est chargu00e9
    if (typeof Calendly !== 'undefined') {
      // Tenter d'injecter les paramu00e8tres UTM dans la configuration Calendly
      try {
        if (Calendly.initInlineWidgets) {
          // Stocker temporairement les UTM que Calendly utilise dans son widget
          sessionStorage.setItem('fd_utm_source', 'visitor_id');
          sessionStorage.setItem('fd_utm_medium', visitorId);
          
          if (config.debug) {
            console.log('FunnelDoctor Bridging: Paramu00e8tres Calendly pru00e9paru00e9s', {
              utm_source: 'visitor_id',
              utm_medium: visitorId
            });
          }
        }
      } catch (err) {
        console.error('FunnelDoctor Bridging: Erreur lors de l\'injection des paramu00e8tres Calendly', err);
      }
    }
  }
  
  // Attacher les u00e9vu00e9nements aux boutons de paiement
  function attachToPaymentButtons() {
    const buttons = document.querySelectorAll(config.selectors.paymentButtons);
    if (config.debug) {
      console.log(`FunnelDoctor Bridging: ${buttons.length} boutons de paiement du00e9tectu00e9s`);  
    }
    
    buttons.forEach(button => {
      // u00c9viter d'attacher plusieurs fois le mu00eame u00e9vu00e9nement
      if (button.hasAttribute('data-fd-bridging-attached')) return;
      
      button.setAttribute('data-fd-bridging-attached', 'true');
      button.addEventListener('click', handlePaymentClick);
      
      if (config.debug) {
        console.log('FunnelDoctor Bridging: Handler attachu00e9 u00e0 un bouton de paiement', button);
      }
    });
  }
  
  // Gestion du clic sur un bouton de paiement
  function handlePaymentClick(e) {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    
    const button = e.currentTarget;
    
    // Capturer l'u00e9vu00e9nement en analytics
    if (window.FunnelDoctor && typeof window.FunnelDoctor.track === 'function') {
      window.FunnelDoctor.track('PAYMENT', {
        action: 'payment_button_click',
        visitor_id: visitorId,
        element_id: button.id || null,
        element_class: button.className || null,
        element_text: button.innerText || null
      });
    }
    
    // Vu00e9rifier les attributs de configuration du bouton
    const priceId = button.getAttribute('data-price-id');
    const successUrl = button.getAttribute('data-success-url') || window.location.href;
    const cancelUrl = button.getAttribute('data-cancel-url') || window.location.href;
    
    // Si le bouton contient toutes les informations nu00e9cessaires, cru00e9er directement la session Stripe
    if (priceId) {
      e.preventDefault(); // Empu00eacher le comportement par du00e9faut si on gu00e8re nous-mu00eames
      
      createStripeCheckout({
        priceId,
        successUrl,
        cancelUrl,
        metadata: {
          visitor_id: visitorId,
          page_url: window.location.href,
          ...getStoredUTMParams()
        }
      });
    }
  }
  
  // Cru00e9ation d'une session de paiement Stripe
  function createStripeCheckout(options = {}) {
    const visitorId = getVisitorId();
    if (!visitorId) {
      console.error('FunnelDoctor Bridging: Aucun visitor_id disponible pour le paiement');
      return Promise.reject(new Error('Aucun visitor_id disponible'));
    }
    
    if (!options.priceId) {
      console.error('FunnelDoctor Bridging: priceId requis pour cru00e9er une session Stripe');
      return Promise.reject(new Error('priceId requis'));
    }
    
    const payload = {
      priceId: options.priceId,
      successUrl: options.successUrl || window.location.href,
      cancelUrl: options.cancelUrl || window.location.href,
      metadata: {
        visitor_id: visitorId,
        ...options.metadata
      }
    };
    
    if (config.debug) {
      console.log('FunnelDoctor Bridging: Cru00e9ation d\'une session Stripe', payload);
    }
    
    // Appel API pour cru00e9er la session
    return fetch(`${config.apiEndpoint}/payments/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}: ${response.statusText}`);
      }
      return response.json();
    })
    .then(data => {
      if (config.debug) {
        console.log('FunnelDoctor Bridging: Session Stripe cru00e9u00e9e', data);
      }
      
      if (data.url) {
        window.location.href = data.url;
      }
      
      return data;
    })
    .catch(error => {
      console.error('FunnelDoctor Bridging: Erreur lors de la cru00e9ation de la session Stripe', error);
      throw error;
    });
  }
  
  // Observer les mutations du DOM pour attacher les handlers aux nouveaux boutons
  function setupMutationObserver() {
    // Vu00e9rifier que MutationObserver est supportu00e9
    if (!window.MutationObserver) return;
    
    const observer = new MutationObserver(mutations => {
      let needsCalendlyUpdate = false;
      let needsPaymentUpdate = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            // Vu00e9rifier les u00e9lu00e9ments ajoutu00e9s
            if (node.nodeType === 1) { // ELEMENT_NODE
              if (node.matches && (
                  node.matches(config.selectors.calendlyButtons) ||
                  node.querySelector(config.selectors.calendlyButtons)
                )) {
                needsCalendlyUpdate = true;
              }
              
              if (node.matches && (
                  node.matches(config.selectors.paymentButtons) ||
                  node.querySelector(config.selectors.paymentButtons)
                )) {
                needsPaymentUpdate = true;
              }
            }
          });
        }
      });
      
      // N'attacher que les handlers nu00e9cessaires
      if (needsCalendlyUpdate) attachToCalendlyButtons();
      if (needsPaymentUpdate) attachToPaymentButtons();
    });
    
    // Observer le document entier
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    if (config.debug) {
      console.log('FunnelDoctor Bridging: MutationObserver configuru00e9');
    }
  }
  
  // Configuration et gestion des formulaires ActiveCampaign/ConvertKit
  function setupFormListener() {
    // Écouter tous les événements de soumission de formulaire au niveau du document
    document.addEventListener('submit', function(event) {
      // Vérifier si la cible est un formulaire
      if (!(event.target instanceof HTMLFormElement)) return;
      
      const form = event.target;
      
      // Identifier si c'est un formulaire ActiveCampaign (amélioré)
      const isACForm = 
        // Classes communes
        form.classList.contains('_form') || 
        form.classList.contains('_form_') ||
        // URLs spécifiques 
        form.action?.includes('activehosted') || 
        form.action?.includes('activecampaign') ||
        form.action?.includes('_show.php') ||
        form.action?.includes('_f.php') ||
        // Attributs spécifiques
        form.hasAttribute('data-ac-form-id') ||
        form.hasAttribute('data-aid');
      
      // Identifier si c'est un formulaire ConvertKit (amélioré)
      const isCKForm = 
        // Classes communes
        form.classList.contains('formkit-form') || 
        form.classList.contains('seva-form') ||
        // URLs spécifiques 
        form.action?.includes('convertkit') ||
        // Attributs spécifiques
        form.getAttribute('data-sv-form') !== null ||
        form.hasAttribute('data-format') ||
        form.hasAttribute('data-uid') ||
        form.hasAttribute('data-element') && form.getAttribute('data-element') === 'embedded-form' ||
        !!form.querySelector('[data-component="form"]');
      
      // Continuer seulement si c'est un formulaire AC ou CK
      if (!isACForm && !isCKForm) return;
      
      // Trouver le champ email dans le formulaire (amélioré - par ordre de fiabilité)
      let emailInput = null;
      
      // 1. Type email (très fiable)
      emailInput = form.querySelector('input[type="email"]');
      
      // 2. Name exact "email" (très fiable) 
      if (!emailInput) {
        emailInput = form.querySelector('input[name="email"]');
      }
      
      // 3. Autocomplete="email" (bonne pratique)
      if (!emailInput) {
        emailInput = form.querySelector('input[autocomplete="email"]');
      }
      
      // 4. Patterns spécifiques à AC/CK
      if (!emailInput) {
        emailInput = form.querySelector('input[name="email_address"]');
      }
      
      // 5. Recherche par inclusion dans name/id (moins fiable mais utile en fallback)
      if (!emailInput) {
        const inputs = form.querySelectorAll('input');
        for (const input of inputs) {
          const name = input.name?.toLowerCase() || '';
          const id = input.id?.toLowerCase() || '';
          
          if (name.includes('email') || id.includes('email')) {
            emailInput = input;
            break;
          }
        }
      }
      
      // Vérifier qu'on a bien trouvé un champ email avec une valeur
      if (!emailInput || !emailInput.value) {
        if (config.debug) {
          console.warn('FunnelDoctor Bridging: Formulaire AC/CK soumis sans champ email identifiable', form);
        }
        return;
      }
      
      const email = emailInput.value.trim();
      const visitorId = getVisitorId();
      
      // Vérifier que l'email et le visitor_id sont disponibles
      if (!email || !visitorId) {
        if (config.debug) {
          console.warn('FunnelDoctor Bridging: Formulaire AC/CK soumis sans email ou visitor_id', { 
            hasEmail: !!email, 
            hasVisitorId: !!visitorId 
          });
        }
        return;
      }
      
      // Construire les données pour l'association
      const data = {
        email: email,
        visitor_id: visitorId,
        source_action: 'optin_ac_ck_submit',
        metadata: {
          form_id: form.id || '',
          form_action: form.action || '',
          form_provider: isACForm ? 'activecampaign' : 'convertkit',
          page_url: window.location.href,
          ...getStoredUTMParams()
        }
      };
      
      // Envoyer les données avec sendBeacon (asynchrone, ne bloque pas la soumission)
      const sent = navigator.sendBeacon(`${config.apiEndpoint}/bridge/associate`, JSON.stringify(data));
      
      if (config.debug) {
        console.log('FunnelDoctor Bridging: Données de formulaire envoyées', {
          success: sent,
          data,
          form: form
        });
      }
      
      // NE PAS faire preventDefault() - laisser le formulaire se soumettre normalement
    });
    
    if (config.debug) {
      console.log('FunnelDoctor Bridging: Écouteur de formulaires AC/CK configuré');
    }
  }
  
  // Gestion des événements Calendly via postMessage
  function setupCalendlyListener() {
    // Écouter les messages provenant des iframes Calendly
    window.addEventListener('message', function(event) {
      // Vérifier si le message provient de Calendly
      // Note: Calendly utilise plusieurs domaines (calendly.com, calendly.io, etc.)
      const isCalendlyOrigin = event.origin?.includes('calendly.com') || 
                             event.origin?.includes('calendly.io');
      
      // Vérifier si c'est un événement Calendly
      const isCalendlyEvent = event.data?.event && 
                            typeof event.data.event === 'string' && 
                            event.data.event.startsWith('calendly.');
      
      // Si ce n'est pas un événement Calendly, ignorer
      if (!isCalendlyEvent) return;
      
      // On s'intéresse spécifiquement à l'événement event_scheduled
      if (event.data.event === 'calendly.event_scheduled') {
        if (config.debug) {
          console.log('FunnelDoctor Bridging: Événement Calendly détecté', event.data);
        }
        
        // Récupérer le visitor_id
        const visitorId = getVisitorId();
        if (!visitorId) {
          if (config.debug) {
            console.warn('FunnelDoctor Bridging: Aucun visitor_id disponible pour l\'événement Calendly');
          }
          return;
        }
        
        // Extraire les données du payload
        const payload = event.data.payload || {};
        
        // Construire les données pour l'association
        // Nous n'attendons plus l'email ici, ce sera géré par le backend via webhook
        const data = {
          visitor_id: visitorId,
          source_action: 'calendly_trigger', // Indiquer que c'est juste un déclencheur
          metadata: {
            invitee_uuid: payload.invitee?.uuid,         // Pour liaison future par l'UUID de l'invité
            event_uuid: payload.event?.uuid,             // Pour liaison future par l'UUID de l'événement
            event_type_uuid: payload.event_type?.uuid,   // Informations additionnelles pour débogage/trace
            event_type_name: payload.event_type?.name,
            scheduling_url: payload.scheduling_url,
            scheduled_at: payload.scheduled_at,
            calendly_url: event.origin,
            page_url: window.location.href,
            ...getStoredUTMParams()
          }
        };
        
        // Envoyer les données avec sendBeacon
        const sent = navigator.sendBeacon(`${config.apiEndpoint}/bridge/associate`, JSON.stringify(data));
        
        if (config.debug) {
          console.log('FunnelDoctor Bridging: Données Calendly envoyées', {
            success: sent,
            data,
            originalPayload: payload
          });
        }
      }
    });
    
    if (config.debug) {
      console.log('FunnelDoctor Bridging: Écouteur d\'événements Calendly configuré');
    }
  }
  
  // Pré-remplissage des liens Calendly avec l'email s'il est connu
  function setupCalendlyPrefill() {
    // Essayer de récupérer un email connu (depuis localStorage ou sessionStorage)
    const knownEmail = localStorage.getItem('fd_known_email') || sessionStorage.getItem('fd_known_email');
    
    // Si aucun email connu, rien à faire
    if (!knownEmail) {
      if (config.debug) {
        console.log('FunnelDoctor Bridging: Pas d\'email connu pour pré-remplir Calendly');
      }
      return;
    }
    
    if (config.debug) {
      console.log(`FunnelDoctor Bridging: Email connu trouvé pour pré-remplir Calendly: ${knownEmail}`);
    }
    
    // 1. Pré-remplir tous les liens Calendly (href avec calendly.com)
    const calendlyLinks = document.querySelectorAll('a[href*="calendly.com"]');
    calendlyLinks.forEach(link => {
      try {
        const url = new URL(link.href);
        // Ajouter ou remplacer le paramètre email
        url.searchParams.set('email', knownEmail);
        link.href = url.toString();
        
        if (config.debug) {
          console.log('FunnelDoctor Bridging: Lien Calendly pré-rempli avec email', link.href);
        }
      } catch (e) {
        console.error('FunnelDoctor Bridging: Erreur lors du pré-remplissage du lien Calendly', e);
      }
    });
    
    // 2. Observer les mutations du DOM pour pré-remplir les nouveaux liens Calendly
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && mutation.addedNodes.length) {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Élément HTML
              // Vérifier si c'est un lien Calendly
              if (node.tagName === 'A' && node.href && node.href.includes('calendly.com')) {
                try {
                  const url = new URL(node.href);
                  url.searchParams.set('email', knownEmail);
                  node.href = url.toString();
                } catch (e) {
                  console.error('FunnelDoctor Bridging: Erreur lors du pré-remplissage d\'un nouveau lien Calendly', e);
                }
              }
              
              // Vérifier les enfants du noeud ajouté
              const childLinks = node.querySelectorAll('a[href*="calendly.com"]');
              childLinks.forEach(link => {
                try {
                  const url = new URL(link.href);
                  url.searchParams.set('email', knownEmail);
                  link.href = url.toString();
                } catch (e) {
                  console.error('FunnelDoctor Bridging: Erreur lors du pré-remplissage d\'un lien Calendly enfant', e);
                }
              });
            }
          });
        }
      });
    });
    
    // Observer le document entier pour les nouveaux liens
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    if (config.debug) {
      console.log('FunnelDoctor Bridging: Pré-remplissage Calendly configuré');
    }
    
    // 3. Hook pour capturer l'email des formulaires et le stocker pour un usage futur par Calendly
    document.addEventListener('submit', function(event) {
      if (!(event.target instanceof HTMLFormElement)) return;
      
      const form = event.target;
      const emailInput = form.querySelector('input[type="email"]') || 
                       form.querySelector('input[name="email"]') ||
                       form.querySelector('input[autocomplete="email"]');
      
      if (emailInput && emailInput.value) {
        const email = emailInput.value.trim();
        if (email) {
          // Stocker l'email pour un usage futur avec les liens Calendly
          localStorage.setItem('fd_known_email', email);
          sessionStorage.setItem('fd_known_email', email);
          
          if (config.debug) {
            console.log(`FunnelDoctor Bridging: Email ${email} capturé et sauvegardé pour Calendly`);
          }
        }
      }
    });
  }
  
// Fonction init pour initialisation manuelle
function init(customConfig = {}) {
  // Fusionner la configuration personnalisu00e9e
  if (customConfig.apiEndpoint) config.apiEndpoint = customConfig.apiEndpoint;
  if (customConfig.debug !== undefined) config.debug = customConfig.debug;
  if (customConfig.selectors) {
    if (customConfig.selectors.calendlyButtons) {
      config.selectors.calendlyButtons = customConfig.selectors.calendlyButtons;
    }
    if (customConfig.selectors.paymentButtons) {
      config.selectors.paymentButtons = customConfig.selectors.paymentButtons;
    }
  }
  
  initialize();
}

// Initialisation automatique pour le navigateur (hors tests)
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  // API publique pour le navigateur
  window.FunnelDoctorBridging = {
    version: VERSION,
    createStripeCheckout,
    init
  };
  
  // Initialiser au chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
}

// Exporter les fonctions pour les tests unitaires et Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Fonctions principales
    initialize,
    setupFormListener,
    setupCalendlyListener,
    setupCalendlyPrefill,
    getVisitorId,
    getStoredUTMParams,
    init,
    // Fonctions utilitaires et accessoires
    config,
    VERSION,
    // Autres fonctions possiblement utiles pour les tests
    handleCalendlyClick,
    attachToCalendlyButtons,
    createStripeCheckout,
    setupMutationObserver,
    initializeFromAttributes
  };
}
