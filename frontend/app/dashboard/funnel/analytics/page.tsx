"use client";

import { useState } from 'react';

const FunnelAnalyticsPage = () => {
  const [dateRange, setDateRange] = useState('last-30-days');
  const [funnelData, setFunnelData] = useState([
    { stage: 'Visites', count: 2478, conversionRate: 100, color: 'bg-blue-500' },
    { stage: 'Leads', count: 743, conversionRate: 30, color: 'bg-indigo-500' },
    { stage: 'Qualifiés', count: 298, conversionRate: 40.1, color: 'bg-purple-500' },
    { stage: 'Démonstrations', count: 149, conversionRate: 50, color: 'bg-violet-500' },
    { stage: 'Négociations', count: 67, conversionRate: 45, color: 'bg-fuchsia-500' },
    { stage: 'Ventes', count: 32, conversionRate: 47.8, color: 'bg-pink-500' },
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Analyse du Funnel</h1>
        
        <div className="flex space-x-2">
          <select 
            className="border rounded-md px-3 py-1.5"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="last-7-days">7 derniers jours</option>
            <option value="last-30-days">30 derniers jours</option>
            <option value="last-90-days">90 derniers jours</option>
            <option value="year-to-date">Année en cours</option>
            <option value="custom">Personnalisé</option>
          </select>
          
          <button className="bg-gray-200 rounded-md px-3 py-1.5 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Exporter
          </button>
        </div>
      </div>
      
      {/* Cards des métriques clés */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Taux de conversion global</div>
          <div className="text-3xl font-bold">{(funnelData[funnelData.length - 1].count / funnelData[0].count * 100).toFixed(1)}%</div>
          <div className="flex items-center mt-2 text-green-600 text-sm">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
            +2.5% vs période précédente
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">CAC (Coût d'Acquisition)</div>
          <div className="text-3xl font-bold">78,20 €</div>
          <div className="flex items-center mt-2 text-red-600 text-sm">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1v-5a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
            </svg>
            +8.4% vs période précédente
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">LTV (Valeur à vie)</div>
          <div className="text-3xl font-bold">1 250 €</div>
          <div className="flex items-center mt-2 text-green-600 text-sm">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
            +12.3% vs période précédente
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Ratio LTV:CAC</div>
          <div className="text-3xl font-bold">16:1</div>
          <div className="flex items-center mt-2 text-green-600 text-sm">
            <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
            </svg>
            +3.8% vs période précédente
          </div>
        </div>
      </div>
      
      {/* Visualisation du funnel */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Visualisation du Funnel</h2>
        
        <div className="relative pt-8 pb-12">
          {funnelData.map((stage, index) => {
            const width = 100 - (index * (70/funnelData.length));
            
            return (
              <div key={stage.stage} className="relative mb-1">
                <div 
                  className={`${stage.color} h-16 mx-auto rounded-sm flex items-center justify-center text-white font-medium relative z-10`}
                  style={{ width: `${width}%` }}
                >
                  {stage.count.toLocaleString()}
                </div>
                
                <div className="absolute left-0 top-1/2 transform -translate-y-1/2 pl-2 font-medium">
                  {stage.stage}
                </div>
                
                {index > 0 && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pr-2 font-medium text-sm text-gray-600">
                    {stage.conversionRate}%
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="absolute left-0 bottom-0 text-sm text-gray-500">
            * Taux de conversion entre étapes consécutives
          </div>
        </div>
      </div>
      
      {/* Tableaux de détails */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">Performances par source</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Visites</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Leads</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">YouTube</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">1,245</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">398</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">32.0%</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Google</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">543</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">187</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">34.4%</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Facebook</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">412</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">98</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">23.8%</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">Direct</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">278</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">60</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">21.6%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="font-semibold">Performances par campagne UTM</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campagne</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Visites</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Conversions</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">youtube_q4_promo</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">687</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">243</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">35.4%</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">blog_seo_traffic</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">421</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">112</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">26.6%</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">newsletter_dec</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">356</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">98</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">27.5%</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap">partner_webinar</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">312</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">87</td>
                  <td className="px-6 py-4 text-right whitespace-nowrap">27.9%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FunnelAnalyticsPage;
