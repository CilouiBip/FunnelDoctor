"use client";

import React from 'react';
import { FunnelStepsEditor } from '../../../components/dashboard/FunnelStepsEditor';
import { FunnelStats } from '../../../components/dashboard/FunnelStats';

export default function FunnelAnalytics() {
  // Mock data pour les statistiques du funnel
  const funnelStatsData = [
    {
      name: 'Landing',
      count: 100,
      dropoff: 60,
      dropoffPercentage: 60
    },
    {
      name: 'Calendly',
      count: 40,
      dropoff: 30,
      dropoffPercentage: 75
    },
    {
      name: 'Payment',
      count: 10
    }
  ];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Funnel Analytics</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <FunnelStepsEditor />
        <FunnelStats steps={funnelStatsData} />
      </div>
    </div>
  );
}
