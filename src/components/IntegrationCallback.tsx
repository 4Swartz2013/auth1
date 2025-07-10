import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { useIntegrationStore } from '../store/integrationStore';

const IntegrationCallback: React.FC = () => {
  const router = useRouter();
  const { provider, error, error_description } = router.query;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('Processing your authorization...');
  const { loadCredentialsFromDatabase, loadIntegrationsFromDatabase } = useIntegrationStore();

  useEffect(() => {
    if (!router.isReady) return;

    if (error) {
      setStatus('error');
      setMessage(error_description as string || 'An error occurred during authorization');
      return;
    }

    // This component is shown after the API callback has processed the OAuth code
    // and stored the credentials in the database
    const processCallback = async () => {
      try {
        // Reload credentials and integrations from database
        await loadCredentialsFromDatabase();
        await loadIntegrationsFromDatabase();
        
        setStatus('success');
        setMessage(`Successfully connected to ${provider}`);
        
        // Redirect back to integrations page after a delay
        setTimeout(() => {
          router.push('/integrations');
        }, 3000);
      } catch (error) {
        console.error('Error processing callback:', error);
        setStatus('error');
        setMessage('Failed to complete the integration setup');
      }
    };

    processCallback();
  }, [router.isReady, error, error_description, provider, router, loadCredentialsFromDatabase, loadIntegrationsFromDatabase]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 w-full max-w-md text-center">
        {status === 'loading' && (
          <>
            <Loader className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Finalizing Connection
            </h2>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              {provider} Connected!
            </h2>
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              Connection Failed
            </h2>
          </>
        )}
        
        <p className="text-gray-300 mb-6">
          {message}
        </p>
        
        {status !== 'loading' && (
          <button
            onClick={() => router.push('/integrations')}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300"
          >
            Return to Integrations
          </button>
        )}
      </div>
    </div>
  );
};

export default IntegrationCallback;