import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IntegrationState, ConnectedPlatform } from '../types';
import { CredentialManager, DatabaseCredential } from '../lib/credentialManager';

interface ExtendedIntegrationState extends IntegrationState {
  currentUserId: string | null;
  setCurrentUserId: (userId: string | null) => void;
  loadCredentialsFromDatabase: () => Promise<void>;
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
}

export const useIntegrationStore = create<ExtendedIntegrationState>()(
  persist(
    (set, get) => ({
      connectedPlatforms: new Map(),
      loadingProviders: new Set(),
      currentUserId: null,
      
      setCurrentUserId: (userId: string | null) => {
        set({ currentUserId: userId });
        if (userId) {
          get().loadCredentialsFromDatabase();
        } else {
          set({ connectedPlatforms: new Map() });
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

        const result = await CredentialManager.saveCredential(
          currentUserId,
          platform,
          platformName,
          credentialData
        );

        if (result.success) {
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

          return true;
        }

        return false;
      },

      deleteCredentialFromDatabase: async (platform: string): Promise<boolean> => {
        const { currentUserId } = get();
        if (!currentUserId) return false;

        const result = await CredentialManager.deleteCredential(currentUserId, platform);

        if (result.success) {
          set((state) => {
            const newConnectedPlatforms = new Map(state.connectedPlatforms);
            newConnectedPlatforms.delete(platform);
            return { connectedPlatforms: newConnectedPlatforms };
          });

          return true;
        }

        return false;
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
        loadingProviders: Array.from((state.loadingProviders instanceof Set ? state.loadingProviders : new Set()) || [])
      }),
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        return {
          ...parsed,
          connectedPlatforms: new Map(parsed.connectedPlatforms || []),
          loadingProviders: new Set(parsed.loadingProviders || [])
        };
      }
    }
  )
);