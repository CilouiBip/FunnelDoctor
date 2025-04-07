"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IntegrationsRedirect() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/settings/integrations');
  }, [router]);
  
  // Optionnel: Améliorer le message ou ajouter un spinner
  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <p className="text-center text-gray-600">
        Redirection vers la nouvelle page d'intégrations...
      </p>
    </div>
  );
}
