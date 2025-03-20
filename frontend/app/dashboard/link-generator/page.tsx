"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function LinkGenerator() {
  const [formData, setFormData] = useState({
    url: 'https://',
    source: 'youtube',
    medium: 'organic',
    campaign: '',
    content: '',
  });
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 10);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const uniqueId = generateUniqueId();
    const utmParams = new URLSearchParams();
    utmParams.append('utm_source', formData.source);
    utmParams.append('utm_medium', formData.medium);
    if (formData.campaign) utmParams.append('utm_campaign', formData.campaign);
    if (formData.content) utmParams.append('utm_content', formData.content);
    utmParams.append('funnelDoctor_id', uniqueId);
    
    const finalUrl = `${formData.url}${formData.url.includes('?') ? '&' : '?'}${utmParams.toString()}`;
    setGeneratedLink(finalUrl);
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="p-6">
      <div className="dashboard-welcome">
        <h2 className="text-2xl font-bold">Create Trackable YouTube Links</h2>
        <p className="text-text-secondary mt-2">Generate links with UTM parameters and unique IDs to track your leads from YouTube.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="card animated-card delay-1">
          <h3 className="text-lg font-bold mb-6">Link Generator</h3>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="url" className="block text-sm font-medium text-text-secondary mb-1">Landing Page URL</label>
                <input
                  type="url"
                  id="url"
                  name="url"
                  value={formData.url}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="https://yourwebsite.com/landing-page"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="source" className="block text-sm font-medium text-text-secondary mb-1">UTM Source</label>
                  <input
                    type="text"
                    id="source"
                    name="source"
                    value={formData.source}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="youtube"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="medium" className="block text-sm font-medium text-text-secondary mb-1">UTM Medium</label>
                  <input
                    type="text"
                    id="medium"
                    name="medium"
                    value={formData.medium}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="organic"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="campaign" className="block text-sm font-medium text-text-secondary mb-1">UTM Campaign</label>
                  <input
                    type="text"
                    id="campaign"
                    name="campaign"
                    value={formData.campaign}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="spring2025"
                  />
                </div>
                
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-text-secondary mb-1">UTM Content</label>
                  <input
                    type="text"
                    id="content"
                    name="content"
                    value={formData.content}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="tutorial-video"
                  />
                </div>
              </div>
              
              <div className="pt-2">
                <button type="submit" className="btn-primary w-full">
                  Generate Link
                </button>
              </div>
            </div>
          </form>
        </div>
        
        <div className="card animated-card delay-2">
          <h3 className="text-lg font-bold mb-6">Generated Link</h3>
          
          {generatedLink ? (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg break-all">
                <p className="font-mono text-sm">{generatedLink}</p>
              </div>
              
              <div className="flex space-x-3">
                <button 
                  onClick={copyToClipboard} 
                  className="btn-secondary flex-1 flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
                
                <a 
                  href={generatedLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn-outline flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                  </svg>
                  Open
                </a>
              </div>
              
              <div>
                <button 
                  className="btn-outline w-full flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                  Save Link
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg flex flex-col items-center justify-center h-64">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-12 h-12 text-gray-400 mb-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              <p className="text-gray-500 text-center">Generate a link to see it here</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-bold mb-4">Saved Links</h3>
        
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Name</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">URL</th>
                <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Created</th>
                <th className="px-6 py-4 text-right text-sm font-medium text-text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">YouTube - March Campaign</td>
                <td className="px-6 py-4 text-sm font-mono text-text-secondary truncate max-w-xs">https://funneldoctor.com?utm_source=youtube&utm_medium=video&utm_campaign=march2025</td>
                <td className="px-6 py-4 text-sm text-text-secondary">2025-03-15</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-primary hover:text-primary-dark mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  </button>
                  <button className="text-red-500 hover:text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">YouTube - Product Demo</td>
                <td className="px-6 py-4 text-sm font-mono text-text-secondary truncate max-w-xs">https://funneldoctor.com?utm_source=youtube&utm_medium=video&utm_campaign=demo&utm_content=full</td>
                <td className="px-6 py-4 text-sm text-text-secondary">2025-03-10</td>
                <td className="px-6 py-4 text-right">
                  <button className="text-primary hover:text-primary-dark mr-3">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                  </button>
                  <button className="text-red-500 hover:text-red-600">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
