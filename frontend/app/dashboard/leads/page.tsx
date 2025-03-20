"use client";

import { useState } from 'react';

export default function LeadsPage() {
  const [leads, setLeads] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', source: 'YouTube - Growth Strategies', date: '2025-03-15', status: 'new' },
    { id: 2, name: 'Alice Smith', email: 'alice@example.com', source: 'YouTube - SEO Tips', date: '2025-03-14', status: 'contacted' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', source: 'YouTube - Marketing Mastery', date: '2025-03-12', status: 'qualified' },
    { id: 4, name: 'Emma Wilson', email: 'emma@example.com', source: 'YouTube - Content Creation', date: '2025-03-10', status: 'customer' },
    { id: 5, name: 'Michael Brown', email: 'michael@example.com', source: 'YouTube - YouTube Strategy', date: '2025-03-08', status: 'lost' },
  ]);

  const [filter, setFilter] = useState('all');

  const filteredLeads = filter === 'all' 
    ? leads 
    : leads.filter(lead => lead.status === filter);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Leads</h1>
        <p className="text-text-secondary">Manage and track all your leads from YouTube videos</p>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-2">
          <button 
            className={`tab ${filter === 'all' ? 'active' : ''}`} 
            onClick={() => setFilter('all')}
          >
            All Leads
          </button>
          <button 
            className={`tab ${filter === 'new' ? 'active' : ''}`} 
            onClick={() => setFilter('new')}
          >
            New
          </button>
          <button 
            className={`tab ${filter === 'contacted' ? 'active' : ''}`} 
            onClick={() => setFilter('contacted')}
          >
            Contacted
          </button>
          <button 
            className={`tab ${filter === 'qualified' ? 'active' : ''}`} 
            onClick={() => setFilter('qualified')}
          >
            Qualified
          </button>
          <button 
            className={`tab ${filter === 'customer' ? 'active' : ''}`} 
            onClick={() => setFilter('customer')}
          >
            Customers
          </button>
          <button 
            className={`tab ${filter === 'lost' ? 'active' : ''}`} 
            onClick={() => setFilter('lost')}
          >
            Lost
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <input 
              type="text" 
              className="input-field pl-10" 
              placeholder="Search leads..."
            />
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <button className="btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 mr-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Lead
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">
                <div className="flex items-center">
                  <input type="checkbox" className="mr-3" />
                  Name
                </div>
              </th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Email</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Source</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Date</th>
              <th className="px-6 py-4 text-left text-sm font-medium text-text-secondary">Status</th>
              <th className="px-6 py-4 text-right text-sm font-medium text-text-secondary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => (
              <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <input type="checkbox" className="mr-3" />
                    <span className="font-medium">{lead.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-text-secondary">{lead.email}</td>
                <td className="px-6 py-4 text-text-secondary">{lead.source}</td>
                <td className="px-6 py-4 text-text-secondary">{lead.date}</td>
                <td className="px-6 py-4">
                  <span className={`badge badge-${lead.status}`}>
                    {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                  </span>
                </td>
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
