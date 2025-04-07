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



          {/* Other tabs content can be added here */}
        </div>
      </div>
    </div>
  );
}
