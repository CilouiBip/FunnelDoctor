"use client";

import { useState, useEffect } from 'react';
import { getCurrentUser } from '../../../lib/services/auth.service';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [browserNotifications, setBrowserNotifications] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [user, setUser] = useState({ fullName: '', email: '', companyName: '' });
  const [formData, setFormData] = useState({ fullName: '', email: '', companyName: '' });

  useEffect(() => {
    // Récupération des informations de l'utilisateur connecté
    const loadUserData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const userData = {
            fullName: currentUser.fullName || '',
            email: currentUser.email || '',
            companyName: currentUser.companyName || ''
          };
          setUser(userData);
          setFormData(userData);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error);
      }
    };
    
    loadUserData();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Settings</h1>
        <p className="text-text-secondary">Manage your account, integrations, and preferences</p>
      </div>

      <div className="flex">
        <div className="w-64 mr-10">
          <div className="space-y-1">
            <button 
              className={`flex items-center w-full px-4 py-3 rounded-lg text-left ${activeTab === 'account' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-gray-100'} transition-colors`}
              onClick={() => setActiveTab('account')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Account
            </button>

            <button 
              className={`flex items-center w-full px-4 py-3 rounded-lg text-left ${activeTab === 'integrations' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-gray-100'} transition-colors`}
              onClick={() => setActiveTab('integrations')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.39 48.39 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.96.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
              </svg>
              Integrations
            </button>

            <button 
              className={`flex items-center w-full px-4 py-3 rounded-lg text-left ${activeTab === 'api' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-gray-100'} transition-colors`}
              onClick={() => setActiveTab('api')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L16.5 12l-2.25 2.25m-4.5 0L7.5 12l2.25-2.25M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
              </svg>
              API Access
            </button>

            <button 
              className={`flex items-center w-full px-4 py-3 rounded-lg text-left ${activeTab === 'notifications' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-gray-100'} transition-colors`}
              onClick={() => setActiveTab('notifications')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              Notifications
            </button>

            <button 
              className={`flex items-center w-full px-4 py-3 rounded-lg text-left ${activeTab === 'billing' ? 'bg-primary/10 text-primary' : 'text-text-secondary hover:bg-gray-100'} transition-colors`}
              onClick={() => setActiveTab('billing')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
              Billing
            </button>
          </div>
        </div>

        <div className="flex-1">
          {activeTab === 'account' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6">Account Information</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Nom complet</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Votre nom complet" 
                    value={formData.fullName}
                    onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Adresse email</label>
                  <input 
                    type="email" 
                    className="input-field" 
                    placeholder="votre@email.com" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    disabled // L'email ne peut pas être modifié ici
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">Entreprise <span className="text-gray-400 text-xs">(optionnel)</span></label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Votre entreprise" 
                    value={formData.companyName}
                    onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Change Password</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">Current Password</label>
                      <input type="password" className="input-field" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">New Password</label>
                      <input type="password" className="input-field" />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-text-secondary mb-2">Confirm New Password</label>
                      <input type="password" className="input-field" />
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <button 
                    className="btn-primary"
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Implémenter la mise u00e0 jour des informations utilisateur
                      alert('Fonctionnalité non implémentée. Les données seraient envoyées au serveur ici.');
                    }}
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6">Notification Settings</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Enable Notifications</h3>
                    <p className="text-sm text-text-secondary mt-1">Receive notifications about new leads and conversions</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      id="notifications" 
                      className="toggle-checkbox" 
                      checked={notificationsEnabled} 
                      onChange={() => setNotificationsEnabled(!notificationsEnabled)} 
                    />
                    <label htmlFor="notifications" className="toggle-label"></label>
                  </div>
                </div>
                
                {notificationsEnabled && (
                  <div className="pl-6 border-l-2 border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Email Notifications</h3>
                        <p className="text-sm text-text-secondary mt-1">Receive notifications via email</p>
                      </div>
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          id="email-notifications" 
                          className="toggle-checkbox" 
                          checked={emailNotifications} 
                          onChange={() => setEmailNotifications(!emailNotifications)} 
                        />
                        <label htmlFor="email-notifications" className="toggle-label"></label>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Browser Notifications</h3>
                        <p className="text-sm text-text-secondary mt-1">Receive push notifications in your browser</p>
                      </div>
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          id="browser-notifications" 
                          className="toggle-checkbox" 
                          checked={browserNotifications} 
                          onChange={() => setBrowserNotifications(!browserNotifications)} 
                        />
                        <label htmlFor="browser-notifications" className="toggle-label"></label>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Dark Mode</h3>
                    <p className="text-sm text-text-secondary mt-1">Switch between light and dark mode</p>
                  </div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      id="dark-mode" 
                      className="toggle-checkbox" 
                      checked={darkMode} 
                      onChange={() => setDarkMode(!darkMode)} 
                    />
                    <label htmlFor="dark-mode" className="toggle-label"></label>
                  </div>
                </div>
                
                <div className="pt-2">
                  <button className="btn-primary">Save Preferences</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'integrations' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-xl font-bold mb-6">Integrations</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-red-500">
                        <path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0016.5 9h-1.875a1.875 1.875 0 01-1.875-1.875V5.25A3.75 3.75 0 009 1.5H5.625z" />
                        <path d="M12.971 1.816A5.23 5.23 0 0114.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 013.434 1.279 9.768 9.768 0 00-6.963-6.963z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">YouTube Analytics</h3>
                      <p className="text-sm text-text-secondary">Connect your YouTube account to import video analytics</p>
                    </div>
                  </div>
                  <button className="btn-secondary">Connect</button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-blue-500">
                        <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">HubSpot CRM</h3>
                      <p className="text-sm text-text-secondary">Sync leads with your HubSpot CRM</p>
                    </div>
                  </div>
                  <button className="btn-secondary">Connect</button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-green-500">
                        <path d="M4.913 2.658c2.075-.27 4.19-.408 6.337-.408 2.147 0 4.262.139 6.337.408 1.922.25 3.291 1.861 3.405 3.727a4.403 4.403 0 00-1.032-.211 50.89 50.89 0 00-8.42 0c-2.358.196-4.04 2.19-4.04 4.434v4.286a4.47 4.47 0 002.433 3.984L7.28 21.53A.75.75 0 016 21v-4.03a48.527 48.527 0 01-1.087-.128C2.905 16.58 1.5 14.833 1.5 12.862V6.638c0-1.97 1.405-3.718 3.413-3.979z" />
                        <path d="M15.75 7.5c-1.376 0-2.739.057-4.086.169C10.124 7.797 9 9.103 9 10.609v4.285c0 1.507 1.128 2.814 2.67 2.94 1.243.102 2.5.157 3.768.165l2.782 2.781a.75.75 0 001.28-.53v-2.39l.33-.026c1.542-.125 2.67-1.433 2.67-2.94v-4.286c0-1.505-1.125-2.811-2.664-2.94A49.392 49.392 0 0015.75 7.5z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">Slack</h3>
                      <p className="text-sm text-text-secondary">Receive notifications in your Slack workspace</p>
                    </div>
                  </div>
                  <button className="btn-secondary">Connect</button>
                </div>

                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:border-primary/30 hover:bg-primary/5 transition-all">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-purple-500">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-2.625 6c-.54 0-.828.419-.936.634a1.96 1.96 0 00-.189.866c0 .298.059.605.189.866.108.215.395.634.936.634.54 0 .828-.419.936-.634.13-.26.189-.568.189-.866 0-.298-.059-.605-.189-.866-.108-.215-.395-.634-.936-.634zm4.314.634c.108-.215.395-.634.936-.634.54 0 .828.419.936.634.13.26.189.568.189.866 0 .298-.059.605-.189.866-.108.215-.395.634-.936.634-.54 0-.828-.419-.936-.634a1.96 1.96 0 01-.189-.866c0-.298.059-.605.189-.866zm2.023 6.828a.75.75 0 10-1.06-1.06 3.75 3.75 0 01-5.304 0 .75.75 0 00-1.06 1.06 5.25 5.25 0 007.424 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-medium">Zapier</h3>
                      <p className="text-sm text-text-secondary">Connect with 5,000+ apps via Zapier</p>
                    </div>
                  </div>
                  <button className="btn-secondary">Connect</button>
                </div>
              </div>
            </div>
          )}

          {/* Other tabs content can be added here */}
        </div>
      </div>
    </div>
  );
}
