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
