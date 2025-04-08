/**
 * FunnelDoctor - Script de bridging (VERSION DEBUG INTENSIVE)
 * 
 * Ce script est chargé après funnel-doctor.js et a pour rôle de:
 * 1. Injecter le visitor_id dans les liens Calendly
 * 2. Modifier les bouttons de paiement Stripe pour inclure le visitor_id
 * 3. Assurer le suivi des conversions entre les différentes étapes du funnel
 * 
 * V2.2: Diagnostic intensif pour ConvertKit
 */

(function() {
  // FORCER le mode debug pour cette version
  const debugMode = true;
  console.log('==== BRIDGING.JS DEBUG VERSION STARTED ====');
  console.log('Debug mode forcé à:', debugMode);
  
  // Fonction de log avancée qui respecte le mode debug
  function fdLog(level, ...args) {
    const prefix = `[FD-DEBUG-${level.toUpperCase()}]:`;
    if (level === 'error') {
      console.error(prefix, ...args);
    } else if (level === 'warn') {
      console.warn(prefix, ...args);
    } else {
      console.log(prefix, ...args);
    }
  }

  // S'assurer que FunnelDoctor est chargé
  if (typeof window.FunnelDoctor === 'undefined') {
    fdLog('error', 'FunnelDoctor n\'est pas chargé. Assurez-vous de charger funnel-doctor.js avant bridging.js');
    return;
  }
  
  // Obtenir le visitor_id actuel
  const visitorId = window.FunnelDoctor.getVisitorId();
  fdLog('info', '📋 VISITOR ID DÉTECTÉ:', visitorId);
  fdLog('info', '🌐 DOMAINE DE LA PAGE:', window.location.hostname);
  fdLog('info', '📄 URL COMPLÈTE:', window.location.href);
  
  // Vérifier si nous sommes sur ConvertKit
  const isConvertKit = window.location.hostname.includes('kit.com');
  fdLog('info', '🔍 DÉTECTION CONVERTKIT:', isConvertKit ? 'OUI ✅' : 'NON ❌');
  
  // Variable pour suivre si la fonction a été exécutée avec succès au moins une fois
  let calendarLinksProcessed = false;
  let globalLinksFound = 0;
  let globalLinksModified = 0;
  
  /**
   * Fonction de diagnostic qui inspecte l'élément DOM
   */
  function inspectElement(element) {
    try {
      fdLog('info', '📌 INSPECTION ÉLÉMENT:', {
        tagName: element.tagName,
        id: element.id,
        classes: element.className,
        href: element.href || null,
        dataUrl: element.getAttribute('data-url') || null,
        dataCalendlyUrl: element.getAttribute('data-calendly-url') || null,
        onclick: element.getAttribute('onclick') || null,
        innerHTML: element.innerHTML.substring(0, 100) + (element.innerHTML.length > 100 ? '...' : ''),
        parentNode: element.parentNode ? {
          tagName: element.parentNode.tagName,
          id: element.parentNode.id,
          classes: element.parentNode.className
        } : null
      });
    } catch (e) {
      fdLog('error', 'Erreur lors de l\'inspection de l\'élément', e);
    }
  }
  
  /**
   * Modification des liens Calendly pour inclure le visitor_id
   * Amélioration: utilise utm_content pour transmettre le visitorId à Calendly
   */
  function injectVisitorIdIntoCalendlyLinks() {
    fdLog('info', '🔄 DÉBUT injectVisitorIdIntoCalendlyLinks');
    
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
      // Sélecteurs très larges (ConvertKit peut utiliser des structures particulières)
      'a',
      'button',
      '.button',
      '.ck-button',
      '.btn',
      'div[role="button"]'
    ];
