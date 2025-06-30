import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Copy, CheckCircle, ExternalLink, Lock, Key, AlertTriangle } from 'lucide-react';
import { Provider } from '../types';

interface ManualSetupModalProps {
  provider: Provider;
  onClose: () => void;
  onSave: (credentialData: {
    apiKey?: string;
    apiSecret?: string;
    additionalData?: Record<string, any>;
  }) => Promise<boolean>;
}

const ManualSetupModal: React.FC<ManualSetupModalProps> = ({ provider, onClose, onSave }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [additionalFields, setAdditionalFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      const success = await onSave({
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim() || undefined,
        additionalData: Object.keys(additionalFields).length > 0 ? additionalFields : undefined
      });

      if (success) {
        setShowSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setError('Failed to save credentials. Please try again.');
      }
    } catch (error) {
      console.error('Failed to save API key:', error);
      setError('Failed to save credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleAdditionalFieldChange = (key: string, value: string) => {
    setAdditionalFields(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Define additional fields needed for specific providers
  const getAdditionalFields = () => {
    const fields: Array<{ key: string; label: string; placeholder: string; required?: boolean }> = [];
    
    switch (provider.key) {
      case 'woocommerce':
        fields.push(
          { key: 'store_url', label: 'Store URL', placeholder: 'https://yourstore.com', required: true },
          { key: 'consumer_secret', label: 'Consumer Secret', placeholder: 'cs_...', required: true }
        );
        break;
      case 'activecampaign':
        fields.push(
          { key: 'api_url', label: 'API URL', placeholder: 'https://youraccountname.api-us1.com', required: true }
        );
        break;
      case 'twilio':
        fields.push(
          { key: 'account_sid', label: 'Account SID', placeholder: 'AC...', required: true }
        );
        break;
      case 'amazon-ses':
      case 'amazon-associates':
        fields.push(
          { key: 'secret_key', label: 'Secret Access Key', placeholder: 'Your AWS Secret Key', required: true },
          { key: 'region', label: 'AWS Region', placeholder: 'us-east-1', required: true }
        );
        break;
      case 'imap-smtp':
        fields.push(
          { key: 'imap_server', label: 'IMAP Server', placeholder: 'imap.gmail.com', required: true },
          { key: 'imap_port', label: 'IMAP Port', placeholder: '993', required: true },
          { key: 'smtp_server', label: 'SMTP Server', placeholder: 'smtp.gmail.com', required: true },
          { key: 'smtp_port', label: 'SMTP Port', placeholder: '587', required: true },
          { key: 'username', label: 'Username/Email', placeholder: 'your@email.com', required: true }
        );
        break;
    }
    
    return fields;
  };

  const providerSpecificFields = getAdditionalFields();

  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-md w-full text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            {provider.name} Connected!
          </h2>
          <p className="text-gray-300">
            Your credentials have been securely stored and encrypted.
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-2xl border border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {provider.icon ? (
              <img src={provider.icon} alt={provider.name} className="w-8 h-8" />
            ) : (
              <Key className="w-8 h-8 text-gray-400" />
            )}
            <div>
              <h1 className="text-xl font-bold text-white">
                Setup {provider.name}
              </h1>
              <p className="text-gray-400 text-sm">
                Manual API key configuration required
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Security Notice */}
          <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <h3 className="text-blue-300 font-semibold mb-1">Secure Storage</h3>
                <p className="text-blue-200 text-sm">
                  Your credentials will be encrypted and stored securely in Supabase. We never share or expose your credentials.
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Step-by-step setup:
            </h3>
            
            {provider.fallbackInstructions && (
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                  {provider.fallbackInstructions}
                </pre>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Need help?</span>
              <a
                href={provider.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                View Official Documentation
              </a>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          {/* Credential Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Primary API Key */}
            <div>
              <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                API Key / Secret *
              </label>
              <div className="relative">
                <input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={`Enter your ${provider.name} API key...`}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(apiKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  disabled={!apiKey}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* API Secret (if needed) */}
            {['woocommerce', 'shareasale', 'amazon-associates', 'amazon-ses'].includes(provider.key) && (
              <div>
                <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-300 mb-2">
                  API Secret {['woocommerce', 'amazon-associates', 'amazon-ses'].includes(provider.key) ? '*' : ''}
                </label>
                <div className="relative">
                  <input
                    id="apiSecret"
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Enter your API secret..."
                    className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                    required={['woocommerce', 'amazon-associates', 'amazon-ses'].includes(provider.key)}
                  />
                </div>
              </div>
            )}

            {/* Additional Fields */}
            {providerSpecificFields.map((field) => (
              <div key={field.key}>
                <label htmlFor={field.key} className="block text-sm font-medium text-gray-300 mb-2">
                  {field.label} {field.required ? '*' : ''}
                </label>
                <input
                  id={field.key}
                  type={field.key.includes('password') || field.key.includes('secret') ? 'password' : 'text'}
                  value={additionalFields[field.key] || ''}
                  onChange={(e) => handleAdditionalFieldChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                  required={field.required}
                />
              </div>
            ))}

            <p className="text-gray-400 text-xs">
              Your credentials will be encrypted before storage in Supabase
            </p>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!apiKey.trim() || isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Save & Connect
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ManualSetupModal;