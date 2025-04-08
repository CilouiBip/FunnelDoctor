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
