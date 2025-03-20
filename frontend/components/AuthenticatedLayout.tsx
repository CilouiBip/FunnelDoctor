"use client";

import { Sidebar } from './Sidebar';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar /> 
      <div className="main-content">
        {children}
      </div>
    </div>
  );
}
