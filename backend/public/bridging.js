/**
 * FunnelDoctor - Script de bridging
 * 
 * Ce script est chargu00e9 apru00e8s funnel-doctor.js et a pour ru00f4le de:
 * 1. Injecter le visitor_id dans les liens Calendly
 * 2. Modifier les bouttons de paiement Stripe pour inclure le visitor_id
 * 3. Assurer le suivi des conversions entre les diffu00e9rentes u00e9tapes du funnel
 */

(function() {
  // S'assurer que FunnelDoctor est chargu00e9
  if (typeof window.FunnelDoctor === 'undefined') {
    console.error('FunnelDoctor Bridging: FunnelDoctor n\'est pas chargu00e9. Assurez-vous de charger funnel-doctor.js avant bridging.js');
    return;
  }
  
  // Obtenir le visitor_id actuel
  const visitorId = window.FunnelDoctor.getVisitorId();
  console.debug('FunnelDoctor Bridging: visitor_id = ' + visitorId);
  
  /**
   * Modification des liens Calendly pour inclure le visitor_id
   * Nous utilisons utm_source=visitor_id et utm_medium=[visitor_id] pour 
   * transmettre l'identifiant u00e0 Calendly
   */
  function injectVisitorIdIntoCalendlyLinks() {
    // Su00e9lecteur pour les liens Calendly (boutons ou liens avec calendly.com dans l'URL)
    const calendlySelector = 'a[href*="calendly.com"], button[data-url*="calendly.com"]';
    
    // Fonction pour modifier une URL Calendly
    function modifyCalendlyUrl(url) {
      try {
        const urlObj = new URL(url);
        
        // Ajouter ou remplacer les paramu00e8tres UTM
        urlObj.searchParams.set('utm_source', 'visitor_id');
        urlObj.searchParams.set('utm_medium', visitorId);
        
        // Paramu00e8tre personnalisu00e9 en plus (au cas ou00f9 Calendly ne transmet pas les UTM)
        urlObj.searchParams.set('fd_tlid', visitorId);
        
        return urlObj.toString();
      } catch (e) {
        console.error('FunnelDoctor Bridging: Erreur lors de la modification de l\'URL Calendly', e);
        return url;
      }
    }
    
    // Modifier tous les liens Calendly existants
    document.querySelectorAll(calendlySelector).forEach(element => {
      const url = element.href || element.getAttribute('data-url');
      if (url) {
        const modifiedUrl = modifyCalendlyUrl(url);
        
        if (element.tagName === 'A') {
          element.href = modifiedUrl;
        } else {
          element.setAttribute('data-url', modifiedUrl);
        }
        
        console.debug('FunnelDoctor Bridging: Lien Calendly modifiu00e9', element, modifiedUrl);
      }
    });
    
    // Observer le DOM pour modifier les liens Calendly ajoutu00e9s dynamiquement
    const observer = new MutationObserver(mutations => {
      let needsUpdate = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && (node.matches?.(calendlySelector) || node.querySelector?.(calendlySelector))) {
              needsUpdate = true;
            }
          });
        } else if (mutation.type === 'attributes' && mutation.target.matches?.(calendlySelector)) {
          needsUpdate = true;
        }
      });
      
      if (needsUpdate) {
        injectVisitorIdIntoCalendlyLinks();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'data-url']
    });
  }
  
  /**
   * Modification des boutons Stripe pour inclure le visitor_id dans les mu00e9tadonnu00e9es
   */
  function injectVisitorIdIntoStripeCheckout() {
    // Vu00e9rifier si Stripe est chargu00e9
    if (typeof window.Stripe === 'undefined') {
      console.debug('FunnelDoctor Bridging: Stripe n\'est pas encore chargu00e9');
      
      // Si Stripe n'est pas encore chargu00e9, attendre qu'il le soit
      const originalStripe = window.Stripe;
      Object.defineProperty(window, 'Stripe', {
        configurable: true,
        get: function() { return originalStripe; },
        set: function(newStripe) {
          originalStripe = newStripe;
          monkeyPatchStripe();
          return newStripe;
        }
      });
      
      return;
    }
    
    monkeyPatchStripe();
    
    // Patch de la fonction Stripe pour ajouter le visitor_id dans les metadata
    function monkeyPatchStripe() {
      const originalStripe = window.Stripe;
      
      window.Stripe = function() {
        const stripe = originalStripe.apply(this, arguments);
        
        // Patch de la mu00e9thode redirectToCheckout
        const originalRedirectToCheckout = stripe.redirectToCheckout;
        stripe.redirectToCheckout = function(options) {
          // Ajouter les metadonnu00e9es visitor_id
          if (!options.clientReferenceId) {
            options.clientReferenceId = visitorId;
          }
          
          if (!options.metadata) {
            options.metadata = {};
          }
          
          options.metadata.visitor_id = visitorId;
          
          console.debug('FunnelDoctor Bridging: Stripe metadata injectu00e9es', options);
          
          return originalRedirectToCheckout.call(this, options);
        };
        
        return stripe;
      };
    }
    
    // Patch pour Stripe Elements si utilisu00e9
    if (window.Stripe && window.Stripe.elements) {
      const originalCreatePaymentMethod = window.Stripe.prototype.createPaymentMethod;
      window.Stripe.prototype.createPaymentMethod = function() {
        const args = Array.from(arguments);
        
        if (args.length > 1 && typeof args[1] === 'object') {
          if (!args[1].metadata) args[1].metadata = {};
          args[1].metadata.visitor_id = visitorId;
        }
        
        return originalCreatePaymentMethod.apply(this, args);
      };
      
      const originalConfirmCardPayment = window.Stripe.prototype.confirmCardPayment;
      window.Stripe.prototype.confirmCardPayment = function() {
        const args = Array.from(arguments);
        
        if (args.length > 1 && typeof args[1] === 'object') {
          if (!args[1].payment_method_data) args[1].payment_method_data = {};
          if (!args[1].payment_method_data.metadata) args[1].payment_method_data.metadata = {};
          args[1].payment_method_data.metadata.visitor_id = visitorId;
        }
        
        return originalConfirmCardPayment.apply(this, args);
      };
    }
  }
  
  // Fonction principale d'initialisation
  function init() {
    console.debug('FunnelDoctor Bridging: Initialisation');
    injectVisitorIdIntoCalendlyLinks();
    injectVisitorIdIntoStripeCheckout();
    
    // Suivre l'u00e9vu00e9nement d'initialisation du bridging
    window.FunnelDoctor.trackEvent('bridging_initialized', {
      visitor_id: visitorId
    });
  }
  
  // Initialiser le bridging lors du chargement complet
  if (document.readyState === 'complete') {
    setTimeout(init, 100); // Du00e9lai court pour s'assurer que tous les scripts sont chargu00e9s
  } else {
    window.addEventListener('load', function() {
      setTimeout(init, 100);
    });
  }
})();
