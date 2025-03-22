/**
 * FunnelDoctor Bridging Script
 * Version 1.0.0
 * 
 * Ce script permet d'associer les visitor_id aux leads lors des conversions
 * via Calendly et Stripe. Il doit u00eatre inclus APRES le script funnel-doctor.js
 * et uniquement sur les pages contenant des boutons de conversion (RDV/paiement).
 */
(function() {
  // Configuration par du00e9faut
  let config = {
    apiEndpoint: 'http://localhost:3001/api',
    selectors: {
      calendlyButtons: 'a[href*="calendly.com"], .calendly-button, [data-url*="calendly.com"]',
      paymentButtons: '.payment-button, .stripe-checkout, [data-stripe-checkout]'
    },
    debug: false
  };
  
  // Version du script
  const VERSION = '1.0.0';
  
  // Initialisation du script
  function initialize() {
    // Vu00e9rifier que le script principal est chargu00e9
    if (typeof window.FunnelDoctor === 'undefined') {
      console.error('FunnelDoctor Bridging: Le script principal funnel-doctor.js doit u00eatre chargu00e9 en premier.');
      return;
    }
    
    // Customisation via data-attributes
    initializeFromAttributes();
    
    // Attacher les u00e9vu00e9nements aux boutons existants
    attachToCalendlyButtons();
    attachToPaymentButtons();
    
    // Observer les mutations du DOM pour les nouveaux boutons
    setupMutationObserver();
    
    // Log d'initialisation
    if (config.debug) {
      console.log('FunnelDoctor Bridging: Script initialisu00e9', { version: VERSION, config });
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
  
  // API publique
  window.FunnelDoctorBridging = {
    version: VERSION,
    createStripeCheckout,
    
    // Mu00e9thode pour initialiser manuellement (si DOMContentLoaded est du00e9ju00e0 passu00e9)
    init: function(customConfig = {}) {
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
  };
  
  // Initialiser au chargement du DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
