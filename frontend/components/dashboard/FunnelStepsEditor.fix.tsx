import React, { useState, useEffect, useCallback } from 'react';
import { FunnelStepsService, FunnelStep } from '../../services/funnel-steps.service';
import { getTokenInfo, isAuthenticated, checkTokenAndLogout, logout } from '../../lib/services/auth.service';
import { useRouter } from 'next/navigation';
import debounce from 'lodash/debounce';

// Récupérer l'instance du service
const funnelStepsService = FunnelStepsService.getInstance();

// Liste des types standard pour les alertes de suppression
const DEFAULT_STEP_TYPES = [
  'LANDING',
  'OPTIN',
  'VSL',
  'CALENDLY',
  'CALL',
  'PAYMENT',
  'POSTSALE'
];

export const FunnelStepsEditor: React.FC = () => {
  // Contenu du composant ici
  return (
    <div>Version simplifiée pour tester la syntaxe</div>
  );
};
