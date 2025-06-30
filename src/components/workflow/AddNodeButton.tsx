import React from 'react';
import { Plus } from 'lucide-react';

interface AddNodeButtonProps {
  onAddNode: () => void;
}

const AddNodeButton: React.FC<AddNodeButtonProps> = ({ onAddNode }) => {
  return (
    <button
      onClick={onAddNode}
      className="absolute bottom-6 right-6 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center z-10"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
};

export default AddNodeButton;