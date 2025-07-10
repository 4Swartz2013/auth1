import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Plug, ExternalLink, Info, Loader2, Settings, AlertTriangle } from 'lucide-react';
import { Provider } from '../types';
import { useIntegrationStore } from '../store/integrationStore';
import ConnectModal from './ConnectModal';
import HealthDrawer from './HealthDrawer';
import FixButton from './FixButton';
import HealthDrawer from './HealthDrawer';
import FixButton from './FixButton';

interface IntegrationCardProps {
  provider: Provider;
}

const IntegrationCard: React.FC<IntegrationCardProps> = ({ provider }) => {
  const { 
    isConnected, 
    setLoading, 
    loadingProviders, 
    deleteCredentialFromDatabase,
    currentUserId,
    integrations,
    setLoading, 
    loadingProviders, 
    deleteCredentialFromDatabase,
    currentUserId,
    integrations
  } = useIntegrationStore();
  
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showHealthDrawer, setShowHealthDrawer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHealthDrawer, setShowHealthDrawer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const connected = isConnected(provider.key);
  
  // Safely handle loadingProviders - ensure it's always a Set
  const safeLoadingProviders = loadingProviders instanceof Set 
    ? loadingProviders 
    : new Set(Array.isArray(loadingProviders) ? loadingProviders : []);
  
  const loading = safeLoadingProviders.has(provider.key);

  // Find integration for this provider
  const integration = Array.from(integrations.values()).find(i => i.providerKey === provider.key);
  const integrationStatus = integration?.status || (connected ? 'connected' : 'disconnected');
  const hasError = integrationStatus === 'error';
  
  // Safely handle loadingProviders - ensure it's always a Set
  const safeLoadingProviders = loadingProviders instanceof Set 
    ? loadingProviders 
    : new Set(Array.isArray(loadingProviders) ? loadingProviders : []);
  
  const loading = safeLoadingProviders.has(provider.key);

  // Find integration for this provider
  const integration = Array.from(integrations.values()).find(i => i.providerKey === provider.key);
  const integrationStatus = integration?.status || (connected ? 'connected' : 'disconnected');
  const hasError = integrationStatus === 'error';

  const handleConnect = () => {
    if (!currentUserId) {
      setError('Please sign in to connect platforms');
      return;
    }

    setError(null);
    if (!currentUserId) {
      setError('Please sign in to connect platforms');
      return;
    }

    setError(null);
    setShowConnectModal(true);
  };

  const handleDisconnect = async () => {
    if (!currentUserId) return;

    setLoading(provider.key, true);
    
    const success = await deleteCredentialFromDatabase(provider.key);
    
    if (!success) {
      setError('Failed to disconnect. Please try again.');
    }
    
    setLoading(provider.key, false);
  };

  const handleViewHealth = () => {
    if (integration) {
      setShowHealthDrawer(true);
    }
  };

  const handleDisconnect = async () => {
    if (!currentUserId) return;

    setLoading(provider.key, true);
    
    const success = await deleteCredentialFromDatabase(provider.key);
    
    if (!success) {
      setError('Failed to disconnect. Please try again.');
    }
    
    setLoading(provider.key, false);
  };

  const handleViewHealth = () => {
    if (integration) {
      setShowHealthDrawer(true);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.02 }}
        className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700 flex flex-col items-center text-center transition-all duration-300 hover:shadow-2xl hover:border-purple-500/30"
      >
        {/* Provider Icon */}
        <div className="w-16 h-16 mb-4 rounded-full border-2 border-gray-600 p-2 bg-gray-700 flex items-center justify-center">
          {provider.icon ? (
            <img src={provider.icon} alt={provider.name} className="w-10 h-10" />
          ) : (
            <Settings className="w-10 h-10 text-gray-400" />
          )}
        </div>
        
        {/* Provider Name */}
        <h3 className="text-xl font-semibold mb-2 text-gray-100">{provider.name}</h3>
        
        {/* Category Badge */}
        <div className="text-xs text-gray-400 mb-3 px-2 py-1 bg-gray-700 rounded-full">
          {provider.category}
        </div>
        
        {/* Connection Status */}
        <div className={`flex items-center gap-2 text-sm font-medium mb-4 p-2 px-3 rounded-full ${
          integrationStatus === 'connected' ? 'bg-green-600/30 text-green-400' : 
          integrationStatus === 'error' ? 'bg-red-600/30 text-red-400' :
          integrationStatus === 'pending' ? 'bg-yellow-600/30 text-yellow-400' :
          'bg-gray-600/30 text-gray-400'
        }`}>
          {integrationStatus === 'connected' ? <CheckCircle className="w-4 h-4" /> : 
           integrationStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> :
           integrationStatus === 'pending' ? <Loader2 className="w-4 h-4 animate-spin" /> :
           <XCircle className="w-4 h-4" />}
          {integrationStatus === 'connected' ? 'Connected' : 
           integrationStatus === 'error' ? 'Error' :
           integrationStatus === 'pending' ? 'Setting up...' :
           'Not Connected'}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-2 bg-red-600/20 border border-red-600/30 rounded-lg text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-auto w-full space-y-2">
          {!connected && (
            <button
              onClick={handleConnect}
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg shadow-md hover:from-purple-600 hover:to-pink-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !currentUserId}
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4" />
                  Connecting...
                </>
              ) : (
                <>
                  <Plug className="w-4 h-4" />
                  {provider.authType === 'oauth' ? 'Connect Account' : 'Setup Manually'}
                </>
              )}
            </button>
          )}
          
          {connected && hasError && (
            <FixButton 
              integrationId={integration!.id} 
              providerKey={provider.key}
              errorMessage={integration?.errorMessage}
            />
          )}
          
          {connected && (
            <>
              {!hasError && (
                <button
                  onClick={handleDisconnect}
                  className="w-full px-4 py-2 bg-gray-600 text-white font-semibold rounded-lg shadow-md hover:bg-gray-700 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      Disconnecting...
                    </>
                  ) : (
                    'Disconnect'
                  )}
                </button>
              )}
              
              <button
                onClick={handleViewHealth}
                className="w-full px-4 py-2 text-blue-400 hover:text-blue-300 text-sm flex items-center justify-center gap-1 border border-blue-400/30 rounded-lg hover:border-blue-400/50 transition-colors"
              >
                <Info className="w-3 h-3" />
                View Health & Logs
              </button>
            </>
          )}
          
          {provider.docsUrl && (
            <a 
              href={provider.docsUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="w-full px-4 py-2 text-gray-400 hover:text-gray-300 text-sm flex items-center justify-center gap-1 border border-gray-600/30 rounded-lg hover:border-gray-600/50 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              API Documentation
            </a>
          )}
        </div>
      </motion.div>

      {showConnectModal && (
        <ConnectModal
          provider={provider}
          onClose={() => setShowConnectModal(false)}
        />
      )}

      {showHealthDrawer && integration && (
        <HealthDrawer
          integrationId={integration.id}
          providerKey={provider.key}
          providerName={provider.name}
          onClose={() => setShowHealthDrawer(false)}
          onRefresh={() => {
            // Implement refresh logic
            return useIntegrationStore.getState().refreshIntegration(integration.id);
          }}
        />
      )}
    </>
  );
};

export default IntegrationCard;