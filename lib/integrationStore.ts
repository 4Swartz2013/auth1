import { create } from 'zustand';

interface IntegrationStore {
  loadingProviders: Set<string>;
  connectedPlatforms: Set<string>;
  setLoading: (providerKey: string, isLoading: boolean) => void;
  updateConnectionStatus: (platform: string, isConnected: boolean) => void;
}

export const useIntegrationStore = create<IntegrationStore>((set) => ({
  loadingProviders: new Set(),
  connectedPlatforms: new Set(),
  
  setLoading: (providerKey: string, isLoading: boolean) =>
    set((state) => {
      const newLoadingProviders = new Set(state.loadingProviders);
      if (isLoading) {
        newLoadingProviders.add(providerKey);
      } else {
        newLoadingProviders.delete(providerKey);
      }
      return { loadingProviders: newLoadingProviders };
    }),
    
  updateConnectionStatus: (platform: string, isConnected: boolean) =>
    set((state) => {
      const newConnectedPlatforms = new Set(state.connectedPlatforms);
      if (isConnected) {
        newConnectedPlatforms.add(platform);
      } else {
        newConnectedPlatforms.delete(platform);
      }
      return { connectedPlatforms: newConnectedPlatforms };
    }),
}));