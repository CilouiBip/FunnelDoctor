import React from 'react';

// Du00e9finition de l'interface pour les props
interface DeleteConfirmModalProps {
  stepToDelete: string | null;
  cancelDelete: () => void;
  executeDelete: (stepId: string) => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  stepToDelete,
  cancelDelete,
  executeDelete
}) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 className="text-xl font-semibold mb-2 text-red-600">Confirmer la suppression</h3>
      
      <p className="mb-4">
        Vous u00eates sur le point de supprimer une u00e9tape par du00e9faut de votre entonnoir. 
        Cette u00e9tape est recommandu00e9e pour un entonnoir optimal d'infopreneur.
      </p>
      
      <p className="mb-6 font-medium">
        u00cates-vous su00fbr de vouloir continuer ?
      </p>
      
      <div className="flex justify-end space-x-3">
        <button 
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
          onClick={cancelDelete}
        >
          Annuler
        </button>
        <button 
          className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          onClick={() => stepToDelete && executeDelete(stepToDelete)}
        >
          Supprimer
        </button>
      </div>
    </div>
  </div>
);
