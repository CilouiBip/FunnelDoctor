"use client";

import React from 'react';
import { ExecutiveSummary } from '../../components/dashboard/ExecutiveSummary';

export default function Dashboard() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <ExecutiveSummary />
    </div>
  );
}
