"use client";

import { useState } from 'react';
import Link from 'next/link';

const IntegrationsPage = () => {
  const [activeTab, setActiveTab] = useState('youtube');
  const [isConnectingYoutube, setIsConnectingYoutube] = useState(false);

  const handleConnectYoutube = () => {
    setIsConnectingYoutube(true);
    // Redirection vers l'endpoint backend qui initie le flux OAuth Google
    window.location.href = '/api/auth/youtube/authorize';
    // Note: Le setIsConnectingYoutube(false) n'arrivera jamais car on quitte la page
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
            iClose
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
            <h2 className="text-xl font-semibold">iClose Integration</h2>
            <span className="ml-auto px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">Non connecté</span>
          </div>
          
          <p className="text-gray-600 mb-6">Connectez iClose pour synchroniser vos leads qualifiés et suivre les conversions.</p>
          
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <input type="password" className="w-full px-4 py-2 border rounded-md" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Espace de travail</label>
              <input type="text" className="w-full px-4 py-2 border rounded-md" />
            </div>
            
            <button type="button" className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark">
              Connecter iClose
            </button>
          </form>
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
