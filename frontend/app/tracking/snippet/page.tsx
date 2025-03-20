"use client";

import { useState } from 'react';

const SnippetPage = () => {
  const [config, setConfig] = useState({
    siteId: 'fd-123456',
    utmDays: '30',
    selectors: 'a.cta, button.buy-now',
    autoCapture: true,
    scriptUrl: 'http://localhost:3000/funnel-doctor.js' // URL par défaut pour le développement local
  });

  const [copied, setCopied] = useState(false);

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setConfig({
      ...config,
      [name]: newValue
    });
  };

  const generateSnippetCode = () => {
    return `<!-- FunnelDoctor Tracking Code -->
<script>
  (function(w,d,s,fd){
    var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s);
    j.async=true;
    j.src="${config.scriptUrl}";
    j.setAttribute("data-fd-site", "${config.siteId}");
    j.setAttribute("data-fd-utm-days", "${config.utmDays}");
    j.setAttribute("data-fd-selectors", "${config.selectors}");
    j.setAttribute("data-fd-auto-capture", "${config.autoCapture}");
    f.parentNode.insertBefore(j,f);
  })(window,document,"script");
</script>`;
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
          
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site ID</label>
              <input 
                type="text" 
                name="siteId" 
                value={config.siteId} 
                onChange={handleConfigChange} 
                className="w-full px-4 py-2 border rounded-md" 
              />
              <p className="text-xs text-gray-500 mt-1">Identifiant unique pour votre site</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL du Script</label>
              <input 
                type="text" 
                name="scriptUrl" 
                value={config.scriptUrl} 
                onChange={handleConfigChange} 
                className="w-full px-4 py-2 border rounded-md" 
              />
              <p className="text-xs text-gray-500 mt-1">URL du script FunnelDoctor (en local: http://localhost:3000/funnel-doctor.js)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duru00e9e de ru00e9tention des UTMs</label>
              <select 
                name="utmDays" 
                value={config.utmDays} 
                onChange={handleConfigChange} 
                className="w-full px-4 py-2 border rounded-md"
              >
                <option value="7">7 jours</option>
                <option value="30">30 jours</option>
                <option value="90">90 jours</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Su00e9lecteurs de liens CTA</label>
              <input 
                type="text" 
                name="selectors" 
                value={config.selectors} 
                onChange={handleConfigChange} 
                className="w-full px-4 py-2 border rounded-md" 
              />
              <p className="text-xs text-gray-500 mt-1">Su00e9lecteurs CSS pour vos boutons d'action</p>
            </div>
            
            <div className="flex items-center">
              <input 
                type="checkbox" 
                id="autoCapture" 
                name="autoCapture" 
                checked={config.autoCapture} 
                onChange={handleConfigChange} 
                className="mr-2" 
              />
              <label htmlFor="autoCapture" className="text-sm text-gray-700">Capture automatique des u00e9vu00e9nements</label>
            </div>
            
            <button 
              type="button" 
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark"
              onClick={() => {/* Sauvegarder la configuration */}}
            >
              Mettre u00e0 jour la configuration
            </button>
          </form>
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
              <li>Collez-le juste avant la balise &lt;/head&gt; de votre site ou dans votre outil d'email marketing</li>
              <li>Pour tester avec ConvertKit, utilisez l'URL locale du script (http://localhost:3000/funnel-doctor.js)</li>
              <li>Si ConvertKit ne peut pas accéder à localhost, utilisez un tunnel public (ngrok) et mettez à jour l'URL</li>
            </ol>
            
            <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
              <h4 className="font-medium text-blue-800">Test avec ConvertKit</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-700 mt-2">
                <li>Générez votre snippet avec l'URL de script appropriée</li>
                <li>Dans ConvertKit, ajoutez le snippet en utilisant le bloc HTML ou Script</li>
                <li>Vérifiez que le siteId et les autres paramètres sont correctement configurés</li>
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
