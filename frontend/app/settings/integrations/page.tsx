"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState('youtube');
  const [isConnectingYoutube, setIsConnectingYoutube] = useState(false);
  
  // u00c9tats pour la gestion de la clu00e9 API
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState('');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);

  const handleConnectYoutube = () => {
    setIsConnectingYoutube(true);
    // Redirection vers l'endpoint backend qui initie le flux OAuth Google
    window.location.href = '/api/auth/youtube/authorize';
    // Note: Le setIsConnectingYoutube(false) n'arrivera jamais car on quitte la page
  };

  // Ru00e9cupu00e9ration du profil utilisateur (incluant la clu00e9 API)
  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError(null);
      try {
        const response = await fetch('/api/users/me', {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Pour inclure les cookies d'authentification
        });
        
        if (!response.ok) {
          throw new Error('Erreur lors de la ru00e9cupu00e9ration du profil');
        }
        
        const data = await response.json();
        setUserProfile(data);
      } catch (error) {
        console.error('Erreur lors de la ru00e9cupu00e9ration du profil:', error);
        setProfileError(error.message);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    fetchUserProfile();
  }, []);
  
  // Gu00e9nu00e9ration d'une nouvelle clu00e9 API
  const handleGenerateApiKey = async () => {
    setIsGeneratingApiKey(true);
    setApiKeyMessage('');
    
    try {
      const response = await fetch('/api/users/me/api-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la gu00e9nu00e9ration de la clu00e9 API');
      }
      
      const data = await response.json();
      setUserProfile(prev => ({
        ...prev,
        apiKey: data.apiKey
      }));
      setApiKeyMessage('Clu00e9 API gu00e9nu00e9ru00e9e avec succu00e8s !');
    } catch (error) {
      console.error('Erreur lors de la gu00e9nu00e9ration de la clu00e9 API:', error);
      setApiKeyMessage(`Erreur: ${error.message}`);
    } finally {
      setIsGeneratingApiKey(false);
    }
  };
  
  // Copie de la clu00e9 API dans le presse-papiers
  const handleCopyApiKey = () => {
    if (userProfile?.apiKey) {
      navigator.clipboard.writeText(userProfile.apiKey)
        .then(() => {
          setApiKeyCopied(true);
          setTimeout(() => setApiKeyCopied(false), 2000);
        })
        .catch(err => {
          console.error('Erreur lors de la copie:', err);
        });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Intégrations</h1>
      
      {/* Onglets */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button 
            className={`px-3 py-2 border-b-2 ${activeTab === 'youtube' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} font-medium`}
            onClick={() => setActiveTab('youtube')}
          >
            YouTube
          </button>
          <button 
            className={`px-3 py-2 border-b-2 ${activeTab === 'activecampaign' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} font-medium`}
            onClick={() => setActiveTab('activecampaign')}
          >
            ActiveCampaign
          </button>
          <button 
            className={`px-3 py-2 border-b-2 ${activeTab === 'iclose' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} font-medium`}
            onClick={() => setActiveTab('iclose')}
          >
            iClosed
          </button>
          <button 
            className={`px-3 py-2 border-b-2 ${activeTab === 'webhooks' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} font-medium`}
            onClick={() => setActiveTab('webhooks')}
          >
            Webhooks
          </button>
        </nav>
      </div>
      
      {/* Panel de contenu */}
      {activeTab === 'youtube' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <img src="/assets/logos/youtube.svg" alt="YouTube" className="h-8 w-8 mr-3" />
            <h2 className="text-xl font-semibold">YouTube Integration</h2>
            <span className="ml-auto px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Non connecté</span>
          </div>
          
          <p className="text-gray-600 mb-6">Connectez votre chaîne YouTube pour suivre les conversions depuis vos vidéos.</p>
          
          <div className="mt-6">
            <p className="text-gray-700 mb-4">
              En connectant votre compte YouTube, vous permettez à FunnelDoctor d'accéder à vos données vidéo
              pour analyser les performances et suivre les conversions.
            </p>
            
            <button 
              type="button" 
              className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px]"
              onClick={handleConnectYoutube}
              disabled={isConnectingYoutube}
            >
              {isConnectingYoutube ? 'Redirection...' : 'Connecter YouTube'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'activecampaign' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 mr-3 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">AC</div>
            <h2 className="text-xl font-semibold">ActiveCampaign Integration</h2>
            <span className="ml-auto px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Non connecté</span>
          </div>
          
          <p className="text-gray-600 mb-6">Connectez ActiveCampaign pour synchroniser vos leads et automatiser vos emails.</p>
          
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API URL</label>
              <input type="text" className="w-full px-4 py-2 border rounded-md" placeholder="https://youraccountname.api-us1.com" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input type="password" className="w-full px-4 py-2 border rounded-md" />
            </div>
            
            <button type="button" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark">
              Connecter ActiveCampaign
            </button>
          </form>
        </div>
      )}

      {activeTab === 'iclose' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 mr-3 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">IC</div>
            <h2 className="text-xl font-semibold">iClosed Integration (via Zapier)</h2>
          </div>
          
          <p className="text-gray-600 mb-6">Connectez iClosed pour suivre les rendez-vous et conversions de vos leads qualifiés.</p>
          
          {/* Section Clé API FunnelDoctor */}
          <div className="mb-8 border-b pb-6">
            <h3 className="font-semibold text-lg mb-4">Votre Clé API FunnelDoctor</h3>
            
            {isLoadingProfile ? (
              <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-4 py-1">
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              </div>
            ) : profileError ? (
              <div className="text-red-500 mb-4">
                Erreur de chargement: {profileError}
              </div>
            ) : (
              <>
                <div className="bg-gray-50 p-4 rounded-md mb-4">
                  {userProfile?.apiKey ? (
                    <div className="flex items-center">
                      <code className="font-mono text-sm break-all flex-grow">{userProfile.apiKey}</code>
                      <button 
                        onClick={handleCopyApiKey}
                        className="ml-2 text-primary hover:text-primary-dark"
                        title="Copier la clé API"
                      >
                        {apiKeyCopied ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ) : (
                    <p className="text-gray-600">Aucune clé API générée. Cliquez sur le bouton ci-dessous pour en créer une.</p>
                  )}
                </div>

                <div className="flex flex-col space-y-4">
                  <button 
                    type="button" 
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed w-fit"
                    onClick={handleGenerateApiKey}
                    disabled={isGeneratingApiKey}
                  >
                    {isGeneratingApiKey ? 'Génération en cours...' : userProfile?.apiKey ? 'Régénérer la clé API' : 'Générer une clé API'}
                  </button>
                  
                  {apiKeyMessage && (
                    <p className={`text-sm ${apiKeyMessage.includes('Erreur') ? 'text-red-500' : 'text-green-500'}`}>
                      {apiKeyMessage}
                    </p>
                  )}
                  
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 text-sm">
                    <strong>Important :</strong> Cette clé API est secrète et vous permet d'identifier vos webhooks. Ne la partagez pas publiquement.
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Section intégration iClosed via Zapier */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Intégration iClosed via Zapier</h3>
            
            <div className="space-y-4">
              <p className="text-gray-700">
                Pour connecter iClosed, FunnelDoctor utilise un template Zapier qui permet d'envoyer automatiquement les données des rendez-vous pris sur iClosed vers votre compte FunnelDoctor.
              </p>
              
              <ol className="list-decimal pl-5 space-y-2 text-gray-700">
                <li>Cliquez sur le bouton ci-dessous pour accéder au template Zapier et activez-le sur votre compte</li>
                <li>Lors de la configuration de l'action <strong>Webhook POST</strong> dans Zapier, copiez votre Clé API FunnelDoctor (affichée ci-dessus) et collez-la dans le champ <code className="bg-gray-100 px-1 py-0.5 rounded">apiKey</code> des données du webhook</li>
                <li>Testez la connexion pour vérifier que tout fonctionne correctement</li>
              </ol>
              
              <div className="pt-4">
                <a 
                  href="#zapier-template-link" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 mr-2">
                    <path fillRule="evenodd" d="M12 1.5a.75.75 0 01.75.75V4.5a.75.75 0 01-1.5 0V2.25A.75.75 0 0112 1.5zM5.636 4.136a.75.75 0 011.06 0l1.592 1.591a.75.75 0 01-1.061 1.06l-1.591-1.59a.75.75 0 010-1.061zm12.728 0a.75.75 0 010 1.06l-1.591 1.592a.75.75 0 01-1.06-1.061l1.59-1.591a.75.75 0 011.061 0zm-6.816 4.496a.75.75 0 01.82.311l5.228 7.917a.75.75 0 01-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 01-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 01-1.247-.606l.569-9.47a.75.75 0 01.554-.68zM3 10.5a.75.75 0 01.75-.75H6a.75.75 0 010 1.5H3.75A.75.75 0 013 10.5zm14.25 0a.75.75 0 01.75-.75h2.25a.75.75 0 010 1.5H18a.75.75 0 01-.75-.75zm-8.962 3.712a.75.75 0 010 1.061l-1.591 1.591a.75.75 0 11-1.061-1.06l1.591-1.592a.75.75 0 011.06 0z" clipRule="evenodd" />
                  </svg>
                  Accéder au Template Zapier iClosed
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'webhooks' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 mr-3 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Webhooks</h2>
          </div>
          
          <p className="text-gray-600 mb-6">Configurez des webhooks pour intégrer FunnelDoctor avec d'autres services.</p>
          
          <div className="border rounded-md p-4 mb-6">
            <h3 className="font-medium mb-2">URL du Webhook entrant</h3>
            <div className="flex items-center">
              <code className="bg-gray-100 p-2 rounded flex-grow font-mono text-sm">https://app.funneldoctor.io/api/webhooks/YOUR_API_KEY</code>
              <button type="button" className="ml-2 text-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                </svg>
              </button>
            </div>
          </div>
          
          <div>
            <h3 className="font-medium mb-2">Webhooks sortants</h3>
            <button type="button" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark">
              Ajouter un webhook sortant
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsPage;
