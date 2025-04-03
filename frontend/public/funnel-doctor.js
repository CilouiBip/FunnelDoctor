/**
 * FunnelDoctor Tracking Script
 * Version 1.1.0
 * 
 * Ce script permet de suivre les interactions des utilisateurs sur votre site,
 * de capturer et propager les paramètres UTM, et d'envoyer les données à l'API FunnelDoctor.
 */
(function() {
  // Configuration par défaut
  let config = {
    apiEndpoint: 'http://localhost:3001/api/touchpoints',
    utmDays: 30,                           // Durée de rétention des UTM en jours
    selectors: 'a.cta, button.buy-now',    // Sélecteurs pour les liens CTA
    autoCapture: true,                     // Capture automatique des événements
    siteId: ''                             // ID du site (obligatoire)
  };
  
  // Version du script
  const VERSION = '1.1.0';
  
  // Génération ou récupération du visitor_id
  function getVisitorId() {
    let visitorId = localStorage.getItem('fd_visitor_id');
    if (!visitorId) {
      visitorId = generateUUID();
      localStorage.setItem('fd_visitor_id', visitorId);
    }
    return visitorId;
  }
  
  // Génération d'UUID pour visitor_id
  function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  // Extraction des paramètres UTM de l'URL
  function extractUTMParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = {};
    
    ['source', 'medium', 'campaign', 'term', 'content'].forEach(param => {
      const value = urlParams.get(`utm_${param}`);
      if (value) {
        utmParams[`utm_${param}`] = value;
      }
    });
    
    return utmParams;
  }
  
  // Sauvegarde des paramètres UTM dans le localStorage
  function saveUTMParams() {
    const utmParams = extractUTMParams();
    
    // Si des UTM sont présents dans l'URL
    if (Object.keys(utmParams).length > 0) {
      // Stockage des UTM avec timestamp d'expiration
      const utmData = {
        params: utmParams,
        expires: Date.now() + (config.utmDays * 24 * 60 * 60 * 1000) // Expiration en millisecondes
      };
      
      localStorage.setItem('fd_utm_data', JSON.stringify(utmData));
      console.log('FunnelDoctor: UTM parameters saved', utmParams);
    }
  }
  
  // Récupération des UTM stockés (s'ils ne sont pas expirés)
  function getStoredUTMParams() {
    const storedData = localStorage.getItem('fd_utm_data');
    
    if (!storedData) return null;
    
    try {
      const utmData = JSON.parse(storedData);
      
      // Vérifier si les données sont expirées
      if (utmData.expires && utmData.expires > Date.now()) {
        return utmData.params;
      } else {
        // Supprimer les données expirées
        localStorage.removeItem('fd_utm_data');
        return null;
      }
    } catch (e) {
      console.error('FunnelDoctor: Error parsing stored UTM data', e);
      localStorage.removeItem('fd_utm_data');
      return null;
    }
  }
  
  /**
   * Writes FunnelDoctor visitor ID and UTM parameters to first-party cookies.
   * @param {string} visitorId - The unique visitor identifier.
   * @param {object} utmParams - An object containing UTM parameters.
   */
  function writeFunnelDoctorCookies(visitorId, utmParams) {
    // Calculate expiration date (1 year from now)
    const expirationDate = new Date();
    expirationDate.setFullYear(expirationDate.getFullYear() + 1);
    const expires = expirationDate.toUTCString();
    
    // Write visitor ID cookie
    document.cookie = `_fd_vid=${visitorId}; path=/; expires=${expires}; SameSite=Lax; Secure`;
    
    // List of UTM parameters to process
    const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    
    // Write UTM cookies if they exist in the provided object
    utmKeys.forEach(key => {
      if (utmParams && utmParams[key] && utmParams[key].trim() !== '') {
        document.cookie = `_fd_${key}=${encodeURIComponent(utmParams[key])}; path=/; expires=${expires}; SameSite=Lax; Secure`;
      }
    });
  }
  
  // Recherche d'un éventuel code court dans l'URL pour le lier au tracking
  function findTrackingLinkId() {
    // Si l'URL contient un paramètre fd_tlid (funnel doctor tracking link id)
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('fd_tlid');
  }
  
  // Envoi d'un événement au backend
  function trackEvent(eventType, eventData = {}) {
    const visitorId = getVisitorId();
    const urlUtmParams = extractUTMParams();
    const storedUtmParams = getStoredUTMParams();
    const trackingLinkId = findTrackingLinkId();
    
    // Privilégier les UTM de l'URL, puis ceux stockés
    const utmParams = Object.keys(urlUtmParams).length > 0 ? urlUtmParams : (storedUtmParams || {});
    
    const payload = {
      visitor_id: visitorId,
      event_type: eventType,
      event_data: { ...eventData, ...utmParams, site_id: config.siteId },
      page_url: window.location.href,
      referrer: document.referrer
    };
    
    // Ajouter le tracking_link_id s'il est disponible
    if (trackingLinkId) {
      payload.tracking_link_id = trackingLinkId;
    }
    
    console.log('FunnelDoctor tracking event:', eventType, payload);
    
    fetch(config.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`Tracking failed with status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('FunnelDoctor tracking successful:', data);
    })
    .catch(error => {
      console.error('FunnelDoctor tracking error:', error);
    });
  }
  
  // Fonction pour identifier un visiteur comme lead
  function identifyLead(leadData = {}) {
    const visitorId = getVisitorId();
    
    // Enregistrer l'événement de conversion
    trackEvent('lead_identified', {
      ...leadData,
      conversion_timestamp: new Date().toISOString()
    });
    
    console.log('Visiteur identifié comme lead:', leadData);
    
    // Stocker l'identifiant du lead en local
    if (leadData.lead_id) {
      localStorage.setItem('fd_lead_id', leadData.lead_id);
    }
    
    return { visitor_id: visitorId, ...leadData };
  }

  // Fonction pour suivre une soumission de formulaire
  function trackFormSubmission(formId, formData = {}) {
    trackEvent('form_submit', {
      form_id: formId,
      form_data: formData, 
      submission_timestamp: new Date().toISOString()
    });
  }
  
  // Fonction pour ajouter les UTM à une URL
  function addUTMToUrl(url) {
    const storedUTMs = getStoredUTMParams();
    
    if (!storedUTMs) return url;
    
    try {
      const urlObj = new URL(url);
      const urlParams = new URLSearchParams(urlObj.search);
      
      // Ne pas écraser les UTM déjà présents dans l'URL
      for (const [key, value] of Object.entries(storedUTMs)) {
        if (!urlParams.has(key)) {
          urlParams.set(key, value);
        }
      }
      
      urlObj.search = urlParams.toString();
      return urlObj.toString();
    } catch (e) {
      console.warn('FunnelDoctor: Invalid URL for UTM propagation', url);
      return url;
    }
  }
  
  // Fonction pour réécrire les liens CTA avec les UTM stockés et ajouter des écouteurs d'événements
  function rewriteCTALinks() {
    const storedUTMs = getStoredUTMParams();
    
    // Toujours exécuter pour ajouter les écouteurs d'événements, même sans UTM
    const links = document.querySelectorAll(config.selectors);
    
    links.forEach(link => {
      // Ajouter l'écouteur d'événements pour le clic si pas déjà traité
      if (!link.hasAttribute('data-fd-click-listener')) {
        link.addEventListener('click', function(e) {
          const linkData = {
            element_type: link.tagName.toLowerCase(),
            element_id: link.id || null,
            element_class: link.className || null,
            element_text: link.textContent?.trim() || null,
            href: link.href || null,
            timestamp: new Date().toISOString()
          };
          
          // Envoyer l'événement de clic
          trackEvent('click', linkData);
        });
        
        // Marquer comme traité pour l'écouteur d'événements
        link.setAttribute('data-fd-click-listener', 'true');
      }
      
      // Seulement pour les éléments <a> avec un href et s'il y a des UTMs à ajouter
      if (link.tagName === 'A' && link.href && storedUTMs) {
        const originalUrl = link.href;
        const newUrl = addUTMToUrl(originalUrl);
        
        // Ne pas modifier si l'URL n'a pas changé
        if (newUrl !== originalUrl) {
          link.href = newUrl;
          
          // Marquer le lien comme traité pour éviter de le retraiter
          link.setAttribute('data-fd-processed', 'true');
          
          // Événement de debug
          console.log('FunnelDoctor: CTA link rewritten', {
            original: originalUrl,
            new: newUrl
          });
        }
      }
    });
  }
  
  // Initialisation du script à partir des attributs data-
  function initializeFromAttributes() {
    const script = document.currentScript || (() => {
      const scripts = document.getElementsByTagName('script');
      return scripts[scripts.length - 1];
    })();
    
    if (script) {
      const siteId = script.getAttribute('data-fd-site');
      const utmDays = script.getAttribute('data-fd-utm-days');
      const selectors = script.getAttribute('data-fd-selectors');
      const autoCapture = script.getAttribute('data-fd-auto-capture');
      const apiEndpoint = script.getAttribute('data-fd-api-endpoint');
      
      // Mise à jour de la configuration
      if (siteId) config.siteId = siteId;
      if (utmDays) config.utmDays = parseInt(utmDays, 10) || 30;
      if (selectors) config.selectors = selectors;
      if (autoCapture !== null) config.autoCapture = autoCapture !== 'false';
      if (apiEndpoint) config.apiEndpoint = apiEndpoint;
    }
    
    // Vérifier qu'un siteId a été fourni
    if (!config.siteId) {
      console.error('FunnelDoctor: No site ID provided. Tracking will not work correctly.');
    }
  }
  
  // Fonction pour observer les mutations du DOM et réécrire les nouveaux liens
  function setupMutationObserver() {
    if (!window.MutationObserver) return;
    
    const observer = new MutationObserver(mutations => {
      let shouldRewriteLinks = false;
      
      mutations.forEach(mutation => {
        // Si des nœuds ont été ajoutés
        if (mutation.addedNodes.length > 0) {
          shouldRewriteLinks = true;
        }
      });
      
      if (shouldRewriteLinks) {
        rewriteCTALinks();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
  
  // API publique
  window.FunnelDoctor = {
    track: trackEvent,
    identify: identifyLead,
    trackForm: trackFormSubmission,
    version: VERSION,
    getVisitorId: getVisitorId,
    addUTMToUrl: addUTMToUrl
  };
  
  // Initialisation
  function initialize() {
    // Charger la configuration depuis les attributs data-
    initializeFromAttributes();
    
    // Get visitor ID and current URL UTM parameters
    const visitorId = getVisitorId();
    const currentUtmParams = extractUTMParams();

    // Write cookies early
    writeFunnelDoctorCookies(visitorId, currentUtmParams);
    
    // Sauvegarder les UTM s'ils sont présents dans l'URL
    saveUTMParams();
    
    // Réécrire les liens CTA avec les UTM stockés
    rewriteCTALinks();
    
    // Observer les changements du DOM pour réécrire les nouveaux liens
    setupMutationObserver();
    
    // Tracker automatiquement le chargement de page si autoCapture est activé
    if (config.autoCapture) {
      trackEvent('page_view', {
        title: document.title,
        path: window.location.pathname,
        site_id: config.siteId
      });
    }
    
    console.log(`FunnelDoctor Tracking Script v${VERSION} initialized`, {
      siteId: config.siteId,
      utmDays: config.utmDays,
      autoCapture: config.autoCapture
    });
  }
  
  // Initialiser le script
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }
})();
