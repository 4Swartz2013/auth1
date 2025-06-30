import React, { useState } from 'react';
import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { useIntegrationStore } from '../store/integrationStore';

interface FixButtonProps {
  integrationId: string;
  providerKey: string;
  errorMessage?: string;
}

const FixButton: React.FC<FixButtonProps> = ({ integrationId, providerKey, errorMessage }) => {
  const { refreshIntegration } = useIntegrationStore();
  const [isFixing, setIsFixing] = useState(false);
  const [fixError, setFixError] = useState<string | null>(null);

  const handleFix = async () => {
    setIsFixing(true);
    setFixError(null);
    
    try {
      const result = await refreshIntegration(integrationId);
      
      if (!result.success) {
        setFixError(result.error || 'Failed to fix the integration');
      }
    } catch (error) {
      console.error('Error fixing integration:', error);
      setFixError('An unexpected error occurred');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleFix}
        disabled={isFixing}
        className="w-full px-4 py-2 bg-yellow-600 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isFixing ? (
          <>
            <Loader2 className="animate-spin w-4 h-4" />
            Fixing...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Fix Connection
          </>
        )}
      </button>
      
      {fixError && (
        <div className="mt-2 p-2 bg-red-600/20 border border-red-600/30 rounded-lg text-red-300 text-xs flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>{fixError}</span>
        </div>
      )}
      
      {errorMessage && !fixError && (
        <div className="mt-2 text-yellow-300 text-xs flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

export default FixButton;