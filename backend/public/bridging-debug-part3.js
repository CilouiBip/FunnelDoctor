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
