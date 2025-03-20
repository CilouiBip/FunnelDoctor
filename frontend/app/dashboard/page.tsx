"use client";

import { useState, useEffect } from 'react';
import { getCurrentUser } from '../../lib/services/auth.service';

const StatsCard = ({ title, value, change, changeType }: { title: string, value: string, change: string, changeType: 'positive' | 'negative' }) => {
  return (
    <div className="stats-card animated-card">
      <div className="stats-card-header">
        <h3 className="stats-card-title">{title}</h3>
      </div>
      <div className="stats-card-value">{value}</div>
      <div className={`stats-card-change ${changeType}`}>
        <span className="change-value">{changeType === 'positive' ? '↑' : '↓'} {change}</span>
      </div>
    </div>
  );
};

const FunnelVisualization = () => {
  return (
    <div className="funnel-visualization animated-card delay-2">
      <div className="funnel-header">
        <h3 className="funnel-title">Funnel Visualization</h3>
        
        <div className="tabs">
          <button className="tab active">Funnel</button>
          <button className="tab">Steps</button>
          <button className="tab">Time</button>
        </div>
      </div>
      
      <div className="funnel-stages">
        {/* Étape 1 */}
        <div className="funnel-stage">
          <div className="funnel-stage-bar" style={{ width: '100%' }}>
            <div className="funnel-stage-progress" style={{ width: '100%' }}></div>
          </div>
          <div className="funnel-stage-content">
            <div className="funnel-stage-name">1. YouTube Views</div>
            <div className="funnel-stage-value">2,543</div>
          </div>
        </div>
        
        {/* Étape 2 */}
        <div className="funnel-stage">
          <div className="funnel-stage-bar" style={{ width: '48.9%' }}>
            <div className="funnel-stage-progress" style={{ width: '100%' }}></div>
          </div>
          <div className="funnel-stage-content">
            <div className="funnel-stage-name">2. YouTube Leads</div>
            <div className="funnel-stage-value">1,243</div>
          </div>
          <div className="funnel-stage-alert">48.9% drop</div>
        </div>
        
        {/* Étape 3 */}
        <div className="funnel-stage">
          <div className="funnel-stage-bar" style={{ width: '29.5%' }}>
            <div className="funnel-stage-progress" style={{ width: '100%' }}></div>
          </div>
          <div className="funnel-stage-content">
            <div className="funnel-stage-name">3. Email Opt-ins</div>
            <div className="funnel-stage-value">750</div>
          </div>
          <div className="funnel-stage-alert">39.7% drop</div>
        </div>
        
        {/* Étape 4 */}
        <div className="funnel-stage">
          <div className="funnel-stage-bar" style={{ width: '10.6%' }}>
            <div className="funnel-stage-progress" style={{ width: '100%' }}></div>
          </div>
          <div className="funnel-stage-content">
            <div className="funnel-stage-name">4. Appointments</div>
            <div className="funnel-stage-value">270</div>
          </div>
          <div className="funnel-stage-alert">64% drop</div>
        </div>
        
        {/* Étape 5 */}
        <div className="funnel-stage">
          <div className="funnel-stage-bar" style={{ width: '4.3%' }}>
            <div className="funnel-stage-progress" style={{ width: '100%' }}></div>
          </div>
          <div className="funnel-stage-content">
            <div className="funnel-stage-name">5. Sales</div>
            <div className="funnel-stage-value">110</div>
          </div>
          <div className="funnel-stage-alert">59.3% drop</div>
        </div>
      </div>
    </div>
  );
};

const DiagnosticPanel = () => {
  return (
    <div className="diagnostic-panel animated-card delay-3">
      <h3 className="text-lg font-bold mb-6">Funnel Diagnostic</h3>
      
      <div className="space-y-6">
        <div className="p-4 rounded-lg bg-red-100 border border-red-200">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <h4 className="font-semibold text-red-700 mb-1">High drop-off: YouTube to Leads</h4>
              <p className="text-sm text-red-600">Consider optimizing your CTA in the video description to increase clicks.</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-lg bg-orange-100 border border-orange-200">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div>
              <h4 className="font-semibold text-orange-700 mb-1">Moderate drop-off: Email to Appointments</h4>
              <p className="text-sm text-orange-600">Your email sequence might need improvement. Consider A/B testing subject lines.</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 rounded-lg bg-green-100 border border-green-200">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h4 className="font-semibold text-green-700 mb-1">Good performance: Appointments to Sales</h4>
              <p className="text-sm text-green-600">Your closing process is effective. Continue with your current sales strategy.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const [user, setUser] = useState({ fullName: '', email: '', companyName: '' });
  
  useEffect(() => {
    // Récupération des informations de l'utilisateur connecté
    const loadUserData = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          setUser({
            fullName: currentUser.fullName || 'Utilisateur',
            email: currentUser.email,
            companyName: currentUser.companyName || ''
          });
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des données utilisateur:', error);
      }
    };
    
    loadUserData();
  }, []);
  
  return (
    <div className="p-6">
      <div className="main-content">
        <header className="dashboard-header">
          <div className="flex-1">
            {/* Le bouton pour le sidebar mobile est retiré car géré par le layout */}
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6 text-text-secondary">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">3</span>
            </div>
            
            <div className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-medium mr-2">
                {user.fullName.split(' ').map(name => name[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <span className="font-medium">{user.fullName}</span>
            </div>
          </div>
        </header>
        
        <div className="dashboard-welcome">
          <h2 className="text-2xl font-bold">Hey {user.fullName.split(' ')[0]}, here's your funnel performance</h2>
        </div>
        
        <div className="stats-cards">
          <StatsCard
            title="YouTube Leads"
            value="1,243"
            change="12.5%"
            changeType="positive"
          />
          <StatsCard
            title="Email Opt-ins"
            value="750"
            change="8.3%"
            changeType="positive"
          />
          <StatsCard
            title="Appointments"
            value="270"
            change="5.2%"
            changeType="negative"
          />
          <StatsCard
            title="Sales"
            value="110"
            change="15.8%"
            changeType="positive"
          />
        </div>
        
        <div className="dashboard-content">
          <FunnelVisualization />
          <DiagnosticPanel />
        </div>
      </div>
    </div>
  );
}
