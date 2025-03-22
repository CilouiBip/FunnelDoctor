"use client";

import React from 'react';
import { FunnelStepsEditor } from '../../../components/dashboard/FunnelStepsEditor';

export default function FunnelMapping() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Funnel Mapping</h1>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        <FunnelStepsEditor />
      </div>
    </div>
  );
}
