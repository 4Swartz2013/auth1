import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IntegrationState, ConnectedPlatform, Integration } from '../types';
import { CredentialManager, DatabaseCredential, IntegrationLog } from '../lib/credentialManager';
import { toast } from '../lib/toast';

interface ExtendedIntegrationState extends IntegrationState {
  currentUserId: string | null;
  integrations: Map<string, Integration>;
  isLoadingIntegrations: boolean;
  error: string | null;
  
  // Actions
  setCurrentUserId: (userId: string | null) => void;
  loadCredentialsFromDatabase: () => Promise<void>;
  loadIntegrationsFromDatabase: () => Promise<void>;
  saveCredentialToDatabase: (
    platform: string,
    platformName: string,
    credentialData: {
      type: 'oauth' | 'api_key' | 'manual';
      accessToken?: string;
      refreshToken?: string;
      apiKey?: string;
      apiSecret?: string;
      additionalData?: Record<string, any>;
      expiresAt?: string;
    }
  ) => Promise<boolean>;
  deleteCredentialFromDatabase: (platform: string) => Promise<boolean>;
  refreshIntegration: (integrationId: string) => Promise<{ success: boolean; error?: string }>;
  getIntegrationLogs: (platform: string, limit?: number) => Promise<IntegrationLog[]>;
  getIntegrationDetails: (integrationId: string) => Promise<Integration | null>;
}

