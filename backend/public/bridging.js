console.log('--- Bridging.js v1.3 Loaded (Booking Link Logic Added) ---');

/**
 * FunnelDoctor - Script de bridging
 * 
 * Ce script est chargé après funnel-doctor.js et a pour rôle de:
 * 1. Injecter le visitor_id dans les liens Calendly
 * 2. Modifier les bouttons de paiement Stripe pour inclure le visitor_id
 * 3. Assurer le suivi des conversions entre les différentes étapes du funnel
 * 4. Injecter le visitor_id et les UTMs dans les widgets iClosed
 * 
 * V2.5: Ajout d'une solution pour iClosed avec debug
 */

(function() {
  // Configuration et options
  const scriptTag = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  
  // Mode debug (peut être activé via l'attribut data-debug="true" sur la balise script)
  const debugMode = scriptTag.getAttribute('data-debug') === 'true';
  
  // Fonction de log avancée qui respecte le mode debug
  function fdLog(level, ...args) {
    if (debugMode || level === 'error') {
      const prefix = `FunnelDoctor Bridging [${level.toUpperCase()}]:`;
      if (level === 'error') {
        console.error(prefix, ...args);
      } else if (level === 'warn') {
        console.warn(prefix, ...args);
      } else {
        console.log(prefix, ...args);
      }
    }
  }

  // S'assurer que FunnelDoctor est chargé
  if (typeof window.FunnelDoctor === 'undefined') {
    fdLog('error', 'FunnelDoctor n\'est pas chargé. Assurez-vous de charger funnel-doctor.js avant bridging.js');
    return;
  }
  
  // Obtenir le visitor_id actuel
  const visitorId = window.FunnelDoctor.getVisitorId();
  fdLog('info', 'Visitor ID détecté:', visitorId);
  
  // Lecture des UTMs depuis le localStorage
  const utmParams = {};
  try {
    // Vérification debug du localStorage complet
    fdLog('info', '[DEBUG-UTM] Contenu du localStorage:', Object.keys(localStorage));
    
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(param => {
      const localStorageKey = `funnel_doctor_${param}`;
      const value = localStorage.getItem(localStorageKey);
      if (value) {
        utmParams[param] = value;
        fdLog('info', `[DEBUG-UTM] ${param} trouvé dans localStorage:`, value);
      } else {
        fdLog('warn', `[DEBUG-UTM] ${param} NON trouvé dans localStorage`);
      }
    });
    
    fdLog('info', '[DEBUG-UTM] Paramètres UTM complets:', utmParams);
  } catch (e) {
    fdLog('error', '[DEBUG-UTM] Erreur lors de la lecture des UTMs:', e);
  }
  
  // Détection de la plateforme
  const isConvertKit = window.location.hostname.includes('kit.com');
  if (isConvertKit) {
    fdLog('info', 'Site ConvertKit détecté, activation du mode spécifique ConvertKit');
  }
  
  // Variable pour suivre si la fonction a été exécutée avec succès au moins une fois
  let calendarLinksProcessed = false;
  let globalLinksFound = 0;
  let globalLinksModified = 0;
  
  /**
   * Modification des liens Calendly pour inclure le visitor_id
   * Version améliorée et définitive qui fonctionne avec ConvertKit
   */
  function injectVisitorIdIntoCalendlyLinks() {
    fdLog('info', 'Début de la recherche et modification des liens Calendly');
    
    // Sélecteurs étendus pour les liens Calendly (inclut aussi les cas spéciaux pour ConvertKit)
    const calendlySelectors = [
      // Sélecteurs standards
      'a[href*="calendly.com"]',
      'button[data-url*="calendly.com"]',
      'a[onclick*="calendly.com"]',
      'button[onclick*="calendly.com"]',
      'div[data-url*="calendly.com"]',
      '.calendly-link',
      '[data-calendly-url]',
      // Sélecteurs spécifiques à ConvertKit
      '.ck-button[href*="calendly.com"]',
      '.ck-button a[href*="calendly.com"]',
      '.convertkit-button[href*="calendly.com"]',
      '.convertkit-button a[href*="calendly.com"]',
      // Sélecteurs textuels pour ConvertKit
      'a.ck-button',
      '.ck-button a',
      '.ck-button button',
      // Boutons et liens plus génériques
      'a.button[href*="calendly"]',
      'button.button[onclick*="calendly"]'
    ];
    
    // Fonction pour modifier une URL Calendly
    function modifyCalendlyUrl(url) {
      try {
        fdLog('info', 'Modification de l\'URL Calendly:', url);
        const urlObj = new URL(url);
        
        // Stocker l'utm_content actuel pour le débogage
        const originalUtmContent = urlObj.searchParams.get('utm_content');
        fdLog('info', 'utm_content actuel:', originalUtmContent);
        
        // Ajouter ou remplacer le paramètre UTM content pour le visitorId
        urlObj.searchParams.set('utm_content', visitorId);
        
        // Paramètre personnalisé en plus (au cas où Calendly ne transmet pas les UTM)
        urlObj.searchParams.set('fd_tlid', visitorId);
        
        // Ajouter aussi utm_source et utm_medium comme backup
        if (!urlObj.searchParams.has('utm_source')) {
          urlObj.searchParams.set('utm_source', 'funneldoctor');
        }
        if (!urlObj.searchParams.has('utm_medium')) {
          urlObj.searchParams.set('utm_medium', 'bridging');
        }
        
        const modifiedUrl = urlObj.toString();
        fdLog('info', 'URL modifiée:', modifiedUrl);
        return modifiedUrl;
      } catch (e) {
        fdLog('error', 'Erreur lors de la modification de l\'URL Calendly', e, '\nURL problématique:', url);
        return url;
      }
    }
    
    // Collecte tous les liens potentiels Calendly
    let links = [];
    let linksModified = 0;
    
    // 1. Parcourir chaque sélecteur et chercher des éléments correspondants
    calendlySelectors.forEach((selector, index) => {
      try {
        const elements = document.querySelectorAll(selector);
        fdLog('info', `Sélecteur "${selector}": ${elements.length} éléments trouvés`);
        
        elements.forEach(element => {
          // Éviter les doublons
          if (!links.includes(element)) {
            links.push(element);
          }
        });
      } catch (e) {
        // Ignorer les erreurs de sélecteur invalide
        fdLog('warn', `Erreur avec le sélecteur "${selector}":`, e.message);
      }
    });

    // 2. Spécifique à ConvertKit: recherche textuelle de liens Calendly
    if (isConvertKit) {
      // Recherche de boutons par texte qui pourrait être lié à Calendly
      const buttonTextPatterns = [
        'calendly', 'rdv', 'rendez', 'meeting', 'schedule', 'book', 'réservation', 'appel'
      ];
      
      const buttons = document.querySelectorAll('a.button, button, .ck-button, [role="button"]');
      buttons.forEach(button => {
        // Éviter les doublons
        if (!links.includes(button)) {
          const buttonText = button.innerText ? button.innerText.toLowerCase() : '';
          const hasRelevantText = buttonTextPatterns.some(pattern => buttonText.includes(pattern));
          
          if (hasRelevantText) {
            fdLog('info', 'Bouton potentiel Calendly détecté par texte:', buttonText);
            links.push(button);
          }
        }
      });
    }
    
    fdLog('info', `Total des éléments potentiels Calendly: ${links.length}`);
    
    // 3. Traiter chaque lien potentiel
    links.forEach((element, index) => {
      try {
        // Extraire l'URL de différentes façons possibles
        let url = null;
        
        // 3.1 Extraire depuis href (cas standard)
        if (element.href && element.href.includes('calendly.com')) {
          url = element.href;
        }
        // 3.2 Extraire depuis data-url
        else if (element.getAttribute('data-url') && element.getAttribute('data-url').includes('calendly.com')) {
          url = element.getAttribute('data-url');
        }
        // 3.3 Extraire depuis data-calendly-url
        else if (element.getAttribute('data-calendly-url')) {
          url = element.getAttribute('data-calendly-url');
        }
        // 3.4 Extraire depuis onclick
        else if (element.getAttribute('onclick')) {
          const onclickAttr = element.getAttribute('onclick');
          const match = onclickAttr.match(/https:\/\/calendly\.com\S+['"\)]?/g);
          if (match && match.length > 0) {
            url = match[0].replace(/['"\)]$/, '');
          }
        }
        // 3.5 Cas spécial ConvertKit: chercher dans les enfants
        else if (isConvertKit && element.tagName === 'DIV') {
          const anchors = element.querySelectorAll('a');
          anchors.forEach(anchor => {
            if (!url && anchor.href && anchor.href.includes('calendly.com')) {
              url = anchor.href;
            }
          });
        }
        
        // Si une URL valide est trouvée, la modifier
        if (url) {
          globalLinksFound++;
          fdLog('info', `URL Calendly trouvée dans l'élément #${index + 1}:`, url);
          
          // Modifier l'URL
          const modifiedUrl = modifyCalendlyUrl(url);
          
          // Appliquer l'URL modifiée
          let modified = false;
          
          // 3.6 Appliquer selon le type d'élément
          if (element.tagName === 'A' || element.href) {
            element.href = modifiedUrl;
            modified = true;
          }
          else if (element.getAttribute('data-url')) {
            element.setAttribute('data-url', modifiedUrl);
            modified = true;
          }
          else if (element.getAttribute('data-calendly-url')) {
            element.setAttribute('data-calendly-url', modifiedUrl);
            modified = true;
          }
          else if (element.getAttribute('onclick') && element.getAttribute('onclick').includes(url)) {
            const newOnclick = element.getAttribute('onclick').replace(url, modifiedUrl);
            element.setAttribute('onclick', newOnclick);
            modified = true;
          }
          // 3.7 Cas spécial ConvertKit: modifier les enfants
          else if (isConvertKit && element.tagName === 'DIV') {
            const anchors = element.querySelectorAll('a');
            anchors.forEach(anchor => {
              if (anchor.href && anchor.href.includes('calendly.com')) {
                anchor.href = modifiedUrl;
                modified = true;
              }
            });
          }
          
          if (modified) {
            linksModified++;
            globalLinksModified++;
            fdLog('info', `Élément #${index + 1} modifié avec succès`);
          } else {
            fdLog('warn', `Impossible de modifier l'élément #${index + 1}`);
          }
        }
      } catch (e) {
        fdLog('error', `Erreur lors du traitement de l'élément #${index + 1}:`, e);
      }
    });
    
    // 4. Solution définitive pour ConvertKit: Intercepter les clics
    if (isConvertKit) {
      // Si on n'a pas trouvé ou modifié de liens, utiliser l'approche agressive
      if (linksModified === 0) {
        fdLog('info', 'Activation de l\'interception des clics pour ConvertKit');
        
        // Solutions spécifiques pour ConvertKit
        
        // 4.1 Interception globale des clics
        if (!window.fdConvertKitInterceptorSet) {
          window.fdConvertKitInterceptorSet = true;
          
          document.addEventListener('click', function(e) {
            setTimeout(function() {
              // Vérifier s'il y a de nouveaux liens Calendly après un clic
              const result = injectVisitorIdIntoCalendlyLinks();
              if (result) {
                fdLog('info', 'Liens Calendly modifiés après interception de clic');
              }
            }, 100);
          }, true);
          
          fdLog('info', 'Interception globale des clics activée');
        }
        
        // 4.2 Patch de window.open pour intercepter les ouvertures de Calendly
        if (!window.fdWindowOpenPatched) {
          window.fdWindowOpenPatched = true;
          
          const originalWindowOpen = window.open;
          window.open = function(url, ...args) {
            if (url && typeof url === 'string' && url.includes('calendly.com')) {
              fdLog('info', 'Interception de window.open pour Calendly:', url);
              try {
                const modifiedUrl = modifyCalendlyUrl(url);
                fdLog('info', 'URL modifiée dans window.open:', modifiedUrl);
                return originalWindowOpen.call(this, modifiedUrl, ...args);
              } catch (e) {
                fdLog('error', 'Erreur lors de la modification de l\'URL dans window.open:', e);
                return originalWindowOpen.call(this, url, ...args);
              }
            }
            return originalWindowOpen.call(this, url, ...args);
          };
          
          fdLog('info', 'Patch de window.open activé');
        }
      }
    }
    
    // 5. Observer le DOM pour les modifications futures
    if (!window.fdCalendlyObserverSet) {
      window.fdCalendlyObserverSet = true;
      
      const observer = new MutationObserver(function(mutations) {
        let needsCalendlyUpdate = false;
        let needsFormUpdate = false;
        
        mutations.forEach(function(mutation) {
          if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
            for (let i = 0; i < mutation.addedNodes.length; i++) {
              const node = mutation.addedNodes[i];
              if (node.nodeType === 1) { // Élément
                // Vérifier si l'élément ou ses enfants contiennent "calendly"
                if ((node.outerHTML && node.outerHTML.toLowerCase().includes('calendly')) ||
                    (node.href && node.href.toLowerCase().includes('calendly'))) {
                  needsCalendlyUpdate = true;
                }
                
                // Vérifier si un formulaire a été ajouté
                if (node.tagName === 'FORM' || (node.querySelectorAll && node.querySelectorAll('form').length > 0)) {
                  needsFormUpdate = true;
                }
              }
            }
          } else if (mutation.type === 'attributes') {
            const target = mutation.target;
            if ((mutation.attributeName === 'href' && target.href && target.href.includes('calendly')) ||
                (mutation.attributeName === 'onclick' && target.getAttribute('onclick') && target.getAttribute('onclick').includes('calendly')) ||
                (mutation.attributeName === 'data-url' && target.getAttribute('data-url') && target.getAttribute('data-url').includes('calendly'))) {
              needsCalendlyUpdate = true;
            }
          }
        });
        
        // Mettre u00e0 jour les liens Calendly si nu00e9cessaire
        if (needsCalendlyUpdate) {
          fdLog('info', 'Modifications du DOM détectées, mise à jour des liens Calendly');
          injectVisitorIdIntoCalendlyLinks();
        }
        
        // Injecter le visitorId dans les formulaires si des nouveaux ont u00e9tu00e9 ajoutu00e9s
        if (needsFormUpdate) {
          fdLog('info', 'Nouveaux formulaires détectés, injection du visitorId...');
          injectVisitorIdIntoForms();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['href', 'onclick', 'data-url', 'data-calendly-url']
      });
      
      fdLog('info', 'Observateur DOM configuré pour surveiller les changements');
    }
    
    // 6. Définir le statut de traitement
    if (linksModified > 0) {
      calendarLinksProcessed = true;
    }
    
    fdLog('info', `Traitement des liens Calendly: ${links.length} trouvés, ${linksModified} modifiés`);
    return linksModified > 0;
  }
  
  /**
   * Modification des boutons Stripe pour inclure le visitor_id dans les métadonnées
   */
  function injectVisitorIdIntoStripeCheckout() {
    // Vérifier si Stripe est chargé
    if (typeof window.Stripe === 'undefined') {
      fdLog('info', 'Stripe n\'est pas encore chargé');
      
      // Si Stripe n'est pas encore chargé, attendre qu'il le soit
      let originalStripe = window.Stripe;
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
        
        // Patch de la méthode redirectToCheckout
        const originalRedirectToCheckout = stripe.redirectToCheckout;
        stripe.redirectToCheckout = function(options) {
          // Ajouter les metadonnées visitor_id
          if (!options.clientReferenceId) {
            options.clientReferenceId = visitorId;
          }
          
          if (!options.metadata) {
            options.metadata = {};
          }
          
          options.metadata.visitor_id = visitorId;
          
          fdLog('info', 'Stripe metadata injectées', options);
          
          return originalRedirectToCheckout.call(this, options);
        };
        
        return stripe;
      };
    }
    
    // Patch pour Stripe Elements si utilisé
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
  
  /**
   * Envoie une association email-visitor_id au backend
   * @param {string} email - Email de l'utilisateur
   * @param {string} visitorId - ID du visiteur
   * @param {string} sourceAction - Action source (ex: calendly_event_scheduled)
   * @param {Object} eventData - Données supplémentaires
   */
  function sendBridgeAssociation(email, visitorId, sourceAction = 'calendly_trigger', eventData = {}) {
    fdLog('info', `Envoi d'association bridge: ${email} - ${visitorId}`);
    // LOGS INTENSIFS: Toujours afficher indépendamment du mode debug
    console.log('FD-DEBUG: FONCTION sendBridgeAssociation APPELÉE');
    console.log('FD-DEBUG: Paramètres complets:', JSON.stringify({ email, visitorId, sourceAction, eventData }, null, 2));
    
    // Former l'URL complète avec l'origine actuelle pour éviter les problèmes CORS
    // Logique pour déterminer l'endpoint complet
    let baseUrl = '';
    let originUrl = window.location.origin;
    console.log('FD-DEBUG: Origine de la page:', originUrl);
    
    // Si on est sur ConvertKit, l'endpoint doit être absolu vers le backend
    if (originUrl.includes('kit.com')) {
      baseUrl = 'https://funnel.doctor.ngrok.app';
      console.log('FD-DEBUG: Site ConvertKit détecté, utilisation de l\'URL absolue vers le backend');
    }
    
    // Utiliser sendBeacon si disponible pour garantir l'envoi même si la page se ferme
    const endpoint = `${baseUrl}/api/bridge/associate`;
    console.log('FD-DEBUG: Endpoint ciblé:', endpoint);
    
    const data = {
      email: email,
      visitor_id: visitorId,
      source_action: sourceAction,
      event_data: eventData
    };
    
    console.log('FD-DEBUG: Payload à envoyer:', JSON.stringify(data, null, 2));
    
    // Tenter d'utiliser sendBeacon (plus fiable pour les événements de fin de session)
    if (navigator.sendBeacon) {
      console.log('FD-DEBUG: navigator.sendBeacon est disponible, tentative d\'envoi via sendBeacon');
      try {
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        console.log('FD-DEBUG: Blob créé pour sendBeacon');
        console.log('FD-DEBUG: Tentative sendBeacon vers URL:', endpoint, 'avec payload:', JSON.stringify(data));
        const success = navigator.sendBeacon(endpoint, blob);
        console.log('FD-DEBUG: Résultat de sendBeacon:', success ? 'SUCCÈS' : 'ÉCHEC');
        fdLog('info', `Association envoyée via sendBeacon: ${success ? 'succès' : 'échec'}`);
        
        // Si sendBeacon échoue, fallback sur fetch
        if (!success) {
          console.log('FD-DEBUG: sendBeacon a échoué, fallback sur fetch');
          sendViaFetch();
        } else {
          console.log('FD-DEBUG: sendBeacon réussi, données envoyées avec succès');
        }
      } catch (error) {
        console.error('FD-DEBUG: ERREUR avec sendBeacon:', error);
        console.log('FD-DEBUG: Fallback sur fetch après erreur sendBeacon');
        sendViaFetch();
      }
    } else {
      // Fallback sur fetch si sendBeacon n'est pas disponible
      console.log('FD-DEBUG: navigator.sendBeacon non disponible, utilisation de fetch');
      sendViaFetch();
    }
    
    function sendViaFetch() {
      console.log('FD-DEBUG: Tentative d\'envoi via fetch à:', endpoint);
      console.log('FD-DEBUG: Options fetch complètes:', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true,
        mode: 'cors',
        credentials: 'include'
      });
      console.log('FD-DEBUG: Payload fetch exact:', JSON.stringify(data));
      
      fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data),
        // keepalive permet d'envoyer la requête même si la page se ferme
        keepalive: true,
        // Ajouter le mode CORS explicite
        mode: 'cors',
        credentials: 'include'
      })
      .then(response => {
        console.log('FD-DEBUG: Réponse fetch reçue, status:', response.status);
        console.log('FD-DEBUG: Headers réponse:', JSON.stringify([...response.headers.entries()]));
        
        if (!response.ok) {
          console.error('FD-DEBUG: ERREUR HTTP', response.status);
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        return response.json();
      })
      .then(result => {
        console.log('FD-DEBUG: Association bridge RÉUSSIE, résultat:', result);
        fdLog('info', 'Association bridge réussie:', result);
      })
      .catch(error => {
        console.error('FD-DEBUG: ERREUR lors de l\'envoi fetch:', error);
        fdLog('error', 'Erreur lors de l\'envoi de l\'association bridge:', error);
      });
    }
  }
  
  // Fonction pour injecter automatiquement le visitorId dans les formulaires d'opt-in
  function injectVisitorIdIntoForms() {
    if (debugMode) {
      console.debug('[FD Bridging] Fonction injectVisitorIdIntoForms appelée.');
    }
    const visitorId = localStorage.getItem('funnel_doctor_visitor_id'); // Clé de stockage du visitorId

    if (!visitorId) {
      if (debugMode) {
        console.debug('[FD Bridging] Pas de visitorId disponible dans localStorage.');
      }
      return;
    }
    if (debugMode) {
      console.debug('[FD Bridging] Visitor ID lu:', visitorId);
    }

    const forms = document.querySelectorAll('form');
    if (debugMode) {
      console.debug('[FD Bridging] Formulaires trouvés sur la page:', forms.length);
    }

    forms.forEach(form => {
      if (debugMode) {
        console.debug('[FD Bridging] Traitement du formulaire:', form.id || 'sans-id');
      }
      // Heuristique pour trouver un champ email visible
      const emailField = form.querySelector('input[type="email"]:not([type="hidden"]), input[name*="email"]:not([type="hidden"]), input[id*="email"]:not([type="hidden"]), input[placeholder*="email"]:not([type="hidden"]), input[class*="email"]:not([type="hidden"]), .email-field:not([type="hidden"]), [data-email]:not([type="hidden"]), [data-field-type="email"]:not([type="hidden"])');
      if (debugMode) {
        console.debug('[FD Bridging] Champ Email trouvé dans ce formulaire ?', !!emailField);
      }

      if (emailField) {
        // Vérifier si le champ visitorId existe déjà
        const existingField = form.querySelector('input[type="hidden"][name="visitorId"]'); // Recherche plus spécifique
        if (debugMode) {
          console.debug('[FD Bridging] Champ visitorId caché existant trouvé ?', !!existingField);
        }

        if (!existingField) {
          if (debugMode) {
            console.debug('[FD Bridging] Ajout du champ caché au formulaire');
          }
          const hiddenInput = document.createElement('input');
          hiddenInput.type = 'hidden';
          hiddenInput.name = 'visitorId'; // Correspond au DTO backend
          hiddenInput.value = visitorId;
          hiddenInput.setAttribute('data-fd-added', 'true'); // Marqueur optionnel
          form.appendChild(hiddenInput);
        } else if (debugMode) {
          console.debug('[FD Bridging] Champ visitorId déjà présent, pas d\'ajout');
        }
      } else if (debugMode) {
        console.debug('[FD Bridging] Pas de champ email trouvé dans ce formulaire, injection ignorée');
      }
    });
    if (debugMode) {
      console.debug('[FD Bridging] Fin du traitement des formulaires');
    }
  }

  // Fonction principale d'initialisation avec réessais
  function init() {
    fdLog('info', 'Initialisation');
    
    // Tenter de modifier les liens Calendly
    const calendlySuccess = injectVisitorIdIntoCalendlyLinks();
    
    // Initialiser Stripe
    injectVisitorIdIntoStripeCheckout();
    
    // Injecter le visitorId dans les formulaires d'opt-in
    fdLog('info', 'Injection du visitorId dans les formulaires...');
    injectVisitorIdIntoForms();
    
    // Injecter le visitor_id et les UTMs dans les widgets iClosed
    fdLog('info', 'Recherche et modification des widgets iClosed...');
    console.log('[DEBUG-INIT] Tentative d\'appel de injectParamsIntoIClosedWidgets...');
    const iClosedSuccess = injectParamsIntoIClosedWidgets();
    
    // Programmer l'appel à modifyBookingLinks avec un délai
    const linkModificationDelay = 1000; // ms
    console.log(`[DEBUG-INIT] Appel de modifyBookingLinks programmé dans ${linkModificationDelay}ms.`);
    setTimeout(() => {
      console.log('[DEBUG-INIT] Exécution de modifyBookingLinks...');
      const bookingLinksSuccess = modifyBookingLinks();
      
      // Mise à jour de l'événement après modification des liens de booking
      if (bookingLinksSuccess) {
        window.FunnelDoctor.trackEvent('booking_links_modified', {
          visitor_id: visitorId,
          success: bookingLinksSuccess
        });
      }
    }, linkModificationDelay);
    
    // Suivre l'événement d'initialisation du bridging
    window.FunnelDoctor.trackEvent('bridging_initialized', {
      visitor_id: visitorId,
      calendly_links_modified: calendlySuccess,
      iclosed_widgets_modified: iClosedSuccess
    });
    
    // Si aucun lien Calendly n'a été traité avec succès, programmer des réessais
    if (!calendlySuccess) {
      // Configuration des réessais
      const retryIntervals = [500, 1000, 2000, 3000, 5000, 7000, 10000]; // Délais en ms entre les tentatives
      let retryCount = 0;
      
      function retryProcessingCalendlyLinks() {
        if (retryCount >= retryIntervals.length || calendarLinksProcessed) {
          fdLog('info', `Fin des tentatives de traitement des liens Calendly. Succès: ${calendarLinksProcessed}`);
          return;
        }
        
        fdLog('info', `Tentative #${retryCount + 1} de traitement des liens Calendly...`);
        const success = injectVisitorIdIntoCalendlyLinks();
        
        if (success) {
          fdLog('info', 'Liens Calendly traités avec succès lors de la tentative #' + (retryCount + 1));
          calendarLinksProcessed = true;
        } else {
          retryCount++;
          if (retryCount < retryIntervals.length) {
            fdLog('info', `Programmation de la tentative #${retryCount + 1} dans ${retryIntervals[retryCount]}ms`);
            setTimeout(retryProcessingCalendlyLinks, retryIntervals[retryCount]);
          } else {
            fdLog('warn', 'Toutes les tentatives de traitement des liens Calendly ont échoué');
          }
        }
      }
      
      // Démarrer les réessais
      setTimeout(retryProcessingCalendlyLinks, retryIntervals[0]);
    }
  }
  
  /**
   * Fonction pour injecter le visitor_id et les UTMs dans les widgets iClosed
   */
  function injectParamsIntoIClosedWidgets() {
    console.log('[DEBUG-ICLOSED] Fonction injectParamsIntoIClosedWidgets démarrée.');
    fdLog('info', '[DEBUG-ICLOSED] Recherche de widgets iClosed');
    
    // Sélecteurs pour trouver des éléments iClosed
    const iClosedSelectors = [
      // Sélecteurs spécifiques au widget iClosed
      '.iclosed-widget',
      'div[data-url*="iclosed.io"]',
      'iframe[src*="iclosed.io"]',
      // Autres éléments possibles
      'div[class*="iclosed"]',
      '[data-iclosed]'
    ];
    
    // Logs pour vérifier directement les sélecteurs
    iClosedSelectors.forEach(selector => {
      const elementsFound = document.querySelectorAll(selector);
      console.log(`[DEBUG-ICLOSED] Sélecteur "${selector}": ${elementsFound.length} éléments trouvés.`);
    });

    let iClosedElements = [];
    let elementsModified = 0;
    let totalElementsFound = 0;
    
    // Recherche d'éléments iClosed via les sélecteurs
    iClosedSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        fdLog('info', `[DEBUG-ICLOSED] Sélecteur "${selector}": ${elements.length} éléments trouvés`);
        
        elements.forEach(element => {
          if (!iClosedElements.includes(element)) {
            iClosedElements.push(element);
          }
        });
      } catch (e) {
        fdLog('warn', `[DEBUG-ICLOSED] Erreur avec le sélecteur "${selector}":`, e.message);
      }
    });
    
    fdLog('info', `[DEBUG-ICLOSED] Total des éléments iClosed trouvés: ${iClosedElements.length}`);
    
    // Modification des éléments iClosed
    iClosedElements.forEach((element, index) => {
      try {
        fdLog('info', `[DEBUG-ICLOSED] Traitement de l'élément iClosed #${index+1}:`, element);
        
        // 1. Chercher un attribut URL comme data-url
        let dataUrl = element.getAttribute('data-url');
        if (dataUrl && dataUrl.includes('iclosed.io')) {
          fdLog('info', `[DEBUG-ICLOSED] URL trouvée dans data-url: ${dataUrl}`);
          
          try {
            // Modifier l'URL pour inclure le visitor_id
            const urlObj = new URL(dataUrl);
            
            // Ajouter le visitor_id via utm_content (approche principale)
            urlObj.searchParams.set('utm_content', visitorId);
            fdLog('info', `[DEBUG-ICLOSED] Ajout de visitor_id dans utm_content: ${visitorId}`);
            
            // Ajouter les autres UTMs s'ils existent
            Object.keys(utmParams).forEach(param => {
              if (param !== 'utm_content') { // utm_content est déjà défini
                urlObj.searchParams.set(param, utmParams[param]);
                fdLog('info', `[DEBUG-ICLOSED] Ajout de ${param}: ${utmParams[param]}`);
              }
            });
            
            // Mettre à jour l'attribut data-url
            const newUrl = urlObj.toString();
            element.setAttribute('data-url', newUrl);
            fdLog('info', `[DEBUG-ICLOSED] URL modifiée: ${newUrl}`);
            elementsModified++;
          } catch (e) {
            fdLog('error', `[DEBUG-ICLOSED] Erreur lors de la modification de l'URL:`, e, '\nURL problématique:', dataUrl);
          }
        }
        
        // 2. Si c'est un iframe, modifier l'attribut src
        if (element.tagName === 'IFRAME' && element.src && element.src.includes('iclosed.io')) {
          fdLog('info', `[DEBUG-ICLOSED] iframe trouvé avec src: ${element.src}`);
          
          try {
            const urlObj = new URL(element.src);
            urlObj.searchParams.set('utm_content', visitorId);
            
            // Ajouter les autres UTMs
            Object.keys(utmParams).forEach(param => {
              if (param !== 'utm_content') {
                urlObj.searchParams.set(param, utmParams[param]);
              }
            });
            
            const newSrc = urlObj.toString();
            element.src = newSrc;
            fdLog('info', `[DEBUG-ICLOSED] src d'iframe modifié: ${newSrc}`);
            elementsModified++;
          } catch (e) {
            fdLog('error', `[DEBUG-ICLOSED] Erreur lors de la modification du src d'iframe:`, e);
          }
        }
        
        // 3. Vérifier si l'élément a des attributs data-* spécifiques à iClosed
        const dataAttrs = {};
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          if (attr.name.startsWith('data-') && !attr.name.includes('url')) {
            dataAttrs[attr.name] = attr.value;
          }
        }
        
        if (Object.keys(dataAttrs).length > 0) {
          fdLog('info', `[DEBUG-ICLOSED] Attributs data-* trouvés:`, dataAttrs);
        }
        
        // 4. Vérifier si des cookies first_utm_* existent et les créer si nécessaire
        if (visitorId) {
          // Définition d'un cookie pour iClosed
          document.cookie = `first_utm_content=${visitorId}; path=/`;
          fdLog('info', `[DEBUG-ICLOSED] Cookie first_utm_content défini avec visitorId: ${visitorId}`);
          
          // Ajouter les autres UTMs dans les cookies
          Object.keys(utmParams).forEach(param => {
            const cookieName = `first_${param}`;
            document.cookie = `${cookieName}=${utmParams[param]}; path=/`;
            fdLog('info', `[DEBUG-ICLOSED] Cookie ${cookieName} défini: ${utmParams[param]}`);
          });
        }
        
      } catch (e) {
        fdLog('error', `[DEBUG-ICLOSED] Erreur lors du traitement de l'élément iClosed #${index+1}:`, e);
      }
    });
    
    // Log des résultats
    fdLog('info', `[DEBUG-ICLOSED] Résultats: ${elementsModified} éléments iClosed modifiés sur ${iClosedElements.length} trouvés`);
    
    // Si aucun élément n'a été trouvé, chercher le script widget.js
    if (iClosedElements.length === 0) {
      const iClosedScript = document.querySelector('script[src*="iclosed.io/assets/widget.js"]');
      if (iClosedScript) {
        fdLog('info', `[DEBUG-ICLOSED] Script widget.js trouvé, mais aucun widget. Vérifiez si le widget est injecté dynamiquement.`);
      } else {
        fdLog('info', `[DEBUG-ICLOSED] Aucun script iClosed détecté sur cette page.`);
      }
    }
    
    return elementsModified > 0;
  }

  /**
   * Fonction pour modifier les liens de booking marqués avec data-fd-booking-link
   * Ajoute les UTMs et le visitor_id depuis le localStorage à l'URL du lien
   */
  function modifyBookingLinks() {
    const linkSelector = '[data-fd-booking-link]';
    console.log(`[DEBUG-BOOKING-LINK] Recherche des liens avec sélecteur: ${linkSelector}`);
    const bookingLinks = document.querySelectorAll(linkSelector);

    if (!bookingLinks.length) {
      console.log('[DEBUG-BOOKING-LINK] Aucun lien avec data-fd-booking-link trouvé.');
      return false;
    }
    console.log(`[DEBUG-BOOKING-LINK] ${bookingLinks.length} liens trouvés.`);

    let modifiedCount = 0;
    bookingLinks.forEach((link, index) => {
      console.log(`[DEBUG-BOOKING-LINK] Traitement du lien #${index + 1}:`, link);

      // Lire TOUTES les données pertinentes du LS
      const visitorId = localStorage.getItem('funnel_doctor_visitor_id');
      const utmSource = localStorage.getItem('funnel_doctor_utm_source');
      const utmMedium = localStorage.getItem('funnel_doctor_utm_medium');
      const utmCampaign = localStorage.getItem('funnel_doctor_utm_campaign');
      const utmContent = localStorage.getItem('funnel_doctor_utm_content');
      const utmTerm = localStorage.getItem('funnel_doctor_utm_term');

      const trackingData = { visitorId, utmSource, utmMedium, utmCampaign, utmContent, utmTerm };
      console.log('[DEBUG-BOOKING-LINK] Données lues depuis LS:', trackingData);

      if (!link.href) {
        console.warn('[DEBUG-BOOKING-LINK] Le lien trouvé n\'a pas d\'attribut href.');
        return; // Skip
      }

      // Vérifier s'il y a au moins une donnée à ajouter
      const hasDataToAdd = Object.values(trackingData).some(value => value !== null && value !== undefined && value !== '');
      if (!hasDataToAdd) {
        console.log('[DEBUG-BOOKING-LINK] Aucune donnée pertinente trouvée dans LS pour modifier ce lien.');
        return; // Skip
      }

      try {
        let originalUrl = link.href;
        // Utiliser document.baseURI comme base pour résoudre les URL relatives correctement
        let url = new URL(originalUrl, document.baseURI);

        // Ajouter les paramètres seulement s'ils ont une valeur
        if (visitorId) url.searchParams.set('fd_visitor_id', visitorId);
        if (utmSource) url.searchParams.set('utm_source', utmSource);
        if (utmMedium) url.searchParams.set('utm_medium', utmMedium);
        if (utmCampaign) url.searchParams.set('utm_campaign', utmCampaign);
        if (utmContent) url.searchParams.set('utm_content', utmContent);
        if (utmTerm) url.searchParams.set('utm_term', utmTerm);

        const newUrl = url.toString();
        // Vérifier si l'URL a réellement changé pour éviter les logs inutiles
        if (newUrl !== originalUrl) {
          console.log(`[DEBUG-BOOKING-LINK] Modification du href: ${originalUrl} -> ${newUrl}`);
          link.href = newUrl;
          modifiedCount++;
        } else {
          console.log(`[DEBUG-BOOKING-LINK] Aucune modification nécessaire pour le href (paramètres peut-être déjà présents ou vides).`);
        }
      } catch (error) {
        console.error('[DEBUG-BOOKING-LINK] Erreur lors de la modification de l\'URL:', error, link);
      }
    });

    console.log(`[DEBUG-BOOKING-LINK] ${modifiedCount} liens modifiés sur ${bookingLinks.length} trouvés.`);
    return modifiedCount > 0;
  }

  // Initialiser le bridging lors du chargement complet avec un délai suffisant
  if (document.readyState === 'complete') {
    setTimeout(init, 500); // Délai plus long pour s'assurer que tous les scripts sont chargés
  } else {
    window.addEventListener('load', function() {
      setTimeout(init, 500);
    });
  }
  
  // Configuration de vérifications périodiques pour ConvertKit
  if (isConvertKit) {
    const periodicIntervals = [2000, 5000, 10000, 15000, 20000]; // 2s, 5s, 10s, 15s, 20s
    
    periodicIntervals.forEach(interval => {
      setTimeout(() => {
        if (!calendarLinksProcessed) {
          fdLog('info', `Vérification périodique des liens Calendly (${interval}ms)`);
          injectVisitorIdIntoCalendlyLinks();
        }
      }, interval);
    });
  }
  
  /**
   * Ajout de l'écouteur d'événements postMessage pour Calendly
   * Cette approche est complémentaire à la modification des liens avec utm_content
   * Elle permet de capturer le moment où un rendez-vous est effectivement pris
   */
  fdLog('info', 'Configuration de l\'écouteur postMessage pour Calendly');
  // LOGS INTENSIFS: Toujours afficher ces logs, même si debugMode est désactivé
  console.log('FD-DEBUG: Attaching Calendly postMessage listener...');
  
  window.addEventListener('message', function(event) {
    // LOGS INTENSIFS: Log pour CHAQUE message reçu, quelle que soit son origine
    console.log('FD-DEBUG: <<< RAW MESSAGE RECEIVED >>>', {
      origin: event.origin,
      data: event.data,
      dataType: typeof event.data
    });
    
    // Vérifier si le message vient de Calendly ou d'un sous-domaine de Calendly
    if (event.origin !== 'https://calendly.com' && !event.origin.endsWith('.calendly.com')) {
      console.log('FD-DEBUG: Ignored message from origin:', event.origin);
      return;
    }
    
    console.log('FD-DEBUG: Message potentially from Calendly, origin OK:', event.origin);
    
    try {
      const data = event.data;
      fdLog('info', 'Message reçu de Calendly:', data);
      console.log('FD-DEBUG: Contenu du message Calendly:', JSON.stringify(data, null, 2));
      
      // Vérifier si c'est un événement de réservation Calendly
      console.log('FD-DEBUG: Vérification du type d\'événement -', 
                 'data existe:', !!data, 
                 'data.event existe:', !!(data && data.event),
                 'valeur de data.event:', data && data.event);
      
      if (data && data.event === 'calendly.event_scheduled') {
        fdLog('info', 'Événement calendly.event_scheduled détecté');
        console.log('FD-DEBUG: >>> calendly.event_scheduled DETECTED! <<<', event.data);
        
        // Récupérer les métadonnées de l'événement
        const metadata = {
          event_type: data.event,
          invitee_uuid: data.invitee?.uuid,
          event_uuid: data.event_uuid,
          payload: data
        };
        
        console.log('FD-DEBUG: Métadonnées extraites:', JSON.stringify(metadata, null, 2));
        console.log('FD-DEBUG: Visitor ID actuel:', visitorId);
        
        // Récupérer l'email si disponible
        const email = data.invitee?.email;
        console.log('FD-DEBUG: Email extrait:', email);
        
        // MODIFICATION STRATÉGIE: On continue même sans email
        if (!email) {
          console.log('FD-DEBUG: Email non disponible dans l\'événement Calendly, mais on continue avec visitorId seulement');
          fdLog('warn', 'Email de l\'invité non disponible dans l\'événement Calendly - On continue avec visitorId seulement');
          // On ne retourne PAS, on continue l'exécution pour envoyer le visitorId seul
        }
        
        // Envoyer les données d'association au backend (même sans email)
        const currentVisitorId = window.FunnelDoctor.getVisitorId(); // Re-récupère au cas où
        console.log('FD-DEBUG: Preparing to send to /api/bridge/associate. VisitorID:', currentVisitorId, 'Email:', email || 'null', 'Metadata:', metadata);
        
        sendBridgeAssociation(email, currentVisitorId, 'calendly_event_scheduled', metadata);
      } else {
        console.log('FD-DEBUG: Calendly message ignored (not event_scheduled):', event.data?.event);
      }
    } catch (error) {
      console.error('FD-DEBUG: ERREUR lors du traitement du message Calendly:', error);
      fdLog('error', 'Erreur lors du traitement du message Calendly:', error);
    }
  }, false);
  
  // Exposer des fonctions de débogage
  window.FunnelDoctor.bridging = {
    reprocessCalendlyLinks: injectVisitorIdIntoCalendlyLinks,
    debug: debugMode,
    sendBridgeAssociation: sendBridgeAssociation  // Exposer la fonction d'association pour les tests manuels
  };
})();
