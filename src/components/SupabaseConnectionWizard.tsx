import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, Key, CheckCircle, AlertTriangle, ExternalLink, Copy } from 'lucide-react';

interface SupabaseConnectionWizardProps {
  onConnectionComplete: (url: string, anonKey: string) => void;
  onClose: () => void;
}

const SupabaseConnectionWizard: React.FC<SupabaseConnectionWizardProps> = ({ 
  onConnectionComplete, 
  onClose 
}) => {
  const [step, setStep] = useState(1);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateConnection = async () => {
    if (!supabaseUrl || !anonKey) {
      setError('Please fill in both URL and Anon Key');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Test the connection
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`
        }
      });

      if (response.ok) {
        onConnectionComplete(supabaseUrl, anonKey);
      } else {
        setError('Invalid Supabase credentials. Please check your URL and API key.');
      }
    } catch (error) {
      setError('Failed to connect to Supabase. Please check your credentials.');
    } finally {
      setIsValidating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
            <Database className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">
                Connect to Supabase
              </h1>
              <p className="text-gray-400 text-sm">
                Connect your existing Supabase project
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="text-blue-300 font-semibold mb-1">Step 1: Get Your Supabase Credentials</h3>
                    <p className="text-blue-200 text-sm mb-3">
                      You'll need your Project URL and anon public key from your Supabase dashboard.
                    </p>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Supabase Dashboard
                    </a>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Instructions:</h4>
                  <ol className="text-gray-300 text-sm space-y-2 list-decimal list-inside">
                    <li>Go to your Supabase project dashboard</li>
                    <li>Click on "Settings" in the sidebar</li>
                    <li>Go to "API" section</li>
                    <li>Copy your "Project URL" and "anon public" key</li>
                    <li>Paste them in the form below</li>
                  </ol>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="supabaseUrl" className="block text-sm font-medium text-gray-300 mb-2">
                      Project URL *
                    </label>
                    <div className="relative">
                      <input
                        id="supabaseUrl"
                        type="url"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://your-project.supabase.co"
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(supabaseUrl)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        disabled={!supabaseUrl}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="anonKey" className="block text-sm font-medium text-gray-300 mb-2">
                      Anon Public Key *
                    </label>
                    <div className="relative">
                      <input
                        id="anonKey"
                        type="password"
                        value={anonKey}
                        onChange={(e) => setAnonKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(anonKey)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        disabled={!anonKey}
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={validateConnection}
                    disabled={!supabaseUrl || !anonKey || isValidating}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isValidating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Connect Database
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SupabaseConnectionWizard;