export const useIntegrationStore = create<ExtendedIntegrationState>()(
  persist(
    (set, get) => ({
      connectedPlatforms: new Map(),
      loadingProviders: new Set(),
      currentUserId: null,
      integrations: new Map(),
      isLoadingIntegrations: false,
      error: null,
      
      setCurrentUserId: (userId: string | null) => {
        set({ currentUserId: userId });
        if (userId) {
          get().loadCredentialsFromDatabase();
          get().loadIntegrationsFromDatabase();
        } else {
          set({ 
            connectedPlatforms: new Map(),
            integrations: new Map()
          });
        }
      },

      loadCredentialsFromDatabase: async () => {
        const { currentUserId } = get();
        if (!currentUserId) return;

        try {
          const credentials = await CredentialManager.getCredentials(currentUserId);
          const connectedPlatforms = new Map<string, ConnectedPlatform>();

          credentials.forEach((cred: DatabaseCredential) => {
            connectedPlatforms.set(cred.platform, {
              platform: cred.platform,
              accessToken: cred.access_token || cred.api_key || '',
              refreshToken: cred.refresh_token,
              expiresAt: cred.expires_at,
              connectedAt: cred.created_at,
              credentialType: cred.credential_type,
              additionalData: cred.additional_data
            });
          });

          set({ connectedPlatforms });
        } catch (error) {
          console.error('Failed to load credentials from database:', error);
          set({ error: 'Failed to load credentials' });
        }
      },

      loadIntegrationsFromDatabase: async () => {
        const { currentUserId } = get();
        if (!currentUserId) return;

        set({ isLoadingIntegrations: true, error: null });

        try {
          const integrations = await CredentialManager.getIntegrations(currentUserId);
          const integrationsMap = new Map<string, Integration>();
          
          integrations.forEach((integration: Integration) => {
            integrationsMap.set(integration.id, integration);
          });

          set({ integrations: integrationsMap, isLoadingIntegrations: false });
        } catch (error) {
          console.error('Failed to load integrations:', error);
          set({ 
            error: 'Failed to load integrations', 
            isLoadingIntegrations: false 
          });
        }
      },

      saveCredentialToDatabase: async (
        platform: string,
        platformName: string,
        credentialData: {
          type: 'oauth' | 'api_key' | 'manual';
          accessToken?: string;
          refreshToken?: string;
          apiKey?: string;
          apiSecret?: string;
          additionalData?: Record<string, any>;
          expiresAt?: string;
        }
      ): Promise<boolean> => {
        const { currentUserId } = get();
        if (!currentUserId) return false;

        set({ error: null });
        
        try {
          // Call the Edge Function to store credentials securely
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storeCredentials`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              userId: currentUserId,
              providerKey: platform,
              providerName: platformName,
              credentialType: credentialData.type,
              accessToken: credentialData.accessToken,
              refreshToken: credentialData.refreshToken,
              apiKey: credentialData.apiKey,
              apiSecret: credentialData.apiSecret,
              expiresAt: credentialData.expiresAt,
              additionalData: credentialData.additionalData
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to store credentials');
          }

          const result = await response.json();
          
          // Update local state
          const connectedPlatform: ConnectedPlatform = {
            platform,
            accessToken: credentialData.accessToken || credentialData.apiKey || '',
            refreshToken: credentialData.refreshToken,
            expiresAt: credentialData.expiresAt,
            connectedAt: new Date().toISOString(),
            credentialType: credentialData.type,
            additionalData: credentialData.additionalData
          };

          set((state) => {
            const newConnectedPlatforms = new Map(state.connectedPlatforms);
            newConnectedPlatforms.set(platform, connectedPlatform);
            return { connectedPlatforms: newConnectedPlatforms };
          });

          // Reload integrations to get the new one
          await get().loadIntegrationsFromDatabase();
          
          // Show toast notification for bootstrap job
          if (result.jobId) {
            toast.success(`${platformName} connected! Setting up integration...`);
            
            // In a real app, we would listen for job completion
            // For this example, we'll simulate job completion after a delay
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('integration_bootstrapped', {
                detail: {
                  provider: platformName,
                  success: true
                }
              }));
            }, 3000);
          }

          return true;
        } catch (error) {
          console.error('Error saving credential:', error);
          set({ error: error.message });
          return false;
        }
      },

      deleteCredentialFromDatabase: async (platform: string): Promise<boolean> => {
        const { currentUserId } = get();
        if (!currentUserId) return false;

        set({ error: null });
        
        try {
          // Find the integration ID for this platform
          const integrations = Array.from(get().integrations.values());
          const integration = integrations.find(i => i.providerKey === platform);
          
          if (!integration) {
            throw new Error('Integration not found');
          }
          
          // Call the Edge Function to revoke the token
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revokeToken`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              integrationId: integration.id,
              userId: currentUserId
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to revoke token');
          }

          // Update local state
          set((state) => {
            const newConnectedPlatforms = new Map(state.connectedPlatforms);
            newConnectedPlatforms.delete(platform);
            
            const newIntegrations = new Map(state.integrations);
            if (integration) {
              newIntegrations.delete(integration.id);
            }
            
            return { 
              connectedPlatforms: newConnectedPlatforms,
              integrations: newIntegrations
            };
          });

          return true;
        } catch (error) {
          console.error('Error deleting credential:', error);
          set({ error: error.message });
          return false;
        }
      },
      
      refreshIntegration: async (integrationId: string): Promise<{ success: boolean; error?: string }> => {
        const { currentUserId } = get();
        if (!currentUserId) return { success: false, error: 'User not authenticated' };

        set({ error: null });
        
        try {
          // Call the Edge Function to refresh the token
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refreshToken`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              integrationId,
              userId: currentUserId
            })
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to refresh token');
          }

          // Reload integrations to get the updated one
          await get().loadIntegrationsFromDatabase();
          await get().loadCredentialsFromDatabase();
          
          return { success: true };
        } catch (error) {
          console.error('Error refreshing integration:', error);
          set({ error: error.message });
          return { success: false, error: error.message };
        }
      },
      
      getIntegrationLogs: async (platform: string, limit: number = 50): Promise<IntegrationLog[]> => {
        const { currentUserId } = get();
        if (!currentUserId) return [];

        try {
          return await CredentialManager.getIntegrationLogs(currentUserId, platform, limit);
        } catch (error) {
          console.error('Error fetching integration logs:', error);
          return [];
        }
      },
      
      getIntegrationDetails: async (integrationId: string): Promise<Integration | null> => {
        const { integrations } = get();
        const integration = integrations.get(integrationId);
        
        if (integration) {
          return integration;
        }
        
        // If not in local state, try to reload from database
        try {
          await get().loadIntegrationsFromDatabase();
          const updatedIntegrations = get().integrations;
          return updatedIntegrations.get(integrationId) || null;
        } catch (error) {
          console.error('Error fetching integration details:', error);
          return null;
        }
      },
      
      setLoading: (providerKey: string, isLoading: boolean) =>
        set((state) => {
          // Ensure loadingProviders is always a Set
          const currentLoadingProviders = state.loadingProviders instanceof Set 
            ? state.loadingProviders 
            : new Set(Array.isArray(state.loadingProviders) ? state.loadingProviders : []);
          
          const newLoadingProviders = new Set(currentLoadingProviders);
          if (isLoading) {
            newLoadingProviders.add(providerKey);
          } else {
            newLoadingProviders.delete(providerKey);
          }
          return { loadingProviders: newLoadingProviders };
        }),
      
      connectPlatform: (platform: string, tokens: Omit<ConnectedPlatform, 'platform'>) =>
        set((state) => {
          const newConnectedPlatforms = new Map(state.connectedPlatforms);
          newConnectedPlatforms.set(platform, { platform, ...tokens });
          return { connectedPlatforms: newConnectedPlatforms };
        }),
      
      disconnectPlatform: (platform: string) =>
        set((state) => {
          const newConnectedPlatforms = new Map(state.connectedPlatforms);
          newConnectedPlatforms.delete(platform);
          return { connectedPlatforms: newConnectedPlatforms };
        }),
      
      isConnected: (platform: string) => {
        return get().connectedPlatforms.has(platform);
      }
    }),
    {
      name: 'integration-storage',
      serialize: (state) => JSON.stringify({
        ...state,
        connectedPlatforms: Array.from((state.connectedPlatforms || new Map()).entries()),
        loadingProviders: Array.from((state.loadingProviders instanceof Set ? state.loadingProviders : new Set()) || []),
        integrations: Array.from((state.integrations || new Map()).entries())
      }),
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          ...parsed,
          connectedPlatforms: new Map(parsed.connectedPlatforms || []),
          loadingProviders: new Set(parsed.loadingProviders || []),
          integrations: new Map(parsed.integrations || [])
        };
      }
    }
  )
);