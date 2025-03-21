import React, { useState, useEffect, useCallback } from 'react';
import { FunnelStepsService, FunnelStep } from '../../services/funnel-steps.service';
import { getTokenInfo, isAuthenticated, checkTokenAndLogout, logout } from '../../lib/services/auth.service';
import { useRouter } from 'next/navigation';
import debounce from 'lodash/debounce';
// Import des composants modaux extraits
import { StepModal } from './modals/StepModal';
import { DeleteConfirmModal } from './modals/DeleteConfirmModal';

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
  // États pour les étapes du funnel et le statut de chargement
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // États pour la fonctionnalité de drag-and-drop
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);

  // États pour gérer les modaux d'ajout, d'édition et de confirmation
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [currentStep, setCurrentStep] = useState<FunnelStep | null>(null);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);
  
  // États pour les champs du formulaire
  const [newStepLabel, setNewStepLabel] = useState('');
  const [newStepDescription, setNewStepDescription] = useState('');
  const [newStepType, setNewStepType] = useState('CUSTOM');
  const [newStepColor, setNewStepColor] = useState('#94A3B8');
  
  // Variables pour éviter les rendus inutiles et les freezes
  const [isUpdatingForm, setIsUpdatingForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error' | 'info' | 'warning', message: string | React.ReactNode} | null>(null);
  
  // Router pour les redirections
  const router = useRouter();

  // Source des données (API authentifiée ou debug) avec persistance locale
  const [dataSource, setDataSource] = useState<'auth'|'debug'>(() => {
    // Vérification du statut d'authentification au démarrage
    const isUserAuthenticated = isAuthenticated();
    const tokenInfo = getTokenInfo();
    
    console.log('FunnelStepsEditor: Initialisation du composant');
    console.log(`FunnelStepsEditor: Statut d'authentification:`, isUserAuthenticated ? 'Authentifié' : 'Non authentifié');
    console.log(`FunnelStepsEditor: Info token:`, {
      présent: !!tokenInfo.token,
      valide: tokenInfo.isValid,
      expiration: tokenInfo.expiration?.toLocaleString() || 'N/A',
      userId: tokenInfo.userId || 'N/A'
    });
    
    // Vérifier si le token est expiré et rediriger vers la page de login si nécessaire
    if (tokenInfo.token && !tokenInfo.isValid) {
      console.warn('FunnelStepsEditor: Token expiré détecté lors de l\'initialisation');
      // On laisse le mode debug s'activer pour cette session mais on informe l'utilisateur
      setTimeout(() => {
        setStatusMessage({
          type: 'warning',
          message: 'Votre session a expiré. Les modifications ne seront pas sauvegardées. Veuillez vous reconnecter.'
        });
      }, 1000);
    }
    
    // Récupérer la source de données du localStorage
    const savedSource = localStorage.getItem('funnel_data_source');
    
    // Si authentifié et pas explicitement en debug, forcer 'auth'
    if (isUserAuthenticated && savedSource !== 'debug') {
      console.log('FunnelStepsEditor: Utilisateur authentifié, utilisation du mode AUTH');
      return 'auth';
    } else if (isUserAuthenticated && savedSource === 'debug') {
      console.log('FunnelStepsEditor: Source précédente en DEBUG mais utilisateur authentifié, tentative de AUTH');
      return 'auth';
    }
    
    return (savedSource === 'debug') ? 'debug' : 'auth';
  });
  
  // Compteur de tentatives d'authentification échouées
  const [authAttempts, setAuthAttempts] = useState<number>(0);
  
  // État pour stocker les détails de l'erreur (pour debugging)
  const [errorDetails, setErrorDetails] = useState<{
    code?: number;
    message?: string;
    response?: any;
    timestamp?: string;
  } | null>(null);
  
  // Persister le dataSource dans localStorage quand il change
  useEffect(() => {
    localStorage.setItem('funnel_data_source', dataSource);
    console.log(`FunnelStepsEditor: Source de données modifiée -> ${dataSource}`);
    
    // Toujours vérifier le statut d'authentification quand la source change
    const tokenInfo = getTokenInfo();
    console.log(`FunnelStepsEditor: Vérification token après changement de source:`, {
      présent: !!tokenInfo.token,
      valide: tokenInfo.isValid,
      expiration: tokenInfo.expiration?.toLocaleString() || 'N/A',
      userId: tokenInfo.userId || 'N/A'
    });
  }, [dataSource]);
  
  // Création d'une fonction pour gérer l'expiration du token et proposer la reconnexion
  const handleSessionExpired = useCallback(() => {
    setStatusMessage({
      type: 'warning',
      message: (
        <div className="flex flex-col">
          <div>Votre session a expiré. Les modifications ne seront pas sauvegardées en base.</div>
          <button 
            onClick={() => {
              const currentPath = window.location.pathname;
              logout('Votre session a expiré. Veuillez vous reconnecter.', currentPath);
            }}
            className="mt-2 self-center px-4 py-1.5 bg-primary text-white text-sm rounded hover:bg-primary/90"
          >
            Se reconnecter
          </button>
        </div>
      )
    });
  }, []);

  // Déclaration de la fonction fetchSteps pour la rendre accessible à d'autres fonctions
  const fetchSteps = async () => {
    setIsLoading(true);
    setError(null);
    
    // Vérifier si on a déjà fait trop de tentatives d'authentification
    if (dataSource === 'auth' && authAttempts >= 3) {
      console.warn('FunnelStepsEditor: Nombre maximum de tentatives d\'authentification atteint (3)');
      handleSessionExpired();
      setDataSource('debug');
      // Réinitialiser le compteur pour éviter qu'il ne continue d'augmenter
      setAuthAttempts(0);
    }
    
    try {
      const tokenInfo = getTokenInfo();
      console.log('FunnelStepsEditor: Tentative de récupération des étapes du funnel');
      console.log(`FunnelStepsEditor: Source=${dataSource}, Tentative=${authAttempts}, Token présent=${!!tokenInfo.token}, Token valide=${tokenInfo.isValid}`);
      
      if (tokenInfo.expiration) {
        const now = new Date();
        const diffMs = tokenInfo.expiration.getTime() - now.getTime();
        const diffMins = Math.round(diffMs / 60000);
        console.log(`FunnelStepsEditor: Expiration du token dans ${diffMins} minutes (${tokenInfo.expiration.toLocaleString()})`);
      }
      
      // D'abord essayer l'API authentifiée
      if (dataSource === 'auth') {
        console.log('FunnelStepsEditor: Tentative d\'appel à l\'API authentifiée');
        const steps = await funnelStepsService.getSteps();
        console.log('FunnelStepsEditor: Réponse reçue (auth):', steps);
        
        // Réinitialiser le compteur si l'authentification réussit
        setAuthAttempts(0);
        
        if (steps && steps.length > 0) {
          console.log(`FunnelStepsEditor: ${steps.length} étapes trouvées via API authentifiée`);
          setFunnelSteps(steps);
        } else {
          console.log('FunnelStepsEditor: Aucune étape trouvée via API authentifiée, basculement vers debug');
          setDataSource('debug');
          // Ne pas rappeler fetchSteps ici, le useEffect se chargera de le faire puisque dataSource change
        }
      } else {
        // Mode debug
        const debugSteps = await funnelStepsService.getDebugSteps();
        console.log('FunnelStepsEditor: Réponse du debug:', debugSteps);
        
        if (debugSteps && debugSteps.length > 0) {
          console.log(`FunnelStepsEditor: ${debugSteps.length} étapes trouvées via debug`);
          setFunnelSteps(debugSteps);
        } else {
          console.warn('FunnelStepsEditor: Aucune étape trouvée, même via l\'endpoint de debug');
          setError('Aucune étape de funnel trouvée. Veuillez contacter l\'administrateur.');
        }
      }
    } catch (err: any) {
      console.error('FunnelStepsEditor: Erreur lors du chargement des étapes:', err);
      
      // Extraire et stocker plus d'informations sur l'erreur pour le debugging
      let errorInfo = {
        code: 0,
        message: err.toString(),
        response: null,
        timestamp: new Date().toISOString()
      };
      
      // Vérifier si c'est une erreur de réseau
      if (err instanceof TypeError && err.message.includes('network')) {
        errorInfo.code = -1;
        errorInfo.message = 'Erreur réseau: Le serveur est-il accessible?';
      } 
      // Vérifier si c'est une erreur de fetch avec une réponse HTTP
      else if (err.status || err.statusCode) {
        errorInfo.code = err.status || err.statusCode;
        try {
          // Tenter d'extraire les détails de la réponse si disponibles
          if (err.json) {
            errorInfo.response = await err.json();
          }
        } catch (e) {
          console.warn('Impossible de parser la réponse d\'erreur:', e);
        }
      }
      
      setErrorDetails(errorInfo);
      console.log('FunnelStepsEditor: Détails de l\'erreur:', errorInfo);
      
      // Si erreur d'authentification (401), vérifier si c'est dû à un token expiré
      const isAuthError = 
        errorInfo.code === 401 || 
        err.toString().includes('Unauthorized') || 
        err.toString().includes('401') ||
        (errorInfo.response && errorInfo.response.statusCode === 401);
      
      if (isAuthError && dataSource === 'auth') {
        // Vérifier l'état du token
        const tokenInfo = getTokenInfo();
        console.log(`FunnelStepsEditor: État du token lors de l'erreur d'auth:`, {
          présent: !!tokenInfo.token,
          valide: tokenInfo.isValid,
          expiration: tokenInfo.expiration?.toLocaleString() || 'N/A',
          userId: tokenInfo.userId || 'N/A'
        });
        
        // Si le token est présent mais expiré, proposer de se reconnecter
        if (tokenInfo.token && !tokenInfo.isValid) {
          console.log('FunnelStepsEditor: Token expiré détecté, proposant reconnexion');
          handleSessionExpired();
          
          // On passe en mode debug pour permettre de continuer à travailler localement
          setDataSource('debug');
          return;
        }
        
        // Sinon, incrémenter le compteur d'échecs d'authentification standard
        const newAttempts = authAttempts + 1;
        setAuthAttempts(newAttempts);
        
        console.log(`FunnelStepsEditor: Erreur d\'authentification (tentative ${newAttempts}/3), code: ${errorInfo.code}`);
        console.log(`FunnelStepsEditor: Détails de l'erreur d'auth:`, errorInfo);
        
        // Si on dépasse le nombre maximum d'essais, afficher un message avec option de reconnexion
        if (newAttempts >= 3) {
          handleSessionExpired();
        } else {
          setStatusMessage({ 
            type: 'warning', 
            message: `Erreur d'authentification (essai ${newAttempts}/3). Mode démo temporaire activé. Vos modifications ne seront pas sauvegardées en base.` 
          });
          setTimeout(() => setStatusMessage(null), 8000);
        }
        
        setDataSource('debug');
        // Ne pas rappeler fetchSteps ici, le useEffect se chargera de le faire puisque dataSource change
      } else {
        setError('Impossible de charger les étapes du funnel. Veuillez réessayer plus tard.');
      }
      
      // Tentative de secours avec l'endpoint de debug en cas d'erreur
      try {
        console.log('FunnelStepsEditor: Tentative de secours avec l\'endpoint de debug');
        const debugSteps = await funnelStepsService.getDebugSteps();
        
        if (debugSteps && debugSteps.length > 0) {
          console.log(`FunnelStepsEditor: ${debugSteps.length} étapes trouvées via debug (secours)`);
          setFunnelSteps(debugSteps);
          setError(null); // Réinitialiser l'erreur puisque nous avons récupéré des données
        }
      } catch (debugErr) {
        console.error('FunnelStepsEditor: Erreur également sur l\'endpoint de debug:', debugErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Charger les étapes depuis l'API au chargement initial et quand dataSource change
  useEffect(() => {
    // Vérifier si c'est le premier chargement ou un changement de source de données
    fetchSteps();
    
    // Nettoyer tout useEffect précédent (en cas de changement rapide de dataSource)
    return () => {
      console.log('FunnelStepsEditor: Nettoyage de l\'effet précédent');
    };
  }, [dataSource]); // Dépend de dataSource pour éviter la boucle infinie

  // Fonctions pour gérer les actions
  const handleAddStep = async () => {
    if (newStepLabel.trim() === '') return;
    
    // Désactiver le bouton pendant le processus d'ajout
    setIsUpdatingForm(true);
    
    const newPosition = funnelSteps.length > 0 
      ? Math.max(...funnelSteps.map(s => s.position || 0)) + 1 
      : 1;
    
    // Générer un slug basé sur le label si on ajoute une étape personnalisée
    const slug = newStepType === 'CUSTOM' 
      ? funnelStepsService.generateSlug(newStepLabel)
      : newStepType.toLowerCase();
      
    // Si en mode debug, simuler l'ajout localement sans appeler l'API
    if (dataSource === 'debug') {
      console.log('Mode debug: simulation de création d\'étape sans appel API');
      
      // Créer une étape simulée avec un ID temporaire
      const mockStep: FunnelStep = {
        step_id: `debug-${Date.now()}`,
        type: newStepType,
        slug,
        label: newStepLabel,
        description: newStepDescription.trim() || undefined,
        color: newStepColor,
        position: newPosition,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      setFunnelSteps([...funnelSteps, mockStep]);
      
      // Réinitialiser les champs du formulaire
      setNewStepLabel('');
      setNewStepDescription('');
      setNewStepType('CUSTOM');
      setNewStepColor('#94A3B8');
      setShowAddModal(false);
      setIsUpdatingForm(false);
      
      // Afficher un message de succès avec indication du mode démo
      setStatusMessage({ type: 'info', message: 'Étape ajoutée en mode démo (non persistée)' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    
    try {
      console.log('Création d\'étape via API authentifiée');
      const newStep = await funnelStepsService.createStep({
        type: newStepType,
        slug,
        label: newStepLabel,
        description: newStepDescription.trim() || undefined,
        color: newStepColor,
        position: newPosition,
      });
      
      if (newStep) {
        setFunnelSteps([...funnelSteps, newStep]);
        console.log('Étape créée avec succès:', newStep);
      }
      
      // Réinitialiser les champs du formulaire
      setNewStepLabel('');
      setNewStepDescription('');
      setNewStepType('CUSTOM');
      setNewStepColor('#94A3B8');
      setShowAddModal(false);
      setIsUpdatingForm(false);
      
      // Afficher un message de succès
      setStatusMessage({ type: 'success', message: 'Étape ajoutée avec succès' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Erreur lors de l\'ajout d\'une étape:', err);
      
      // Si erreur d'authentification, basculer en mode debug
      if (err.toString().includes('Unauthorized') && dataSource === 'auth') {
        console.log('Erreur d\'authentification lors de la création d\'étape, basculement vers mode debug');
        setStatusMessage({ type: 'warning', message: 'Mode démo activé: les changements ne seront pas sauvegardés' });
        setTimeout(() => setStatusMessage(null), 5000);
        setDataSource('debug');
        // Relancer l'ajout en mode debug
        setIsUpdatingForm(false);
        handleAddStep();
        return;
      }
      
      setStatusMessage({ type: 'error', message: 'Impossible d\'ajouter l\'étape. Veuillez réessayer.' });
      setTimeout(() => setStatusMessage(null), 3000);
      setIsUpdatingForm(false);
    }
  };

  const handleEditClick = (step: FunnelStep) => {
    setCurrentStep(step);
    // On ne peut modifier que le label, la description et la couleur, pas le type
    setNewStepLabel(step.label);
    setNewStepDescription(step.description || '');
    setNewStepColor(step.color || '#94A3B8');
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!currentStep || newStepLabel.trim() === '') return;
    
    // Désactiver le bouton pendant le processus de mise à jour
    setIsUpdatingForm(true);
    
    // Si en mode debug, simuler la modification localement sans appeler l'API
    if (dataSource === 'debug') {
      console.log('Mode debug: simulation de modification d\'étape sans appel API');
      
      // Modifier l'étape localement
      const mockUpdatedStep: FunnelStep = {
        ...currentStep,
        label: newStepLabel,
        description: newStepDescription.trim() || undefined,
        color: newStepColor,
        updated_at: new Date().toISOString()
      };
      
      // Mettre à jour l'étape dans la liste locale
      const updatedSteps = funnelSteps.map(step => 
        step.step_id === currentStep.step_id ? mockUpdatedStep : step
      );
      
      setFunnelSteps(updatedSteps);
      setShowEditModal(false);
      setCurrentStep(null);
      setNewStepLabel('');
      setNewStepDescription('');
      setNewStepColor('#94A3B8');
      setIsUpdatingForm(false);
      
      // Afficher un message de succès avec indication du mode démo
      setStatusMessage({ type: 'info', message: 'Étape modifiée en mode démo (non persistée)' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    
    try {
      console.log('Modification d\'étape via API authentifiée:', currentStep.step_id);
      const updatedStep = await funnelStepsService.updateStep(currentStep.step_id, {
        label: newStepLabel,
        description: newStepDescription.trim() || undefined,
        color: newStepColor,
      });
      
      if (updatedStep) {
        const updatedSteps = funnelSteps.map(step => 
          step.step_id === currentStep.step_id ? updatedStep : step
        );
        
        setFunnelSteps(updatedSteps);
        console.log('Étape modifiée avec succès:', updatedStep);
      }
      
      setShowEditModal(false);
      setCurrentStep(null);
      setNewStepLabel('');
      setNewStepDescription('');
      setNewStepColor('#94A3B8');
      setIsUpdatingForm(false);
      
      // Afficher un message de succès
      setStatusMessage({ type: 'success', message: 'Étape modifiée avec succès' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Erreur lors de la modification d\'une étape:', err);
      
      // Si erreur d'authentification, basculer en mode debug
      if (err.toString().includes('Unauthorized') && dataSource === 'auth') {
        console.log('Erreur d\'authentification lors de la modification d\'étape, basculement vers mode debug');
        setStatusMessage({ type: 'warning', message: 'Mode démo activé: les changements ne seront pas sauvegardés' });
        setTimeout(() => setStatusMessage(null), 5000);
        setDataSource('debug');
        // Relancer la modification en mode debug
        setIsUpdatingForm(false);
        handleEditSave();
        return;
      }
      
      setStatusMessage({ type: 'error', message: 'Impossible de modifier l\'étape. Veuillez réessayer.' });
      setTimeout(() => setStatusMessage(null), 3000);
      setIsUpdatingForm(false);
    }
  };

  const handleDeleteClick = (stepId: string) => {
    // Récupérer l'étape à supprimer pour vérifier son type
    const stepToDelete = funnelSteps.find(step => step.step_id === stepId);
    
    if (stepToDelete && DEFAULT_STEP_TYPES.includes(stepToDelete.type)) {
      // Si c'est une étape par défaut, demander confirmation
      setStepToDelete(stepId);
      setShowDeleteConfirm(true);
    } else {
      // Sinon, supprimer directement
      executeDelete(stepId);
    }
  };
  
  const executeDelete = async (stepId: string) => {
    // Si en mode debug, simuler la suppression localement sans appel API
    if (dataSource === 'debug') {
      console.log('Mode debug: simulation de suppression d\'étape sans appel API');
      
      // Supprimer l'étape localement
      setFunnelSteps(funnelSteps.filter(step => step.step_id !== stepId));
      
      // Réinitialiser l'état de confirmation
      setShowDeleteConfirm(false);
      setStepToDelete(null);
      
      // Afficher un message de succès avec indication du mode démo
      setStatusMessage({ type: 'info', message: 'Étape supprimée en mode démo (non persistée)' });
      setTimeout(() => setStatusMessage(null), 3000);
      return;
    }
    
    try {
      console.log('Suppression d\'étape via API authentifiée:', stepId);
      const success = await funnelStepsService.deleteStep(stepId);
      
      if (success) {
        setFunnelSteps(funnelSteps.filter(step => step.step_id !== stepId));
        console.log('Étape supprimée avec succès');
      }
      
      // Réinitialiser l'état de confirmation
      setShowDeleteConfirm(false);
      setStepToDelete(null);
      
      // Afficher un message de succès
      setStatusMessage({ type: 'success', message: 'Étape supprimée avec succès' });
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      console.error('Erreur lors de la suppression d\'une étape:', err);
      
      // Si erreur d'authentification, basculer en mode debug
      if (err.toString().includes('Unauthorized') && dataSource === 'auth') {
        console.log('Erreur d\'authentification lors de la suppression d\'étape, basculement vers mode debug');
        setStatusMessage({ type: 'warning', message: 'Mode démo activé: les changements ne seront pas sauvegardés' });
        setTimeout(() => setStatusMessage(null), 5000);
        setDataSource('debug');
        // Relancer la suppression en mode debug
        executeDelete(stepId);
        return;
      }
      
      setStatusMessage({ type: 'error', message: 'Impossible de supprimer l\'étape. Veuillez réessayer.' });
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };
  
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setStepToDelete(null);
  };
  
  // Gestionnaires d'événements pour le drag-and-drop
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, stepId: string) => {
    setIsDragging(true);
    setDraggedStepId(stepId);
    // Définir les données du transfert
    e.dataTransfer.setData('text/plain', stepId);
    e.dataTransfer.effectAllowed = 'move';
    // Ajouter une classe pour le style
    const element = e.currentTarget;
    setTimeout(() => {
      element.classList.add('opacity-50');
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stepId: string) => {
    e.preventDefault();
    if (stepId !== draggedStepId) {
      setDragOverStepId(stepId);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOverStepId(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStepId: string) => {
    e.preventDefault();
    setDragOverStepId(null);
    
    if (!draggedStepId || draggedStepId === targetStepId) {
      console.log('FunnelStepsEditor: Drag-and-drop annulé - même élément ou aucun élément sélectionné');
      setIsDragging(false);
      setDraggedStepId(null);
      return;
    }
    
    console.log(`FunnelStepsEditor: Drag-and-drop - déplacement de l'étape ${draggedStepId} vers la position de l'étape ${targetStepId}`);
    
    
    // Réorganiser les étapes
    const draggedStep = funnelSteps.find(step => step.step_id === draggedStepId);
    const targetStep = funnelSteps.find(step => step.step_id === targetStepId);
    
    if (!draggedStep || !targetStep) {
      setIsDragging(false);
      setDraggedStepId(null);
      return;
    }
    
    // Créer la mise à jour des positions
    const updatedSteps = [...funnelSteps];
    const newPositions: { step_id: string, position: number }[] = [];
    
    // Recalculer les positions
    const draggedPosition = draggedStep.position || 0;
    const targetPosition = targetStep.position || 0;
    
    console.log(`FunnelStepsEditor: Recalcul des positions - déplacement de position ${draggedPosition} vers position ${targetPosition}`);

    
    if (draggedPosition < targetPosition) {
      // Déplacement vers le bas
      updatedSteps.forEach(step => {
        if (step.step_id === draggedStepId) {
          step.position = targetPosition;
          newPositions.push({ step_id: step.step_id, position: targetPosition });
        } else if ((step.position || 0) > draggedPosition && (step.position || 0) <= targetPosition) {
          step.position = (step.position || 0) - 1;
          newPositions.push({ step_id: step.step_id, position: step.position || 0 });
        }
      });
    } else {
      // Déplacement vers le haut
      updatedSteps.forEach(step => {
        if (step.step_id === draggedStepId) {
          step.position = targetPosition;
          newPositions.push({ step_id: step.step_id, position: targetPosition });
        } else if ((step.position || 0) >= targetPosition && (step.position || 0) < draggedPosition) {
          step.position = (step.position || 0) + 1;
          newPositions.push({ step_id: step.step_id, position: step.position || 0 });
        }
      });
    }
    
    // Trier les étapes par position
    updatedSteps.sort((a, b) => (a.position || 0) - (b.position || 0));
    setFunnelSteps(updatedSteps);
    
    // Appeler le service pour persister les changements
    handleUpdatePositions(newPositions);
    
    setIsDragging(false);
    setDraggedStepId(null);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setDraggedStepId(null);
    setDragOverStepId(null);
    // Retirer la classe de style
    e.currentTarget.classList.remove('opacity-50');
  };

  // Fonction pour mettre à jour les positions des étapes (pour le drag-and-drop)
  const handleUpdatePositions = async (newPositions: { step_id: string, position: number }[]) => {
    const requestId = `pos-update-${Date.now()}`;
    console.log(`FunnelStepsEditor [${requestId}]: Début de mise à jour des positions pour ${newPositions.length} étapes`);
    console.log(`FunnelStepsEditor [${requestId}]: Détails des positions:`, newPositions);
    
    // Vérification du token avant l'appel API
    const tokenInfo = getTokenInfo();
    console.log(`FunnelStepsEditor [${requestId}]: État du token avant updatePositions:`, {
      présent: !!tokenInfo.token,
      valide: tokenInfo.isValid,
      expiration: tokenInfo.expiration?.toLocaleString() || 'N/A',
      userId: tokenInfo.userId || 'N/A',
      source: dataSource
    });
    
    try {
      // Optimistic update - mettre à jour l'UI immédiatement pour une expérience fluide
      console.log(`FunnelStepsEditor [${requestId}]: Application des changements optimistes dans l'UI`);
      const updatedSteps = [...funnelSteps];
      newPositions.forEach(update => {
        const stepIndex = updatedSteps.findIndex(s => s.step_id === update.step_id);
        if (stepIndex !== -1) {
          console.log(`FunnelStepsEditor [${requestId}]: Étape ${update.step_id} - position mise à jour de ${updatedSteps[stepIndex].position} à ${update.position}`);
          updatedSteps[stepIndex] = { ...updatedSteps[stepIndex], position: update.position };
        } else {
          console.warn(`FunnelStepsEditor [${requestId}]: Étape ${update.step_id} introuvable dans la liste locale`);
        }
      });
      
      // Trier les étapes par position
      updatedSteps.sort((a, b) => (a.position || 0) - (b.position || 0));
      setFunnelSteps(updatedSteps);
      console.log(`FunnelStepsEditor [${requestId}]: UI mise à jour avec les nouvelles positions`);

      
      // Si on est en mode debug, ne pas tenter de persister les changements
      if (dataSource === 'debug') {
        console.log(`FunnelStepsEditor [${requestId}]: Mode debug - les changements de position ne sont pas persistés`);
        setStatusMessage({ type: 'info', message: 'Mode démo: les changements ne sont pas sauvegardés' });
        setTimeout(() => setStatusMessage(null), 3000);
        return;
      }
      
      // Appel API pour persister les changements (uniquement en mode auth)
      console.log(`FunnelStepsEditor [${requestId}]: Tentative de sauvegarde des positions via API authentifiée`);
      console.time(`updatePositions-${requestId}`);
      const result = await funnelStepsService.updatePositions(newPositions);
      console.timeEnd(`updatePositions-${requestId}`);
      
      if (result) {
        console.log(`FunnelStepsEditor [${requestId}]: Mise à jour des positions réussie, ${result.length} étapes synchronisées`);
        console.log(`FunnelStepsEditor [${requestId}]: Positions retournées par le serveur:`, result.map(s => ({ id: s.step_id, position: s.position })));
        
        // Vérifier que les positions retournées correspondent à celles demandées
        const mismatchedPositions = result.filter(serverStep => {
          const requestedUpdate = newPositions.find(p => p.step_id === serverStep.step_id);
          return requestedUpdate && requestedUpdate.position !== serverStep.position;
        });
        
        if (mismatchedPositions.length > 0) {
          console.warn(`FunnelStepsEditor [${requestId}]: Différences détectées entre positions demandées et retournées:`, mismatchedPositions);
          // Mettre à jour l'UI avec les positions réelles du serveur
          setFunnelSteps(result);
        }
        
        setStatusMessage({ type: 'success', message: 'Ordre des étapes mis à jour' });
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        // En cas d'échec, récupérer les étapes depuis le serveur
        console.error(`FunnelStepsEditor [${requestId}]: Erreur lors de la mise à jour des positions. Récupération des données...`);
        fetchSteps(); // Utiliser la fonction de chargement qui gère les modes auth/debug
      }
    } catch (err: any) {
      console.error(`FunnelStepsEditor [${requestId}]: Erreur lors de la mise à jour des positions:`, err);
      
      // Extraire et stocker plus d'informations sur l'erreur pour le debugging
      let errorInfo = {
        code: 0,
        message: err.toString(),
        response: null,
        timestamp: new Date().toISOString()
      };
      
      // Vérifier si c'est une erreur de réseau
      if (err instanceof TypeError && err.message.includes('network')) {
        errorInfo.code = -1;
        errorInfo.message = 'Erreur réseau: Le serveur est-il accessible?';
      } 
      // Vérifier si c'est une erreur de fetch avec une réponse HTTP
      else if (err.status || err.statusCode) {
        errorInfo.code = err.status || err.statusCode;
        try {
          // Tenter d'extraire les détails de la réponse si disponibles
          if (err.json) {
            errorInfo.response = await err.json();
          }
        } catch (e) {
          console.warn(`FunnelStepsEditor [${requestId}]: Impossible de parser la réponse d'erreur:`, e);
        }
      }
      
      console.log(`FunnelStepsEditor [${requestId}]: Détails de l'erreur:`, errorInfo);
      
      // Vérifier l'état du token après l'erreur
      const tokenInfoAfterError = getTokenInfo();
      console.log(`FunnelStepsEditor [${requestId}]: État du token après erreur:`, {
        présent: !!tokenInfoAfterError.token,
        valide: tokenInfoAfterError.isValid,
        expiration: tokenInfoAfterError.expiration?.toLocaleString() || 'N/A',
        userId: tokenInfoAfterError.userId || 'N/A'
      });
      
      // Si erreur d'authentification (401), basculer en mode debug
      const isAuthError = 
        errorInfo.code === 401 || 
        err.toString().includes('Unauthorized') || 
        err.toString().includes('401') ||
        (errorInfo.response && errorInfo.response.statusCode === 401);
      
      if (isAuthError && dataSource === 'auth') {
        console.log(`FunnelStepsEditor [${requestId}]: Erreur d'authentification (code: ${errorInfo.code}) lors de la mise à jour des positions, basculement vers mode debug`);
        
        // Vérifier si le token a expiré
        const tokenInfo = getTokenInfo();
        if (tokenInfo.token && !tokenInfo.isValid && tokenInfo.expiration) {
          const expiredAt = tokenInfo.expiration.toLocaleString();
          console.log(`FunnelStepsEditor [${requestId}]: Token expiré le ${expiredAt}`);
          setStatusMessage({ 
            type: 'warning', 
            message: `Session expirée (${expiredAt}). Mode démo activé. Les changements ne seront pas sauvegardés.` 
          });
        } else {
          setStatusMessage({ 
            type: 'warning', 
            message: `Problème d'authentification (${errorInfo.code}). Mode démo activé.` 
          });
        }
        
        setTimeout(() => setStatusMessage(null), 5000);
        setDataSource('debug');
      } else {
        console.error(`FunnelStepsEditor [${requestId}]: Type d'erreur:`, err.name);
        console.error(`FunnelStepsEditor [${requestId}]: Message d'erreur:`, err.message);
        console.error(`FunnelStepsEditor [${requestId}]: Détails:`, JSON.stringify(err, null, 2));
        
        // Message d'erreur adapté selon le type d'erreur
        let errorMessage = 'Erreur lors de la mise à jour des positions';
        
        if (errorInfo.code === -1) {
          errorMessage = 'Problème de connexion au serveur. Vérifiez votre réseau.';
        } else if (errorInfo.code >= 500) {
          errorMessage = `Erreur serveur (${errorInfo.code}). L'équipe technique a été notifiée.`;
        } else if (errorInfo.code >= 400 && errorInfo.code !== 401) {
          errorMessage = `Requête invalide (${errorInfo.code}). Veuillez réessayer.`;
        }
        
        setStatusMessage({ type: 'error', message: errorMessage });
        setTimeout(() => setStatusMessage(null), 5000);
      }
      
      // Récupérer les étapes depuis le serveur pour rétablir l'état correct
      console.log(`FunnelStepsEditor [${requestId}]: Récupération des données depuis le serveur pour corriger l'état`);
      // Utiliser fetchSteps qui gère automatiquement les modes auth/debug
      fetchSteps();
    } finally {
      console.log(`FunnelStepsEditor [${requestId}]: Fin du traitement de mise à jour des positions`);
    }
  };

  // Implémentation du debounce pour les champs à saisie rapide
  const debouncedSetLabel = useCallback(
    debounce((value: string) => {
      setNewStepLabel(value);
    }, 100),
    []
  );

  const debouncedSetDescription = useCallback(
    debounce((value: string) => {
      setNewStepDescription(value);
    }, 100),
    []
  );

  // Gestionnaires d'événements optimisés pour les champs
  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mise à jour immédiate de l'interface utilisateur pour une UX fluide
    e.target.value = e.target.value; // Prévient le saut du curseur
    debouncedSetLabel(e.target.value);
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Mise à jour immédiate de l'interface utilisateur pour une UX fluide
    e.target.value = e.target.value; // Prévient le saut du curseur
    debouncedSetDescription(e.target.value);
  };

  // Les composants modaux ont été extraits dans des fichiers séparés
  // et sont maintenant importés depuis './modals/StepModal' et './modals/DeleteConfirmModal'

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Funnel Steps</h3>
        <button 
          className="text-sm px-3 py-1 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          onClick={() => setShowAddModal(true)}
        >
          + Add Step
        </button>
      </div>
      
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-gray-600">Chargement des étapes du funnel...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>{error}</p>
            <button 
              className="mt-2 text-primary hover:underline" 
              onClick={() => window.location.reload()}
            >
              Réessayer
            </button>
          </div>
        ) : funnelSteps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No steps defined yet. Click the button above to add your first funnel step.
          </div>
        ) : (
          funnelSteps.map((step, index) => (
            <div 
              key={step.step_id}
              className={`border border-gray-200 rounded-lg p-4 flex items-center justify-between transition-colors ${
                isDragging && dragOverStepId === step.step_id ? 'border-primary border-dashed bg-primary/10' : 'hover:border-primary/30 hover:bg-primary/5'
              } ${
                isDragging && draggedStepId === step.step_id ? 'opacity-50' : ''
              }`}
              style={{borderLeftWidth: '4px', borderLeftColor: step.color || '#94A3B8'}}
              draggable="true"
              onDragStart={(e) => handleDragStart(e, step.step_id)}
              onDragOver={(e) => handleDragOver(e, step.step_id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, step.step_id)}
              onDragEnd={handleDragEnd}
              data-step-id={step.step_id}
              data-position={step.position}
            >
              <div className="flex items-center">
                <div 
                  className="cursor-grab opacity-50 hover:opacity-100 mr-2 text-gray-400"
                  title="Glisser-déposer pour réorganiser"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                  </svg>
                </div>
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center font-semibold mr-3 text-white"
                  style={{backgroundColor: step.color || '#94A3B8'}}
                >
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center">
                    <h4 className="font-medium">{step.label}</h4>
                    {DEFAULT_STEP_TYPES.includes(step.type) && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">{step.type}</span>
                    )}
                  </div>
                  {step.description && <p className="text-sm text-gray-500">{step.description}</p>}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button 
                  className="text-gray-400 hover:text-primary" 
                  onClick={() => handleEditClick(step)}
                  aria-label="Modifier l'étape"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21h-9.5A2.25 2.25 0 014 18.75V8.25A2.25 2.25 0 016.25 6H11" />
                  </svg>
                </button>
                <button 
                  className="text-gray-400 hover:text-red-500" 
                  onClick={() => handleDeleteClick(step.step_id)}
                  aria-label="Supprimer l'étape"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modaux pour l'ajout, l'édition et la confirmation de suppression */}
      {showAddModal && 
        <StepModal 
          isEdit={false}
          showAddModal={showAddModal}
          showEditModal={showEditModal}
          newStepLabel={newStepLabel}
          newStepDescription={newStepDescription}
          newStepType={newStepType}
          newStepColor={newStepColor}
          isUpdatingForm={isUpdatingForm}
          setShowAddModal={setShowAddModal}
          setShowEditModal={setShowEditModal}
          setNewStepLabel={setNewStepLabel}
          setNewStepDescription={setNewStepDescription}
          setNewStepType={setNewStepType}
          setNewStepColor={setNewStepColor}
          handleEditSave={handleEditSave}
          handleAddStep={handleAddStep}
        />
      }
      {showEditModal && 
        <StepModal 
          isEdit={true}
          showAddModal={showAddModal}
          showEditModal={showEditModal}
          newStepLabel={newStepLabel}
          newStepDescription={newStepDescription}
          newStepType={newStepType}
          newStepColor={newStepColor}
          isUpdatingForm={isUpdatingForm}
          setShowAddModal={setShowAddModal}
          setShowEditModal={setShowEditModal}
          setNewStepLabel={setNewStepLabel}
          setNewStepDescription={setNewStepDescription}
          setNewStepType={setNewStepType}
          setNewStepColor={setNewStepColor}
          handleEditSave={handleEditSave}
          handleAddStep={handleAddStep}
        />
      }
      {showDeleteConfirm && 
        <DeleteConfirmModal 
          stepToDelete={stepToDelete}
          cancelDelete={cancelDelete}
          executeDelete={executeDelete}
        />
      }
    </div>
  );
};
