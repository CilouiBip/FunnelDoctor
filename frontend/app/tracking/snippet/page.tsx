"use client";

import { useState, useEffect } from 'react';

const SnippetPage = () => {
  // URL des scripts backend depuis les variables d'environnement
  const backendScriptUrl = process.env.NEXT_PUBLIC_BACKEND_SCRIPT_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const [config, setConfig] = useState({
    siteId: '', // Sera récupéré dynamiquement ou généré à la première connexion
    debug: false // Option pour activer les logs de debugging
  });
  
  // Simulation de récupération du siteId de l'utilisateur
  useEffect(() => {
    // Dans une implémentation réelle, ce siteId viendrait de l'API backend
    // Pour cette démo, on utilise un UUID v4 fixe mais qui semble réel
    const userSiteId = '00f08a34-9e6d-437e-acc9-e7d618c2bc74';
    
    setConfig(prev => ({
      ...prev,
      siteId: userSiteId
    }));
  }, []);

  const [copied, setCopied] = useState(false);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    setConfig({
      ...config,
      [name]: checked
    });
  };

  const generateSnippetCode = () => {
    // Construction du snippet avec l'URL backend automatique et le Site ID de l'utilisateur
    return `<!-- FunnelDoctor Tracking Snippet (v2) -->
<script>
  (function(w,d,s){
    var fdLoader=d.createElement(s);
    fdLoader.async=true;
    fdLoader.src="${backendScriptUrl}/funnel-doctor.js"; 
    fdLoader.setAttribute("data-fd-site", "${config.siteId}");
${config.debug ? '    fdLoader.setAttribute("data-debug", "true");' : ''}
    fdLoader.onload = function() {
      var fdBridging = d.createElement(s);
      fdBridging.async = true;
      fdBridging.src = "${backendScriptUrl}/bridging.js";
${config.debug ? '      fdBridging.setAttribute("data-debug", "true");' : ''}
      d.head.appendChild(fdBridging);
    };
    fdLoader.onerror = function() {
      console.error("Erreur critique: Impossible de charger funnel-doctor.js depuis " + "${backendScriptUrl}/funnel-doctor.js");
    };
    d.head.appendChild(fdLoader);
  })(window,document,"script");
</script>
<!-- FunnelDoctor Tracking Snippet - Fin -->`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generateSnippetCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8 flex flex-col">
      {/* Section 1: Titre */}
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-center">Configurer Votre Snippet</h1>
      </header>
      
      {/* Section 2: Grille Paramètres + Snippet (2 panels côte à côte) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Panel Paramètres (1 colonne) */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
          <h2 className="text-xl font-semibold mb-6">Paramètres</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site ID (Non modifiable)</label>
              <input 
                type="text" 
                name="siteId" 
                value={config.siteId} 
                readOnly 
                className="w-full px-4 py-2 border bg-gray-100 rounded-md" 
              />
              <p className="text-xs text-gray-500 mt-1">Identifiant unique généré pour votre compte</p>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="debug" 
                name="debug" 
                checked={config.debug} 
                onChange={handleConfigChange} 
                className="mr-2" 
              />
              <label htmlFor="debug" className="text-sm text-gray-700">Activer les logs de débogage (console)</label>
            </div>
          </div>
        </div>
        
        {/* Panel Snippet (2 colonnes) */}
        <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Votre Snippet</h2>
            <button 
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center text-sm"
              onClick={copyToClipboard}
            >
              {copied ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Copié !
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  Copier le code
                </>
              )}
            </button>
          </div>
          
          <div className="bg-gray-800 text-gray-200 p-4 rounded-md overflow-x-auto h-64 overflow-y-auto">
            <pre><code>{generateSnippetCode()}</code></pre>
          </div>
        </div>
      </div>
      
      {/* Section 3: Panel Instructions (pleine largeur) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-6">Guide d'installation pas à pas</h2>
        
        <div className="space-y-8">
          {/* Étapes d'installation */}
          <div className="space-y-8 mb-8">
            {/* Étape 1 */}
            <div className="flex">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4">
                1
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">Copier le code du snippet</h3>
                <p className="text-gray-600 mb-3">
                  Cliquez sur le bouton "Copier le code" ci-dessus pour copier le snippet dans votre presse-papier.
                </p>
              </div>
            </div>
            
            {/* Étape 2 */}
            <div className="flex">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4">
                2
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">Accéder au code source de votre site</h3>
                <p className="text-gray-600 mb-3">
                  Connectez-vous à votre plateforme web ou ouvrez le code HTML de votre site.
                </p>
                <div className="bg-gray-100 p-4 rounded-md">
                  <h4 className="font-medium mb-2">Instructions spécifiques par plateforme</h4>
                  <ul className="list-disc list-inside space-y-1 text-gray-700">
                    <li><span className="font-medium">WordPress :</span> Allez dans Apparence &gt; Éditeur de thème &gt; header.php</li>
                    <li><span className="font-medium">Shopify :</span> Thème &gt; Actions &gt; Modifier le code &gt; theme.liquid</li>
                    <li><span className="font-medium">Webflow :</span> Pages &gt; Paramètres de la page &gt; Code personnalisé (en-tête)</li>
                    <li><span className="font-medium">ClickFunnels :</span> Page Settings &gt; Tracking Code &gt; Header Code</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Étape 3 */}
            <div className="flex">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4">
                3
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">Coller le code</h3>
                <p className="text-gray-600 mb-3">
                  Collez le code juste avant la balise fermante <code className="bg-gray-100 px-1 py-0.5 rounded">&lt;/head&gt;</code> de votre site.
                </p>
                <div className="bg-gray-800 text-gray-200 p-4 rounded-md overflow-x-auto">
                  <pre><code>&lt;head&gt;
  ... autres balises ...
  
  <span className="text-primary">{`<!-- FunnelDoctor Tracking Code -->
  <script>(function(w,d,s){...})</script>`}</span>
