// Composant temporaire de débogage pour afficher la structure des données
import React from 'react';

interface DataDebuggerProps {
  data: any;
  title?: string;
  expanded?: boolean;
}

const DataDebugger: React.FC<DataDebuggerProps> = ({ 
  data, 
  title = 'Debug Data', 
  expanded = false 
}) => {
  const [isExpanded, setIsExpanded] = React.useState(expanded);
  
  const toggleExpand = () => setIsExpanded(!isExpanded);
  
  return (
    <div className="p-4 my-4 border border-gray-300 rounded-md bg-gray-50">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-mono text-gray-700">{title}</h3>
        <button 
          onClick={toggleExpand}
          className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded text-sm"
        >
          {isExpanded ? 'Masquer' : 'Afficher'}
        </button>
      </div>
      
      {isExpanded && (
        <pre className="mt-2 p-3 bg-gray-800 text-green-400 rounded overflow-auto text-xs max-h-[500px]">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
};

export default DataDebugger;
