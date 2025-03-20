"use client";

import { useState } from 'react';

export default function VideoPerformancePage() {
  const [dateRange, setDateRange] = useState('last30');
  
  // Mock videos data
  const videos = [
    {
      id: 1,
      thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
      title: 'How to Grow Your Business with YouTube',
      publishedDate: '2025-03-01',
      views: 5423,
      clickRate: 3.2,
      leads: 78,
      conversionRate: 1.4,
      earnings: 1240
    },
    {
      id: 2,
      thumbnail: 'https://i.ytimg.com/vi/xvFZjo5PgG0/mqdefault.jpg',
      title: 'Top 5 Marketing Strategies for 2025',
      publishedDate: '2025-02-15',
      views: 12893,
      clickRate: 4.1,
      leads: 184,
      conversionRate: 1.8,
      earnings: 3420
    },
    {
      id: 3,
      thumbnail: 'https://i.ytimg.com/vi/6_b7RDuLwcI/mqdefault.jpg',
      title: 'Content Creation Masterclass',
      publishedDate: '2025-01-22',
      views: 7354,
      clickRate: 2.8,
      leads: 95,
      conversionRate: 1.3,
      earnings: 1680
    },
    {
      id: 4,
      thumbnail: 'https://i.ytimg.com/vi/jNQXAC9IVRw/mqdefault.jpg',
      title: 'SEO Secrets Revealed',
      publishedDate: '2025-01-05',
      views: 9276,
      clickRate: 3.5,
      leads: 132,
      conversionRate: 1.6,
      earnings: 2350
    },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Video Performance</h1>
        <p className="text-text-secondary">Analyze the performance of your YouTube videos and their conversion metrics</p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-2">
          <button 
            className={`tab ${dateRange === 'last7' ? 'active' : ''}`} 
            onClick={() => setDateRange('last7')}
          >
            Last 7 days
          </button>
          <button 
            className={`tab ${dateRange === 'last30' ? 'active' : ''}`} 
            onClick={() => setDateRange('last30')}
          >
            Last 30 days
          </button>
          <button 
            className={`tab ${dateRange === 'last90' ? 'active' : ''}`} 
            onClick={() => setDateRange('last90')}
          >
            Last 90 days
          </button>
          <button 
            className={`tab ${dateRange === 'year' ? 'active' : ''}`} 
            onClick={() => setDateRange('year')}
          >
            This year
          </button>
          <button 
            className={`tab ${dateRange === 'custom' ? 'active' : ''}`} 
            onClick={() => setDateRange('custom')}
          >
            Custom
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input 
              type="text" 
              className="input-field pl-10" 
              placeholder="Search videos..."
            />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <button className="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Video
          </button>
        </div>
      </div>

      {/* Performance summary cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="stats-card">
          <div className="stats-card-header">
            <h3 className="stats-card-title">Total Views</h3>
          </div>
          <div className="stats-card-value">34,946</div>
          <div className="stats-card-change positive">
            <span className="change-value">↑ 12.4%</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-header">
            <h3 className="stats-card-title">Avg. Click Rate</h3>
          </div>
          <div className="stats-card-value">3.5%</div>
          <div className="stats-card-change positive">
            <span className="change-value">↑ 0.8%</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-header">
            <h3 className="stats-card-title">Total Leads</h3>
          </div>
          <div className="stats-card-value">489</div>
          <div className="stats-card-change positive">
            <span className="change-value">↑ 23.5%</span>
          </div>
        </div>

        <div className="stats-card">
          <div className="stats-card-header">
            <h3 className="stats-card-title">Revenue</h3>
          </div>
          <div className="stats-card-value">$8,690</div>
          <div className="stats-card-change positive">
            <span className="change-value">↑ 16.2%</span>
          </div>
        </div>
      </div>

      {/* Videos table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Video</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Published</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Views</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Click Rate</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Leads</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Conv. Rate</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Earnings</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {videos.map((video) => (
              <tr key={video.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-16 h-9 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                      <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                    </div>
                    <span className="font-medium">{video.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-secondary">{video.publishedDate}</td>
                <td className="px-6 py-4 text-text-secondary">{video.views.toLocaleString()}</td>
                <td className="px-6 py-4 text-text-secondary">{video.clickRate}%</td>
                <td className="px-6 py-4 text-text-secondary">{video.leads}</td>
                <td className="px-6 py-4 text-text-secondary">{video.conversionRate}%</td>
                <td className="px-6 py-4 text-text-secondary">${video.earnings}</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-gray-400 hover:text-primary transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
