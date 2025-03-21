import React, { useRef, useEffect } from 'react';

// Définition de l'interface pour les props
interface StepModalProps {
  isEdit?: boolean;
  showAddModal?: boolean;
  showEditModal?: boolean;
  newStepLabel: string;
  newStepDescription: string;
  newStepType: string;
  newStepColor: string;
  isUpdatingForm: boolean;
  setShowAddModal: (show: boolean) => void;
  setShowEditModal: (show: boolean) => void;
  setNewStepLabel: (label: string) => void;
  setNewStepDescription: (desc: string) => void;
  setNewStepType: (type: string) => void;
  setNewStepColor: (color: string) => void;
  handleEditSave: () => void;
  handleAddStep: () => void;
}

export const StepModal: React.FC<StepModalProps> = ({
  isEdit = false,
  newStepLabel,
  newStepDescription,
  newStepType,
  newStepColor,
  isUpdatingForm,
  setShowAddModal,
  setShowEditModal,
  setNewStepLabel,
  setNewStepDescription,
  setNewStepType,
  setNewStepColor,
  handleEditSave,
  handleAddStep
}) => {
  // Utilisation des références pour stocker les valeurs actuelles sans triggers de rendu
  const labelRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);
  
  // Initialiser les références avec les valeurs actuelles
  useEffect(() => {
    if (labelRef.current) labelRef.current.value = newStepLabel;
    if (descRef.current) descRef.current.value = newStepDescription;
  }, [newStepLabel, newStepDescription]);
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-semibold mb-4">{isEdit ? 'Modifier l\'étape' : 'Ajouter une étape'}</h3>
        
        <div className="space-y-4">
          {/* Champ pour le libellé */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Libellé</label>
            <input 
              type="text" 
              className="input-field w-full px-3 py-2 border border-gray-300 rounded-md" 
              defaultValue={newStepLabel}
              ref={labelRef}
              onChange={(e) => {
                setNewStepLabel(e.target.value);
              }}
              placeholder="ex: Appel découverte"
            />
          </div>
          
          {/* Sélection du type (seulement pour l'ajout, pas pour l'édition) */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                className="input-field w-full px-3 py-2 border border-gray-300 rounded-md"
                value={newStepType}
                onChange={(e) => setNewStepType(e.target.value)}
              >
                <option value="CUSTOM">Personnalisé</option>
                <option value="LANDING">Landing</option>
                <option value="OPTIN">Opt-in</option>
                <option value="VSL">VSL (Vidéo de vente)</option>
                <option value="CALENDLY">Calendly</option>
                <option value="CALL">Call</option>
                <option value="PAYMENT">Paiement</option>
                <option value="POSTSALE">Post-sale</option>
              </select>
            </div>
          )}
          
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (Optionnelle)</label>
            <input 
              type="text" 
              className="input-field w-full px-3 py-2 border border-gray-300 rounded-md" 
              defaultValue={newStepDescription}
              ref={descRef}
              onChange={(e) => {
                setNewStepDescription(e.target.value);
              }}
              placeholder="ex: Premier appel avec le client"
            />
          </div>
        
        {/* Sélection de couleur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Couleur</label>
          <div className="flex items-center">
            <input 
              type="color" 
              className="mr-2 h-8 w-10 border border-gray-300 rounded" 
              value={newStepColor} 
              onChange={(e) => setNewStepColor(e.target.value)}
            />
            <input 
              type="text" 
              className="input-field flex-grow px-3 py-2 border border-gray-300 rounded-md" 
              value={newStepColor} 
              onChange={(e) => setNewStepColor(e.target.value)}
              placeholder="#94A3B8"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4">
          <button 
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
            onClick={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
          >
            Annuler
          </button>
          <button 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={isEdit ? handleEditSave : handleAddStep}
            disabled={isUpdatingForm || newStepLabel.trim() === ''}
          >
            {isUpdatingForm 
              ? (isEdit ? 'Enregistrement...' : 'Ajout...')
              : (isEdit ? 'Enregistrer' : 'Ajouter')
            }
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
