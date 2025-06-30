export interface Provider {
  name: string;
  key: string;
  icon: string;
  authType: 'oauth' | 'manual';
  providerId?: string;
  scopes?: string[];
  docsUrl: string;
  fallbackInstructions?: string;
  category: string;
  isConnected?: boolean;
}

export interface ConnectedPlatform {
  platform: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: string;
  connectedAt: string;
  credentialType?: 'oauth' | 'api_key' | 'manual';
  additionalData?: Record<string, any>;
}

export interface IntegrationState {
  connectedPlatforms: Map<string, ConnectedPlatform>;
  loadingProviders: Set<string>;
  setLoading: (providerKey: string, isLoading: boolean) => void;
  connectPlatform: (platform: string, tokens: Omit<ConnectedPlatform, 'platform'>) => void;
  disconnectPlatform: (platform: string) => void;
  isConnected: (platform: string) => boolean;
}