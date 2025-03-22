/**
 * FunnelDoctor - Script de tracking principal
 * 
 * Ce script est chargé sur toutes les landing pages et permet de:
 * 1. Capturer les paramètres UTM
 * 2. Générer un visitor_id unique
 * 3. Suivre les événements de navigation et conversion
 */

(function() {
  // Récupération des attributs depuis la balise script
  function getScriptAttributes() {
    // Valeurs par défaut
    const defaults = {
      siteId: 'default-site',
      utmDays: 30,          // 30 jours par défaut pour les UTMs
      selectors: '',        // Aucun sélecteur spécifique par défaut
      autoCapture: true     // Capture automatique activée par défaut
    };
    
    // Récupération du tag script actuel
    const scriptTag = document.currentScript || 
                     document.querySelector('script[src*="funnel-doctor.js"]');
    
    if (!scriptTag) {
      console.warn('FunnelDoctor: Impossible de récupérer la balise script');
      return defaults;
    }
    
    // Lecture des attributs data-fd-*
    return {
      siteId: scriptTag.getAttribute('data-fd-site') || defaults.siteId,
      utmDays: parseInt(scriptTag.getAttribute('data-fd-utm-days')) || defaults.utmDays,
      selectors: scriptTag.getAttribute('data-fd-selectors') || defaults.selectors,
      autoCapture: scriptTag.getAttribute('data-fd-auto-capture') !== 'false' // true par défaut sauf si explicitement false
    };
  }
  
  // Récupération des attributs
  const config = getScriptAttributes();
  console.debug('FunnelDoctor: Configuration chargée', config);
  
  // Configuration
  const API_ENDPOINT = window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1')
    ? 'http://localhost:3001/api'
    : 'https://funnel.doctor.ngrok.app/api';
  
  // Génération d'un ID unique pour ce visiteur
  function generateVisitorId() {
    // Vérifier si un visitor_id existe déjà dans localStorage
    const existingId = localStorage.getItem('funnel_doctor_visitor_id');
    if (existingId) return existingId;
    
    // Générer un nouvel ID (uuid v4 simplifié)
    const newId = 'fd_' + Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15) + 
                 Date.now().toString(36);
    
    // Sauvegarder l'ID dans localStorage
    localStorage.setItem('funnel_doctor_visitor_id', newId);
    return newId;
  }
  
  // Capture des paramètres UTM de l'URL
  function captureUtmParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = {};
    
    // Date d'expiration des UTMs basée sur la configuration
    const now = new Date();
    const utmExpiry = new Date(now.getTime() + (config.utmDays * 24 * 60 * 60 * 1000));
    const utmExpiryStr = utmExpiry.toISOString();
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
      const value = urlParams.get(param);
      if (value) {
        utmParams[param] = value;
        // Sauvegarder dans localStorage avec date d'expiration
        try {
          localStorage.setItem(`funnel_doctor_${param}`, value);
          localStorage.setItem(`funnel_doctor_${param}_expiry`, utmExpiryStr);
        } catch (e) {
          console.warn('FunnelDoctor: Erreur de stockage UTM', e);
        }
      } else {
        // Récupérer depuis localStorage si disponible et non expiré
        try {
          const storedValue = localStorage.getItem(`funnel_doctor_${param}`);
          const storedExpiry = localStorage.getItem(`funnel_doctor_${param}_expiry`);
          
          if (storedValue && storedExpiry) {
            const expiryDate = new Date(storedExpiry);
            if (expiryDate > now) {
              utmParams[param] = storedValue;
            } else {
              // UTM expiré, nettoyage
              localStorage.removeItem(`funnel_doctor_${param}`);
              localStorage.removeItem(`funnel_doctor_${param}_expiry`);
            }
          }
        } catch (e) {
          console.warn('FunnelDoctor: Erreur de récupération UTM', e);
        }
      }
    });
    
    return utmParams;
  }
  
  // Envoi d'un événement au backend
  function trackEvent(eventName, eventData = {}) {
    const visitorId = generateVisitorId();
    const utmParams = captureUtmParams();
    
    // Structure du payload conforme au DTO backend
    // Seuls visitor_id, event_type, page_url, referrer et user_agent sont placés à la racine
    // Tous les autres champs sont déplacés dans event_data
    const payload = {
      visitor_id: visitorId,
      event_type: eventName,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
      event_data: {
        site_id: config.siteId,
        utm_params: utmParams,
        page_url: window.location.href,  // Déplacé dans event_data
        page_title: document.title,      // Déplacé dans event_data
        timestamp: new Date().toISOString(), // Déplacé dans event_data
        ...eventData                     // Autres données d'événement
      }
    };
    
    // Envoyer les données au backend
    fetch(`${API_ENDPOINT}/touchpoints`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      // Permettre les requêtes cross-origin sans credentials
      mode: 'cors',
      credentials: 'omit'
    })
    .then(response => {
      if (!response.ok) {
        console.error('FunnelDoctor: Erreur lors de l\'envoi de l\'événement', response.status);
      }
      return response.json();
    })
    .then(data => {
      console.debug('FunnelDoctor: Événement envoyé avec succès', eventName, data);
    })
    .catch(error => {
      console.error('FunnelDoctor: Erreur lors de l\'envoi de l\'événement', error);
    });
    
    return visitorId; // Retourner le visitorId pour utilisation externe
  }
  
  // Initialisation - Tracking automatique de la visite de page
  function init() {
    // Tracker la visite de page automatiquement
    trackEvent('page_view');
    
    // Écouter les clics sur les boutons et liens si autoCapture est activé
    if (config.autoCapture) {
      document.addEventListener('click', function(e) {
        // Trouver l'élément cliqué ou son parent qui est un bouton ou lien
        let target = e.target;
        let maxDepth = 3; // Éviter de remonter trop haut dans le DOM
        
        while (maxDepth > 0 && target && !(target.tagName === 'A' || target.tagName === 'BUTTON')) {
          target = target.parentElement;
          maxDepth--;
        }
        
        if (target && (target.tagName === 'A' || target.tagName === 'BUTTON')) {
          // Vérifier si l'élément correspond aux sélecteurs spécifiés (si définis)
          if (config.selectors) {
            let matchesSelector = false;
            // Diviser les sélecteurs par virgule et vérifier chacun
            const selectorsList = config.selectors.split(',').map(s => s.trim()).filter(s => s);
            
            if (selectorsList.length > 0) {
              // Vérifier si l'élément correspond à au moins un des sélecteurs
              matchesSelector = selectorsList.some(selector => {
                try {
                  return target.matches(selector);
                } catch (e) {
                  console.warn(`FunnelDoctor: Sélecteur invalide '${selector}'`, e);
                  return false;
                }
              });
              
              // Si aucun sélecteur ne correspond, ne pas tracker
              if (!matchesSelector) return;
            }
          }
          
          // Données supplémentaires pour l'événement de clic
          const eventData = {
            element_id: target.id || null,
            element_class: target.className || null,
            element_text: target.innerText || null,
            element_tag: target.tagName.toLowerCase(),
            element_href: target.href || null
          };
          
          trackEvent('click', eventData);
        }
      });
    }
    
    // Écouter les soumissions de formulaire si autoCapture est activé
    if (config.autoCapture) {
      document.addEventListener('submit', function(e) {
        const form = e.target;
        
        // Vérifier si le formulaire correspond aux sélecteurs spécifiés (si définis)
        if (config.selectors) {
          let matchesSelector = false;
          const selectorsList = config.selectors.split(',').map(s => s.trim()).filter(s => s);
          
          if (selectorsList.length > 0) {
            matchesSelector = selectorsList.some(selector => {
              try {
                return form.matches(selector);
              } catch (e) {
                console.warn(`FunnelDoctor: Sélecteur de formulaire invalide '${selector}'`, e);
                return false;
              }
            });
            
            if (!matchesSelector) return;
          }
        }
        
        // Données supplémentaires pour l'événement de soumission
        const eventData = {
          form_id: form.id || null,
          form_class: form.className || null,
          form_action: form.action || null,
          form_method: form.method || null
        };
        
        trackEvent('form_submit', eventData);
      });
    }
  }
  
  // Exposer les fonctions publiques
  window.FunnelDoctor = {
    trackEvent: trackEvent,
    getVisitorId: generateVisitorId,
    getUtmParams: captureUtmParams,
    getConfig: () => ({ ...config })  // Exposer la configuration actuelle (copie)
  };
  
  // Initialiser le tracking lors du chargement
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(init, 1);
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