&lt;/head&gt;</code></pre>
                </div>
              </div>
            </div>
            
            {/* Étape 4 */}
            <div className="flex">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4">
                4
              </div>
              <div>
                <h3 className="font-medium text-lg mb-2">Enregistrer et tester</h3>
                <p className="text-gray-600 mb-3">
                  Sauvegardez vos modifications et visitez votre site. Ouvrez la console de votre navigateur (F12) pour vérifier que FunnelDoctor est bien chargé.
                </p>
                <p className="text-sm text-gray-500 italic">
                  Si vous avez activé l'option de débogage, vous verrez des messages détaillés dans la console.
                </p>
              </div>
            </div>
          </div>
          
          {/* Comment fonctionne le tracking */}
          <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-8">
            <h3 className="font-medium text-lg mb-3">Comment fonctionne le tracking</h3>
            <p className="text-gray-600 mb-4">Le snippet installé sur votre site charge deux scripts essentiels :</p>
            <ul className="list-disc list-inside space-y-3 text-gray-700">
              <li>
                <span className="font-medium">funnel-doctor.js</span>
                <p className="mt-1 ml-5 text-sm">Script principal de tracking qui attribue un ID unique à chaque visiteur et suit ses interactions sur votre site.</p>
              </li>
              <li>
                <span className="font-medium">bridging.js</span>
                <p className="mt-1 ml-5 text-sm">Module de stitching qui associe l'ID visiteur aux adresses email lors des opt-ins, permettant de suivre le parcours complet.</p>
              </li>
            </ul>
          </div>
          
          {/* Intégration avec les formulaires */}
          <div className="p-4 bg-blue-50 rounded-md border border-blue-200">
            <h4 className="font-medium text-blue-800 mb-2">Intégration avec les formulaires d'opt-in</h4>
            <p className="text-blue-700 text-sm mb-3">Pour une attribution précise, vos formulaires d'opt-in doivent envoyer le <code>visitorId</code> avec l'email :</p>
            <ol className="list-decimal list-inside space-y-2 text-blue-700">
              <li>Utilisez le webhook <code>{backendScriptUrl}/api/webhooks/optin</code></li>
              <li>Envoyez <code>email</code>, <code>visitorId</code> et <code>apiKey</code> dans la requête</li>
              <li>Le <code>visitorId</code> est automatiquement stocké dans localStorage</li>
            </ol>
            <a href="/tracking/installation" className="inline-block mt-4 text-primary text-sm hover:underline">
              Voir le guide détaillé →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnippetPage;
