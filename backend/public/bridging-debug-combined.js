    // Fonction pour vu00e9rifier si un u00e9lu00e9ment pourrait contenir un lien Calendly
    function couldContainCalendlyLink(element) {
      try {
        // Vu00e9rifier le HTML et tous les attributs pour la chau00eene "calendly"
        const innerHTML = element.innerHTML ? element.innerHTML.toLowerCase() : '';
        const hasCalendlyInHTML = innerHTML.includes('calendly');
        
        // Vu00e9rifier tous les attributs
        let hasCalendlyInAttributes = false;
        const attributes = element.attributes;
        if (attributes) {
          for (let i = 0; i < attributes.length; i++) {
            const attrValue = attributes[i].value.toLowerCase();
            if (attrValue.includes('calendly')) {
              hasCalendlyInAttributes = true;
              break;
            }
          }
        }
        
        // Vu00e9rifier mu00eame les propriu00e9tu00e9s personnalisu00e9es qui pourraient contenir des URL
        let hasCalendlyInCustomProperties = false;
        if (element._url && element._url.toLowerCase().includes('calendly')) {
          hasCalendlyInCustomProperties = true;
        }
        
        return hasCalendlyInHTML || hasCalendlyInAttributes || hasCalendlyInCustomProperties;
      } catch (e) {
        fdLog('error', 'Erreur lors de la vu00e9rification de l\'u00e9lu00e9ment pour Calendly', e);
        return false;
      }
    }
    
    // Fonction pour du00e9tecter si un u00e9lu00e9ment correspond u00e0 l'un des su00e9lecteurs
    function matchesAnySelector(element, selectors) {
      for (const selector of selectors) {
        try {
          if (element.matches(selector)) {
            fdLog('info', 'u2705 u00c9Lu00c9MENT CORRESPOND AU Su00c9LECTEUR:', selector);
            return true;
          }
        } catch (e) {
          // Ignorer les erreurs de su00e9lecteur invalide
        }
      }
      return false;
    }
    
    // Collecter tous les u00e9lu00e9ments qui pourraient contenir des liens Calendly
    const potentialCalendlyElements = [];
    
    fdLog('info', 'ud83dudd0e RECHERCHE D\'ELEMENTS CALENDLY AVEC', calendlySelectors.length, 'Su00c9LECTEURS');
    
    // Parcourir chaque su00e9lecteur et chercher des u00e9lu00e9ments correspondants
    calendlySelectors.forEach((selector, index) => {
      try {
        fdLog('info', `ud83dudd0d ESSAI Su00c9LECTEUR #${index + 1}:`, selector);
        const elements = document.querySelectorAll(selector);
        fdLog('info', `\tu2192 u00c9lu00e9ments trouvu00e9s: ${elements.length}`);
        
        // Pour chaque u00e9lu00e9ment trouvu00e9, vu00e9rifier s'il contient "calendly" quelque part
        elements.forEach(element => {
          if (couldContainCalendlyLink(element)) {
            fdLog('info', 'ud83dudd0e u00c9Lu00c9MENT CALENDLY POTENTIEL TROUVu00c9:');
            inspectElement(element);
            if (!potentialCalendlyElements.includes(element)) {
              potentialCalendlyElements.push(element);
            }
          }
        });
      } catch (e) {
        fdLog('error', `Erreur avec le su00e9lecteur "${selector}":`, e);
      }
    });
    
    fdLog('info', `ud83dudcca TOTAL DES u00c9Lu00c9MENTS CALENDLY POTENTIELS: ${potentialCalendlyElements.length}`);
    
    // Fonction pour extraire l'URL Calendly d'un u00e9lu00e9ment (gu00e8re diffu00e9rents cas)
    function extractCalendlyUrl(element) {
      fdLog('info', 'ud83cudf10 TENTATIVE D\'EXTRACTION URL DEPUIS:', element.tagName, element.className);
      let url = null;
      
      // Cas 1: href direct
      if (element.href && element.href.includes('calendly.com')) {
        url = element.href;
        fdLog('info', 'u2705 URL extraite de href:', url);
      }
      // Cas 2: attribut data-url
      else if (element.getAttribute('data-url') && element.getAttribute('data-url').includes('calendly.com')) {
        url = element.getAttribute('data-url');
        fdLog('info', 'u2705 URL extraite de data-url:', url);
      }
      // Cas 3: attribut data-calendly-url
      else if (element.getAttribute('data-calendly-url')) {
        url = element.getAttribute('data-calendly-url');
        fdLog('info', 'u2705 URL extraite de data-calendly-url:', url);
      }
      // Cas 4: dans l'attribut onclick
      else if (element.getAttribute('onclick')) {
        const onclickAttr = element.getAttribute('onclick');
        fdLog('info', 'Analyse de onclick:', onclickAttr);
        
        const match = onclickAttr.match(/https:\/\/calendly\.com\S+/g);
        if (match && match.length > 0) {
          // Nettoyer l'URL (enlever guillemets, parenthu00e8ses, etc.)
          url = match[0].replace(/['")]$/, '');
          fdLog('info', 'u2705 URL extraite de onclick:', url);
        }
      }
      // Cas 5: recherche dans le code HTML en cas d'u00e9chec des autres mu00e9thodes
      else {
        try {
          const innerHTML = element.innerHTML;
          if (innerHTML && innerHTML.includes('calendly.com')) {
            fdLog('info', 'Recherche d\'URL Calendly dans le HTML intu00e9rieur');
            const match = innerHTML.match(/https:\/\/calendly\.com\S+["'\s]/g);
            if (match && match.length > 0) {
              // Nettoyer l'URL
              url = match[0].replace(/["\'\s]$/, '');
              fdLog('info', 'u2705 URL extraite du HTML:', url);
            }
          }
        } catch (e) {
          fdLog('error', 'Erreur lors de la recherche dans le HTML:', e);
        }
      }
      
      // Cas spu00e9cial ConvertKit: chercher dans les enfants si pas trouvu00e9
      if (!url && element.tagName === 'DIV' && (element.className.includes('ck-') || element.className.includes('convertkit'))) {
        fdLog('info', 'Recherche dans les enfants (cas ConvertKit)');
        const anchors = element.querySelectorAll('a');
        anchors.forEach(anchor => {
          if (!url && anchor.href && anchor.href.includes('calendly.com')) {
            url = anchor.href;
            fdLog('info', 'u2705 URL extraite d\'un enfant <a>:', url);
          }
        });
      }
      
      if (!url) {
        fdLog('warn', 'u274c Aucune URL Calendly trouvu00e9e dans l\'u00e9lu00e9ment');
      }
      
      return url;
    }
    
    // Fonction pour modifier une URL Calendly
    function modifyCalendlyUrl(url) {
      try {
        fdLog('info', 'ud83dudcdd MODIFICATION DE L\'URL CALENDLY:', url);
        // Sauvegarder l'URL originale pour le debugging
        const originalUrl = url;
        
        const urlObj = new URL(url);
        
        // Vu00e9rifier les paramu00e8tres UTM actuels
        const currentUtmContent = urlObj.searchParams.get('utm_content');
        fdLog('info', 'utm_content actuel:', currentUtmContent);
        
        // Ajouter ou remplacer le paramu00e8tre UTM content pour le visitorId
        urlObj.searchParams.set('utm_content', visitorId);
        
        // Paramu00e8tre personnalisu00e9 en plus (au cas ou00f9 Calendly ne transmet pas les UTM)
        urlObj.searchParams.set('fd_tlid', visitorId);
        
        const modifiedUrl = urlObj.toString();
        
        // Comparaison pour le debugging
        fdLog('info', 'URL ORIGINALE :', originalUrl);
        fdLog('info', 'URL MODIFIu00c9E  :', modifiedUrl);
        fdLog('info', 'Changement ru00e9ussi:', originalUrl !== modifiedUrl ? 'u2705 OUI' : 'u274c NON');
        
        return modifiedUrl;
      } catch (e) {
        fdLog('error', 'Erreur lors de la modification de l\'URL Calendly', e, '\nURL problu00e9matique:', url);
        return url;
      }
    }
    
    // Fonction pour appliquer l'URL modifiu00e9e u00e0 l'u00e9lu00e9ment
    function applyModifiedUrl(element, originalUrl, modifiedUrl) {
      fdLog('info', 'ud83dudee0ufe0f APPLICATION DE L\'URL MODIFIu00c9E:', element.tagName);
      let applied = false;
      
      try {
        // Cas 1: u00e9lu00e9ment avec href
        if (element.tagName === 'A' || element.href) {
          const oldHref = element.href;
          element.href = modifiedUrl;
          fdLog('info', 'href modifiu00e9:', oldHref, '->', element.href);
          applied = true;
        }
        // Cas 2: u00e9lu00e9ment avec data-url
        else if (element.getAttribute('data-url')) {
          const oldDataUrl = element.getAttribute('data-url');
          element.setAttribute('data-url', modifiedUrl);
          fdLog('info', 'data-url modifiu00e9:', oldDataUrl, '->', element.getAttribute('data-url'));
          applied = true;
        }
        // Cas 3: u00e9lu00e9ment avec data-calendly-url
        else if (element.getAttribute('data-calendly-url')) {
          const oldDataCalendlyUrl = element.getAttribute('data-calendly-url');
          element.setAttribute('data-calendly-url', modifiedUrl);
          fdLog('info', 'data-calendly-url modifiu00e9:', oldDataCalendlyUrl, '->', element.getAttribute('data-calendly-url'));
          applied = true;
        }
        // Cas 4: u00e9lu00e9ment avec onclick contenant l'URL
        else if (element.getAttribute('onclick') && element.getAttribute('onclick').includes(originalUrl)) {
          const oldOnclick = element.getAttribute('onclick');
          const newOnclick = oldOnclick.replace(originalUrl, modifiedUrl);
          element.setAttribute('onclick', newOnclick);
          fdLog('info', 'onclick modifiu00e9');
          applied = true;
        }
        // Cas 5: chercher dans le HTML (tru00e8s agressif, u00e0 utiliser uniquement en dernier recours)
        else if (element.innerHTML && element.innerHTML.includes(originalUrl)) {
          const oldHtml = element.innerHTML;
          const newHtml = oldHtml.replace(new RegExp(escapeRegExp(originalUrl), 'g'), modifiedUrl);
          element.innerHTML = newHtml;
          fdLog('info', 'HTML modifiu00e9 (changeant URL directement dans le HTML)');
          applied = true;
        }
        // Cas spu00e9cial ConvertKit: chercher dans les enfants
        else if (element.tagName === 'DIV' && (element.className.includes('ck-') || element.className.includes('convertkit'))) {
          const anchors = element.querySelectorAll('a');
          anchors.forEach(anchor => {
            if (anchor.href && anchor.href.includes('calendly.com')) {
              const oldHref = anchor.href;
              anchor.href = modifiedUrl;
              fdLog('info', 'href enfant modifiu00e9:', oldHref, '->', anchor.href);
              applied = true;
            }
          });
        }
        
        // Log du ru00e9sultat
        fdLog('info', 'Application URL modifiu00e9e:', applied ? 'u2705 Ru00c9USSIE' : 'u274c u00c9CHOUu00c9E');
        return applied;
      } catch (e) {
        fdLog('error', 'Erreur lors de l\'application de l\'URL modifiu00e9e:', e);
        return false;
      }
    }
    
    // Escape string for RegExp
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    // Appliquer la modification u00e0 tous les u00e9lu00e9ments potentiels de Calendly
    let linksFound = 0;
    let linksModified = 0;
    
    fdLog('info', 'ud83dudcca TRAITEMENT DES u00c9Lu00c9MENTS CALENDLY TROUVu00c9S:', potentialCalendlyElements.length);
    
    potentialCalendlyElements.forEach((element, index) => {
      fdLog('info', `ud83dudc49 TRAITEMENT u00c9Lu00c9MENT #${index + 1}:`);
      inspectElement(element);
      
      // Extraire l'URL Calendly
      const url = extractCalendlyUrl(element);
      
      // Si une URL a u00e9tu00e9 trouvu00e9e, la modifier et l'appliquer
      if (url) {
        linksFound++;
        
        const modifiedUrl = modifyCalendlyUrl(url);
        
        // Appliquer l'URL modifiu00e9e u00e0 l'u00e9lu00e9ment
        if (applyModifiedUrl(element, url, modifiedUrl)) {
          linksModified++;
          globalLinksModified++;
        }
      }
    });
    
    // Si on est sur ConvertKit mais qu'on n'a pas trouvu00e9 de liens, essayons une approche plus agressive
    if (isConvertKit && linksFound === 0) {
      fdLog('info', 'ud83dudea8 MODE CONVERTKIT AGRESSIF: Aucun lien trouvu00e9 avec les su00e9lecteurs standards');
      
      // Recherche de texte pouvant indiquer un bouton Calendly
      const elementsWithCalendlyText = [];
      const buttonTextPatterns = [
        'calendly', 'rdv', 'rendez', 'meeting', 'schedule', 'book', 'ru00e9servation', 'appel'
      ];
      
      // Fonction pour vu00e9rifier si un u00e9lu00e9ment contient un texte suggu00e9rant un lien Calendly
      function hasCalendlyIndicativeText(element) {
        try {
          const text = element.innerText ? element.innerText.toLowerCase() : '';
          return buttonTextPatterns.some(pattern => text.includes(pattern));
        } catch (e) {
          return false;
        }
      }
      
      // Chercher tous les boutons, liens, et divs qui pourraient u00eatre des liens Calendly basu00e9 sur leur texte
      fdLog('info', 'ud83dudd0d RECHERCHE D\'u00c9Lu00c9MENTS AVEC TEXTE CALENDLY');
      
      document.querySelectorAll('a, button, .button, .btn, [role="button"], div').forEach(element => {
        if (hasCalendlyIndicativeText(element)) {
          fdLog('info', 'ud83dudd0e u00c9Lu00c9MENT AVEC TEXTE CALENDLY TROUVu00c9:');
          inspectElement(element);
          elementsWithCalendlyText.push(element);
        }
      });
      
      fdLog('info', `ud83dudcca TOTAL DES u00c9Lu00c9MENTS AVEC TEXTE CALENDLY: ${elementsWithCalendlyText.length}`);
      
      // Traiter ces u00e9lu00e9ments comme potentiels liens Calendly
      elementsWithCalendlyText.forEach((element, index) => {
        fdLog('info', `ud83dudc49 TRAITEMENT u00c9Lu00c9MENT TEXTE #${index + 1}:`);
        
        // Si l'u00e9lu00e9ment a un u00e9vu00e9nement de clic, tenter d'extraire l'URL de l'u00e9vu00e9nement
        if (element.onclick) {
          fdLog('info', 'Analyse de l\'u00e9vu00e9nement onclick');
          // Nous ne pouvons pas directement extraire le code de l'u00e9vu00e9nement onclick
          // Mais nous pouvons voir s'il y a des indications d'URLs Calendly dans les attributs
        }
        
        // Vu00e9rifier s'il s'agit d'un bouton avec un attribut de donnu00e9es
        const allAttributes = {};
        for (let i = 0; i < element.attributes.length; i++) {
          const attr = element.attributes[i];
          allAttributes[attr.name] = attr.value;
          
          // Chercher des attributs qui pourraient contenir une URL ou configuration Calendly
          if (attr.name.startsWith('data-') && 
             (attr.value.includes('calendly') || attr.value.includes('schedule') || attr.value.includes('meeting'))) {
            fdLog('info', `Attribut potentiel Calendly trouvu00e9: ${attr.name}=${attr.value}`);
          }
        }
        
        fdLog('info', 'Tous les attributs:', allAttributes);
      });
    }
    
    // Ru00e9sultat global
    fdLog('info', `ud83dudcca TRAITEMENT LIEN CALENDLY: ${linksFound} trouvu00e9s, ${linksModified} modifiu00e9s`);
    globalLinksFound += linksFound;
    
    // Analyser les iframes
    try {
      const iframes = document.querySelectorAll('iframe');
      fdLog('info', `ud83dudc49 ANALYSE DE ${iframes.length} IFRAMES`);
      
      iframes.forEach((iframe, index) => {
        try {
          fdLog('info', `Iframe #${index + 1}:`, iframe.src || 'Sans source');
          
          // Tenter d'accu00e9der au contenu de l'iframe (peut u00e9chouer en raison des restrictions CORS)
          if (iframe.contentDocument) {
            fdLog('info', 'Accu00e8s au contenu de l\'iframe ru00e9ussi');
            
            // Chercher des u00e9lu00e9ments Calendly dans l'iframe
            const iframeElements = iframe.contentDocument.querySelectorAll(
              'a[href*="calendly.com"], button[data-url*="calendly.com"]'
            );
            
            fdLog('info', `u00c9lu00e9ments Calendly trouvu00e9s dans iframe: ${iframeElements.length}`);
          } else {
            fdLog('warn', 'Impossible d\'accu00e9der au contenu de l\'iframe (restrictions CORS)');
          }
        } catch (e) {
          fdLog('error', 'Erreur lors de l\'analyse de l\'iframe', e);
        }
      });
    } catch (e) {
      fdLog('error', 'Erreur lors de l\'analyse des iframes', e);
    }
    
    // Observer le DOM pour modifier les liens Calendly ajoutu00e9s dynamiquement
    fdLog('info', 'ud83dudc49 CONFIGURATION DU MUTATION OBSERVER');
    
    const observer = new MutationObserver(mutations => {
      let needsUpdate = false;
      let newNodesFound = 0;
      let attributeChanges = 0;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // u00c9lu00e9ment HTML
              newNodesFound++;
              
              // Vu00e9rifier si l'u00e9lu00e9ment pourrait contenir un lien Calendly
              const nodeHtml = node.outerHTML ? node.outerHTML.toLowerCase() : '';
              if (nodeHtml.includes('calendly')) {
                fdLog('info', 'ud83dudd04 MUTATION: Nouvel u00e9lu00e9ment avec Calendly ajoutu00e9', node.tagName);
                needsUpdate = true;
              }
            }
          });
        } else if (mutation.type === 'attributes') {
          attributeChanges++;
          
          // Vu00e9rifier si l'attribut modifiu00e9 est pertinent pour Calendly
          const relevantAttributes = ['href', 'data-url', 'data-calendly-url', 'onclick'];
          if (relevantAttributes.includes(mutation.attributeName)) {
            const target = mutation.target;
            const attributeValue = target.getAttribute(mutation.attributeName);
            
            if (attributeValue && attributeValue.includes('calendly')) {
              fdLog('info', 'ud83dudd04 MUTATION: Attribut Calendly modifiu00e9', mutation.attributeName);
              needsUpdate = true;
            }
          }
        }
      });
      
      if (newNodesFound > 0 || attributeChanges > 0) {
        fdLog('info', `ud83dudd04 MUTATIONS DU DOM: ${newNodesFound} nouveaux noeuds, ${attributeChanges} changements d'attributs`);
      }
      
      if (needsUpdate) {
        fdLog('info', 'ud83dudd04 MUTATION CALENDLY Du00c9TECTu00c9E: Relancement de la recherche');
        injectVisitorIdIntoCalendlyLinks();
      }
    });
    
    // Configuration du MutationObserver
    const observerConfig = {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['href', 'data-url', 'data-calendly-url', 'onclick']
    };
    
    fdLog('info', 'Configuration MutationObserver:', observerConfig);
    observer.observe(document.body, observerConfig);
    
    return linksModified > 0;
  }
  
  /**
   * Ajout de code spu00e9cifique pour ConvertKit
   */
  function handleConvertKitSpecifics() {
    if (!isConvertKit) return;
    
    fdLog('info', 'ud83dudc49 MODE SPu00c9CIFIQUE CONVERTKIT ACTIVu00c9');
    
    // Vu00e9rifier les scripts ConvertKit pour intercepter la cru00e9ation de liens Calendly
    const ckScripts = Array.from(document.scripts).filter(script => {
      return script.src && (script.src.includes('kit.com') || script.src.includes('convertkit'));
    });
    
    fdLog('info', `Scripts ConvertKit trouvu00e9s: ${ckScripts.length}`);
    
    // Observer spu00e9cifiquement les ajouts de ConvertKit
    const convertKitObserver = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.className && 
                (node.className.includes('ck-') || node.className.includes('convertkit'))) {
              fdLog('info', 'ud83dudc41 NOUVEAU COMPOSANT CONVERTKIT:', node.className);
            }
          });
        }
      });
    });
    
    convertKitObserver.observe(document.body, { childList: true, subtree: true });
    
    // Tenter de faire un hook dans le code ConvertKit
    if (window.CKJS || window.ConvertKit) {
      fdLog('info', 'API ConvertKit du00e9tectu00e9e, tentative de hook');
      
      const ckLib = window.CKJS || window.ConvertKit;
      try {
        // Surveiller les mu00e9thodes qui pourraient gu00e9nu00e9rer des liens
        for (const key in ckLib) {
          if (typeof ckLib[key] === 'function') {
            fdLog('info', `Mu00e9thode ConvertKit trouvu00e9e: ${key}`);
          }
        }
      } catch (e) {
        fdLog('error', 'Erreur lors de l\'analyse de l\'API ConvertKit:', e);
      }
    }
  }
  /**
   * Modification des boutons Stripe pour inclure le visitor_id dans les mu00e9tadonnu00e9es
   */
  function injectVisitorIdIntoStripeCheckout() {
    // Simplification pour la version debug - conserve juste les logs essentiels
    fdLog('info', 'Initialisation Stripe (version simplifiu00e9e pour debugging)');
    
    // Vu00e9rifier si Stripe est chargu00e9
    if (typeof window.Stripe === 'undefined') {
      fdLog('info', 'Stripe n\'est pas encore chargu00e9');
      return;
    }
    
    fdLog('info', 'Stripe du00e9tectu00e9, configuration du hook pour visitor_id');
  }
  
  // Fonction principale d'initialisation avec ru00e9essais avancu00e9s
  function init() {
    fdLog('info', 'ud83dudca1 Du00c9BUT INITIALISATION BRIDGING');
    
    // Cas spu00e9cial pour ConvertKit
    if (isConvertKit) {
      handleConvertKitSpecifics();
    }
    
    // Tenter de modifier les liens Calendly
    fdLog('info', 'Tentative initiale de modification des liens Calendly');
    const calendlySuccess = injectVisitorIdIntoCalendlyLinks();
    
    // Initialiser Stripe (simplifiu00e9 pour le debug)
    injectVisitorIdIntoStripeCheckout();
    
    // Suivre l'u00e9vu00e9nement d'initialisation du bridging
    fdLog('info', 'Tracking de l\'initialisation du bridging');
    window.FunnelDoctor.trackEvent('bridging_initialized', {
      visitor_id: visitorId,
      calendly_links_modified: calendlySuccess
    });
    
    // Si aucun lien Calendly n'a u00e9tu00e9 traitu00e9 avec succu00e8s, programmer des ru00e9essais
    if (!calendlySuccess) {
      // Configuration des ru00e9essais avancu00e9s
      const retryIntervals = [500, 1000, 2000, 3000, 5000, 7000, 10000]; // Du00e9lais en ms entre les tentatives
      let retryCount = 0;
      
      function retryProcessingCalendlyLinks() {
        fdLog('info', `ud83dudd04 TENTATIVE #${retryCount + 1} de traitement des liens Calendly`);
        
        if (retryCount >= retryIntervals.length || globalLinksModified > 0) {
          fdLog('info', `Fin des tentatives. Succu00e8s final: ${globalLinksModified > 0 ? 'u2705 OUI' : 'u274c NON'}`);
          return;
        }
        
        const success = injectVisitorIdIntoCalendlyLinks();
        
        if (success) {
          fdLog('info', `u2705 SUCCu00c8S lors de la tentative #${retryCount + 1}!`);
        } else {
          retryCount++;
          if (retryCount < retryIntervals.length) {
            const nextDelayMs = retryIntervals[retryCount];
            fdLog('info', `u23f3 PLANIFICATION tentative #${retryCount + 1} dans ${nextDelayMs}ms`);
            setTimeout(retryProcessingCalendlyLinks, nextDelayMs);
          } else {
            fdLog('warn', 'u274c TOUTES LES TENTATIVES ONT u00c9CHOUu00c9');
          }
        }
      }
      
      // Du00e9marrer les ru00e9essais
      fdLog('info', `Planification premier ru00e9essai dans ${retryIntervals[0]}ms`);
      setTimeout(retryProcessingCalendlyLinks, retryIntervals[0]);
    }
  }
  
  // Mu00e9thode de dernier recours: vu00e9rifier pu00e9riodiquement tous les u00e9lu00e9ments
  function setupLastResortCheck() {
    // Vu00e9rifier toutes les 2 secondes pendant 30 secondes pour tout lien qui pourrait avoir u00e9tu00e9 ajoutu00e9
    const intervals = [2000, 4000, 6000, 8000, 10000, 15000, 20000, 25000, 30000];
    
    intervals.forEach(interval => {
      setTimeout(() => {
        if (globalLinksModified === 0) {
          fdLog('info', `ud83dudd50 Vu00c9RIFICATION DE DERNIER RECOURS u00e0 ${interval}ms`);
          injectVisitorIdIntoCalendlyLinks();
        }
      }, interval);
    });
  }
  
  // Initialiser le bridging lors du chargement complet avec un du00e9lai plus long
  if (document.readyState === 'complete') {
    fdLog('info', 'Document du00e9ju00e0 chargu00e9, initialisation dans 500ms...');
    setTimeout(() => {
      init();
      setupLastResortCheck();
    }, 500);
  } else {
    fdLog('info', 'En attente du chargement complet du document...');
    window.addEventListener('load', function() {
      fdLog('info', '\u00c9vu00e9nement load du00e9clenchu00e9, initialisation dans 500ms...');
      setTimeout(() => {
        init();
        setupLastResortCheck();
      }, 500);
    });
  }
  
  // Exposer des fonctions et donnu00e9es de du00e9bogage pour accu00e8s depuis la console
  window.FunnelDoctorDebug = {
    reprocessCalendlyLinks: injectVisitorIdIntoCalendlyLinks,
    visitorId: visitorId,
    stats: {
      get linksFound() { return globalLinksFound; },
      get linksModified() { return globalLinksModified; }
    },
    manualProcessElement: function(selector) {
      try {
        const element = document.querySelector(selector);
        if (!element) {
          fdLog('error', 'Aucun u00e9lu00e9ment trouvu00e9 avec le su00e9lecteur:', selector);
          return false;
        }
        
        fdLog('info', 'Traitement manuel de l\'u00e9lu00e9ment:', element);
        inspectElement(element);
        
        const url = extractCalendlyUrl(element);
        if (!url) {
          fdLog('error', 'Aucune URL Calendly trouvu00e9e dans cet u00e9lu00e9ment');
          return false;
        }
        
        const modifiedUrl = modifyCalendlyUrl(url);
        const success = applyModifiedUrl(element, url, modifiedUrl);
        
        fdLog('info', 'Ru00e9sultat du traitement manuel:', success ? 'u2705 Ru00c9USSI' : 'u274c u00c9CHOUu00c9');
        return success;
      } catch (e) {
        fdLog('error', 'Erreur lors du traitement manuel:', e);
        return false;
      }
    },
    inspectAllLinks: function() {
      const allLinks = document.querySelectorAll('a');
      fdLog('info', `Inspection de tous les liens (${allLinks.length})`);
      
      allLinks.forEach((link, index) => {
        fdLog('info', `Lien #${index}:`, {
          href: link.href,
          text: link.innerText,
          classList: Array.from(link.classList),
          parent: link.parentElement ? link.parentElement.tagName : 'none'
        });
      });
    }
  };
  
  fdLog('info', 'ud83dudcaa SCRIPT DE BRIDGING DEBUG INITIALISu00c9 ET PRu00caT');
})();
