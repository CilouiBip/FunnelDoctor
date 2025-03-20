import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-r from-gray-50 to-gray-100">
      {children}
    </div>
  );
}
