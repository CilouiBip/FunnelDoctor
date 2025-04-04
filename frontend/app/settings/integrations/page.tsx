"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { getCurrentUser, fetchWithAuth } from '@/lib/services/auth.service';
import { toast } from 'react-hot-toast';
import { useYouTubeAuth } from '@/hooks/useYouTubeAuth';

// URL de base de l'API
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const IntegrationsPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('youtube');
  
  // Utilisation du hook useYouTubeAuth pour gérer la connexion YouTube
  const { 
    isConnected: isYoutubeConnected, 
    isLoading: isYoutubeLoading, 
    connect: connectYoutube, 
    disconnect: disconnectYoutube,
    checkConnection: checkYoutubeConnection
  } = useYouTubeAuth();
  
  // États pour la gestion de la clé API
  const [userProfile, setUserProfile] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState(null);
  const [isGeneratingApiKey, setIsGeneratingApiKey] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState('');
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  
  // États pour Stripe
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [isSavingStripeConfig, setIsSavingStripeConfig] = useState(false);
  const [stripeConfigMessage, setStripeConfigMessage] = useState('');
  
  
  // États pour Email Marketing (ActiveCampaign/ConvertKit)
  const [emailMarketingApiKey, setEmailMarketingApiKey] = useState('');
  const [isSavingEmailMarketingConfig, setIsSavingEmailMarketingConfig] = useState(false);
  const [emailMarketingConfigMessage, setEmailMarketingConfigMessage] = useState('');

  // Gestion des paramètres URL pour le retour du callback YouTube
  useEffect(() => {
    const youtubeStatus = searchParams.get('youtube_status');
    const errorMessage = searchParams.get('message');
    
    if (youtubeStatus === 'success') {
      toast.success('Connexion YouTube réussie !');
      // Rafraîchir le statut de connexion
      checkYoutubeConnection();
      // Nettoyer l'URL
      router.replace('/settings/integrations', { scroll: false });
    } else if (youtubeStatus === 'error') {
      toast.error(`Erreur lors de la connexion YouTube: ${errorMessage || 'Veuillez réessayer'}`);
      // Nettoyer l'URL
      router.replace('/settings/integrations', { scroll: false });
    }
  }, [searchParams, router, checkYoutubeConnection]);

  // Récupération du profil utilisateur (incluant la clé API)
  useEffect(() => {
    const fetchUserProfile = async () => {
      setIsLoadingProfile(true);
      setProfileError(null);
      try {
        // Utilisation du service d'authentification pour récupérer le profil utilisateur
        const userData = await getCurrentUser();
        
        if (!userData) {
          throw new Error('Erreur lors de la récupération du profil');
        }
        
        setUserProfile(userData);
      } catch (error) {
        console.error('Erreur lors de la récupération du profil:', error);
        setProfileError(error.message);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    fetchUserProfile();
  }, []);
  
  // Génération d'une nouvelle clé API
  const handleGenerateApiKey = async () => {
    setIsGeneratingApiKey(true);
    setApiKeyMessage('');
    
    try {
      // Utilisation de fetchWithAuth au lieu de fetch direct
      const response = await fetchWithAuth(`${API_URL}/api/users/me/api-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
        // fetchWithAuth ajoutera automatiquement le header Authorization
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la génération de la clé API');
      }
      
      const data = await response.json();
      console.log('[DEBUG] Structure réponse API:', JSON.stringify(data, null, 2));
      
      // Accès à la propriété apiKey imbriquée dans l'objet data.data
      const apiKey = data.data?.apiKey;
      console.log('[DEBUG] Clé API normalisée:', apiKey);
      
      // Mise à jour de userProfile avec la clé API normalisée
      setUserProfile(prev => {
        const updatedProfile = { ...prev, apiKey };
        console.log('[DEBUG] userProfile mis à jour:', updatedProfile);
        return updatedProfile;
      });
      
      setApiKeyMessage('Clé API générée avec succès !');
      // L'alerte a été supprimée pour éviter les problèmes de synchronisation
    } catch (error) {
      console.error('Erreur lors de la génération de la clé API:', error);
      setApiKeyMessage(`Erreur: ${error.message}`);
    } finally {
      setIsGeneratingApiKey(false);
    }
  };
  
  // Copie de la clé API dans le presse-papiers
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
  
  // Sauvegarde de la configuration Stripe
  const handleSaveStripeConfig = async (e) => {
    e.preventDefault();
    setIsSavingStripeConfig(true);
    setStripeConfigMessage('');
    
    try {
      const response = await fetchWithAuth(`${API_URL}/api/integrations/stripe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publishableKey: stripePublishableKey,
          secretKey: stripeSecretKey
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde des clés Stripe');
      }
      
      const data = await response.json();
      console.log('[DEBUG] Réponse configuration Stripe:', data);
      
      setStripeConfigMessage('Configuration Stripe sauvegardée avec succès!');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des clés Stripe:', error);
      setStripeConfigMessage(`Erreur: ${error.message}`);
    } finally {
      setIsSavingStripeConfig(false);
    }
  };
  
  
  // Sauvegarde de la configuration Email Marketing (ActiveCampaign/ConvertKit)
  const handleSaveEmailMarketingConfig = async (e) => {
    e.preventDefault();
    setIsSavingEmailMarketingConfig(true);
    setEmailMarketingConfigMessage('');
    
    try {
      const response = await fetchWithAuth(`${API_URL}/api/integrations/email-marketing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: emailMarketingApiKey,
          type: 'ac' // Valeur par défaut pour ActiveCampaign
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la sauvegarde de la clé API Email Marketing');
      }
      
      const data = await response.json();
      console.log('[DEBUG] Réponse configuration Email Marketing:', data);
      
      setEmailMarketingConfigMessage('Configuration Email Marketing sauvegardée avec succès!');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la clé API Email Marketing:', error);
      setEmailMarketingConfigMessage(`Erreur: ${error.message}`);
    } finally {
      setIsSavingEmailMarketingConfig(false);
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
            className={`px-3 py-2 border-b-2 ${activeTab === 'email_marketing' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} font-medium`}
            onClick={() => setActiveTab('email_marketing')}
          >
            Email Marketing
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
          <button 
            className={`px-3 py-2 border-b-2 ${activeTab === 'stripe' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} font-medium`}
            onClick={() => setActiveTab('stripe')}
          >
            Stripe
          </button>
          <button
            className={`px-3 py-2 border-b-2 ${activeTab === 'calendly' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'} font-medium`}
            onClick={() => setActiveTab('calendly')}
          >
            Calendly
          </button>

        </nav>
      </div>
      
      {/* Panel de contenu */}
      {activeTab === 'youtube' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <img src="/assets/logos/youtube.svg" alt="YouTube" className="h-8 w-8 mr-3" />
            <h2 className="text-xl font-semibold">YouTube Integration</h2>
            {isYoutubeConnected ? (
              <span className="ml-auto px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Connecté</span>
            ) : (
              <span className="ml-auto px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Non connecté</span>
            )}
          </div>
          
          <p className="text-gray-600 mb-6">Connectez votre chaîne YouTube pour suivre les conversions depuis vos vidéos et analyser les performances.</p>
          
          {isYoutubeConnected ? (
            <div className="mt-6">
              <p className="text-gray-700 mb-4">
                Votre compte YouTube est connecté à FunnelDoctor. Vous pouvez désormais suivre les conversions
                depuis vos vidéos YouTube et analyser leurs performances.
              </p>
              
              <button 
                type="button" 
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px]"
                onClick={disconnectYoutube}
                disabled={isYoutubeLoading}
              >
                {isYoutubeLoading ? 'Chargement...' : 'Déconnecter YouTube'}
              </button>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-gray-700 mb-4">
                En connectant votre compte YouTube, vous permettez à FunnelDoctor d'accéder à vos données vidéo
                pour analyser les performances et suivre les conversions.
              </p>
              
              <button 
                type="button" 
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px]"
                onClick={connectYoutube}
                disabled={isYoutubeLoading}
              >
                {isYoutubeLoading ? 'Chargement...' : 'Connecter YouTube'}
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'email_marketing' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 mr-3 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Intégration Email Marketing (ActiveCampaign/ConvertKit)</h2>
            {userProfile?.integrations?.emailMarketingConnected && (
              <span className="ml-auto px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Connecté</span>
            )}
            {!userProfile?.integrations?.emailMarketingConnected && (
              <span className="ml-auto px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Non connecté</span>
            )}
          </div>
          
          <p className="text-gray-600 mb-6">
            Connectez votre plateforme d'email marketing (ActiveCampaign ou ConvertKit) pour synchroniser vos leads 
            et automatiser vos campagnes d'emails.
          </p>
          
          <form onSubmit={handleSaveEmailMarketingConfig} className="space-y-4 mb-6">
            <div>
              <label htmlFor="emailMarketingApiKey" className="block text-sm font-medium text-gray-700 mb-1">
                Clé API (ActiveCampaign ou ConvertKit)
              </label>
              <input
                id="emailMarketingApiKey"
                type="password"
                value={emailMarketingApiKey}
                onChange={(e) => setEmailMarketingApiKey(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
                placeholder="Votre clé API..."
                required
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSavingEmailMarketingConfig}
              >
                {isSavingEmailMarketingConfig ? 'Sauvegarde en cours...' : 'Enregistrer la clé API'}
              </button>
              
              {emailMarketingConfigMessage && (
                <p className={`mt-2 text-sm ${emailMarketingConfigMessage.includes('Erreur') ? 'text-red-500' : 'text-green-500'}`}>
                  {emailMarketingConfigMessage}
                </p>
              )}
            </div>
          </form>
          
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 text-sm">
            <strong>Comment obtenir votre clé API :</strong>
            <div className="mt-2 space-y-3">
              <div>
                <strong>Pour ActiveCampaign :</strong>
                <ol className="list-decimal ml-5 mt-1 space-y-1">
                  <li>Connectez-vous à votre compte ActiveCampaign</li>
                  <li>Accédez à <strong>Paramètres &gt; Développeur</strong></li>
                  <li>Copiez votre API Key sous "Developer API Key"</li>
                </ol>
              </div>
              
              <div>
                <strong>Pour ConvertKit :</strong>
                <ol className="list-decimal ml-5 mt-1 space-y-1">
                  <li>Connectez-vous à votre compte ConvertKit</li>
                  <li>Accédez à <strong>Paramètres &gt; API</strong></li>
                  <li>Copiez votre API Secret (ou créez-en un nouveau si nécessaire)</li>
                </ol>
              </div>
            </div>
          </div>
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
                    <div className="flex flex-col space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="font-medium text-gray-700">Votre clé API:</label>
                        <button 
                          onClick={handleCopyApiKey}
                          className="text-primary hover:text-primary-dark flex items-center"
                          title="Copier la clé API"
                        >
                          {apiKeyCopied ? 'Copié!' : 'Copier'} 
                          <span className="ml-1">
                            {apiKeyCopied ? (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                              </svg>
                            )}
                          </span>
                        </button>
                      </div>
                      
                      <div className="bg-green-50 border-2 border-green-300 p-4 rounded-md font-mono text-base break-all shadow-sm">
                        <span className="block text-center font-bold mb-2 text-green-700">Votre clé API</span>
                        <div className="bg-white p-3 rounded border border-green-200 select-all">
                          {userProfile.apiKey}
                        </div>
                        <p className="text-xs text-center mt-2 text-green-700">Cliquez sur la clé pour la sélectionner entièrement</p>
                      </div>
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
                  href="https://zapier.com/shared/1b042e01c510682165d66e5cb763182da9676c74" 
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
      
      {activeTab === 'calendly' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 mr-3 bg-blue-500 rounded-full"></div> {/* Placeholder Icône */}
            <h2 className="text-xl font-semibold">Intégration Calendly</h2>
            <span className="ml-auto px-2 py-1 bg-gray-200 text-gray-800 rounded-full text-xs">Statut Indisponible</span>
          </div>
          <p className="text-gray-600 mb-6">Connectez votre compte Calendly via OAuth2 pour synchroniser vos rendez-vous.</p>
          {/* Le bouton Connecter/Déconnecter sera ajouté ici lors de l'implémentation OAuth2 */}
          <div className="mt-4 p-4 border rounded bg-gray-50 text-center text-gray-500">
            Logique de connexion OAuth2 à venir...
          </div>
        </div>
      )}

      {activeTab === 'stripe' && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <div className="h-8 w-8 mr-3 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Intégration Stripe</h2>
            {userProfile?.integrations?.stripeConnected && (
              <span className="ml-auto px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Connecté</span>
            )}
            {!userProfile?.integrations?.stripeConnected && (
              <span className="ml-auto px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Non connecté</span>
            )}
          </div>
          
          <p className="text-gray-600 mb-6">
            Connectez votre compte Stripe pour traiter les paiements et suivre les conversions financières de vos leads.
          </p>
          
          <form onSubmit={handleSaveStripeConfig} className="space-y-4 mb-6">
            <div>
              <label htmlFor="stripePublishableKey" className="block text-sm font-medium text-gray-700 mb-1">
                Clé Publique Stripe (Publishable Key)
              </label>
              <input
                id="stripePublishableKey"
                type="text"
                value={stripePublishableKey}
                onChange={(e) => setStripePublishableKey(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
                placeholder="pk_test_..."
                required
              />
            </div>
            
            <div>
              <label htmlFor="stripeSecretKey" className="block text-sm font-medium text-gray-700 mb-1">
                Clé Secrète Stripe (Secret Key)
              </label>
              <input
                id="stripeSecretKey"
                type="password"
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:ring-primary focus:border-primary"
                placeholder="sk_test_..."
                required
              />
            </div>
            
            <div>
              <button
                type="submit"
                className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSavingStripeConfig}
              >
                {isSavingStripeConfig ? 'Sauvegarde en cours...' : 'Enregistrer les clés Stripe'}
              </button>
              
              {stripeConfigMessage && (
                <p className={`mt-2 text-sm ${stripeConfigMessage.includes('Erreur') ? 'text-red-500' : 'text-green-500'}`}>
                  {stripeConfigMessage}
                </p>
              )}
            </div>
          </form>
          
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-md text-amber-800 text-sm">
            <strong>Important :</strong> Vos clés Stripe sont chiffrées et stockées de manière sécurisée. 
            Ne partagez jamais vos clés secrètes Stripe avec un tiers.
          </div>
        </div>
      )}
      

    </div>
  );
};

export default IntegrationsPage;
