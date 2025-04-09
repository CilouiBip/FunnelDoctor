"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

const SnippetPage = () => {
  // URL de l'API backend depuis les variables d'environnement
  const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  const { data: session } = useSession();
  
  const [config, setConfig] = useState({
    siteId: '', // Sera récupéré dynamiquement ou généré à la première connexion
    debug: false, // Option pour activer les logs de debugging
    scriptUrl: backendUrl // URL du backend pour charger les scripts
  });
  
  // Simulation de récupération du siteId de l'utilisateur
  useEffect(() => {
    // Dans une implémentation réelle, ce siteId viendrait de l'API backend
    // Pour cette démo, on utilise un UUID v4 fixe mais qui semble réel
    const userSiteId = session?.user?.id || '00f08a34-9e6d-437e-acc9-e7d618c2bc74';
    
    setConfig(prev => ({
      ...prev,
      siteId: userSiteId
    }));
  }, [session]);

  const [copied, setCopied] = useState(false);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    
    setConfig({
      ...config,
      [name]: checked
    });
  };

  const generateSnippetCode = () => {
    return `<!-- FunnelDoctor Tracking Snippet (v2) -->
<script>
  (function(w,d,s){
    var fdLoader=d.createElement(s);
    fdLoader.async=true;
    fdLoader.src="${config.scriptUrl}/funnel-doctor.js"; 
    fdLoader.setAttribute("data-fd-site", "${config.siteId}");
    ${config.debug ? '    fdLoader.setAttribute("data-debug", "true");
' : ''}
    fdLoader.onload = function() {
      var fdBridging = d.createElement(s);
      fdBridging.async = true;
      fdBridging.src = "${config.scriptUrl}/bridging.js";
      ${config.debug ? '      fdBridging.setAttribute("data-debug", "true");
' : ''}
      d.head.appendChild(fdBridging);
    };
    fdLoader.onerror = function() {
      console.error("Erreur critique: Impossible de charger funnel-doctor.js depuis ${config.scriptUrl}/funnel-doctor.js");
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
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Configurer Votre Snippet</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Partie Gauche: Configuration */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Paramu00e8tres</h2>
          
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
              <p className="text-xs text-gray-500 mt-1">Votre identifiant unique automatiquement généré pour votre compte</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL du Serveur Backend</label>
              <input 
                type="text" 
                name="scriptUrl" 
                value={config.scriptUrl} 
                readOnly 
                className="w-full px-4 py-2 border bg-gray-100 rounded-md" 
              />
              <p className="text-xs text-gray-500 mt-1">URL du serveur FunnelDoctor (configuré automatiquement)</p>
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
        
        {/* Partie Droite: Code & Instructions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Votre Snippet</h2>
          
          <div className="bg-gray-800 text-gray-200 p-4 rounded-md mb-4 overflow-x-auto">
            <pre><code>{generateSnippetCode()}</code></pre>
          </div>
          
          <button 
            className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 mb-6 flex items-center justify-center"
            onClick={copyToClipboard}
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copiu00e9 !
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copier le code
              </>
            )}
          </button>
          
          <div className="border-t pt-4">
            <h3 className="font-medium text-lg mb-2">Instructions d'installation</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Copiez le code ci-dessus</li>
              <li>Collez-le juste avant la balise &lt;/head&gt; de votre site</li>
              <li>Le snippet chargera deux scripts :
                <ul className="list-disc list-inside ml-5 mt-1">
                  <li><code>funnel-doctor.js</code> : Script principal de tracking</li>
                  <li><code>bridging.js</code> : Module de stitching qui associe visitor_id et email</li>
                </ul>
              </li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
              <h4 className="font-medium text-blue-800">Intégration avec les formulaires d'opt-in</h4>
              <p className="text-blue-700 text-sm mt-1">Pour une attribution précise, assurez-vous que vos formulaires d'opt-in envoient le <code>visitorId</code> avec l'email au webhook :</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700 mt-2">
                <li>Utilisez le webhook <code>{config.scriptUrl}/api/webhooks/optin</code></li>
                <li>Envoyez <code>email</code>, <code>visitorId</code> et <code>apiKey</code> dans la requête</li>
                <li>Le <code>visitorId</code> est automatiquement stocké par le script dans localStorage</li>
              </ol>
            </div>
            
            <a href="/tracking/installation" className="inline-block mt-4 text-primary hover:underline">
              Voir le guide détaillé →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnippetPage;
