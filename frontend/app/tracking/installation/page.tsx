"use client";

import { useState } from 'react';

const InstallationPage = () => {
  const [url, setUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const verifyInstallation = () => {
    if (!url) return;
    
    setVerificationStatus('loading');
    
    // Simulation d'une vérification (serait remplacé par un appel API réel)
    setTimeout(() => {
      // 50% de chance de succès pour la démo
      const success = Math.random() > 0.5;
      setVerificationStatus(success ? 'success' : 'error');
    }, 1500);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Installation du Snippet</h1>
      <p className="text-gray-600 mb-8">Suivez ces étapes pour installer le script de tracking sur votre site.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Guide d'installation pas à pas</h2>
              
              <div className="space-y-8">
                {/* Étape 1 */}
                <div className="flex">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center font-bold mr-4">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-lg mb-2">Copier le code du snippet</h3>
                    <p className="text-gray-600 mb-3">
                      Rendez-vous sur la page <a href="/tracking/snippet" className="text-primary hover:underline">Configurer Votre Snippet</a> et copiez le code généré.
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
                      Connectez-vous à votre plateforme web (WordPress, Shopify, etc.) ou ouvrez le code HTML de votre site.
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
  <script>(function(w,d,s,fd){...})</script>`}</span>
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
                    <h3 className="font-medium text-lg mb-2">Enregistrer et vérifier</h3>
                    <p className="text-gray-600 mb-3">
                      Sauvegardez vos modifications, puis vérifiez que le snippet est correctement installé en utilisant notre outil ci-contre.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div>
          <div className="bg-white rounded-lg shadow p-6 sticky top-6">
            <h2 className="text-xl font-semibold mb-4">Vérifier l'installation</h2>
            <p className="text-gray-600 mb-4">Entrez l'URL de votre site pour vérifier que le snippet est correctement installé.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL de votre site</label>
                <input 
                  type="url" 
                  placeholder="https://votresite.com" 
                  className="w-full px-4 py-2 border rounded-md"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
              
              <button 
                className="w-full bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark flex items-center justify-center"
                onClick={verifyInstallation}
                disabled={verificationStatus === 'loading'}
              >
                {verificationStatus === 'loading' ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Vérification en cours...
                  </>
                ) : 'Vérifier l\'installation'}
              </button>
              
              {verificationStatus === 'success' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md flex items-start">
                  <svg className="h-5 w-5 text-green-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-green-800">Installation réussie !</p>
                    <p className="text-sm text-green-700">Le snippet est correctement installé sur votre site.</p>
                  </div>
                </div>
              )}
              
              {verificationStatus === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
                  <svg className="h-5 w-5 text-red-500 mt-0.5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium text-red-800">Erreur de vérification</p>
                    <p className="text-sm text-red-700">Le snippet n'a pas été détecté sur votre site. Vérifiez que vous avez bien suivi toutes les étapes d'installation.</p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium mb-2">Outils supplémentaires</h3>
              <div className="mb-4">
                <a
                  href="/tracking/test-wizard"
                  className="inline-flex items-center text-primary hover:text-primary-dark transition-colors font-medium"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
                  </svg>
                  Tester mon installation avec l'assistant guide
                </a>
                <p className="text-sm text-gray-600 mt-1 ml-7">
                  Notre assistant vous guide pas à pas pour valider que tout fonctionne correctement.
                </p>
              </div>
              
              <h3 className="font-medium mb-2">Problèmes courants</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  <span className="font-medium block">Le snippet n'est pas détecté</span>
                  Vérifiez que le code est placé avant la balise &lt;/head&gt; et qu'il n'a pas été modifié.
                </li>
                <li>
                  <span className="font-medium block">Conflit avec d'autres scripts</span>
                  Assurez-vous que le snippet ne soit pas bloqué par un bloqueur de publicités ou un autre script.
                </li>
                <li>
                  <span className="font-medium block">Cache du navigateur</span>
                  Essayez de vider le cache de votre navigateur et de rafraîchir la page.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstallationPage;
