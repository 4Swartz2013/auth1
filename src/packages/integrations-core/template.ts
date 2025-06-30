import { z } from 'zod';

// Provider configuration schema
export const ProviderConfigSchema = z.object({
  key: z.string(),
  name: z.string(),
  description: z.string().optional(),
  logoUrl: z.string().optional(),
  authType: z.enum(['oauth', 'api_key', 'manual']),
  apiBaseUrl: z.string().optional(),
  docsUrl: z.string().optional(),
  webhookSupport: z.boolean().default(false),
  supportsRefresh: z.boolean().default(false),
  defaultScopes: z.array(z.string()).optional(),
  requiredScopes: z.array(z.string()).optional(),
  apiVersion: z.string().optional(),
  rateLimits: z.record(z.string(), z.number()).optional(),
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Bootstrap options schema
export const BootstrapOptionsSchema = z.object({
  userId: z.string().uuid(),
  integrationId: z.string().uuid(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  additionalData: z.record(z.unknown()).optional(),
});

export type BootstrapOptions = z.infer<typeof BootstrapOptionsSchema>;

// Bootstrap result schema
export const BootstrapResultSchema = z.object({
  success: z.boolean(),
  webhookId: z.string().optional(),
  webhookSecret: z.string().optional(),
  initialSyncCompleted: z.boolean().default(false),
  error: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type BootstrapResult = z.infer<typeof BootstrapResultSchema>;

// Refresh options schema
export const RefreshOptionsSchema = z.object({
  userId: z.string().uuid(),
  integrationId: z.string().uuid(),
  refreshToken: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
});

export type RefreshOptions = z.infer<typeof RefreshOptionsSchema>;

// Refresh result schema
export const RefreshResultSchema = z.object({
  success: z.boolean(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.string().optional(),
  error: z.string().optional(),
});

export type RefreshResult = z.infer<typeof RefreshResultSchema>;

// Revoke options schema
export const RevokeOptionsSchema = z.object({
  userId: z.string().uuid(),
  integrationId: z.string().uuid(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
});

export type RevokeOptions = z.infer<typeof RevokeOptionsSchema>;

// Revoke result schema
export const RevokeResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
});

export type RevokeResult = z.infer<typeof RevokeResultSchema>;

// Base provider interface
export interface IntegrationProvider {
  config: ProviderConfig;
  bootstrap: (options: BootstrapOptions) => Promise<BootstrapResult>;
  refreshToken: (options: RefreshOptions) => Promise<RefreshResult>;
  revokeAccess: (options: RevokeOptions) => Promise<RevokeResult>;
}

// Base provider implementation
export abstract class BaseIntegrationProvider implements IntegrationProvider {
  constructor(public config: ProviderConfig) {}

  abstract bootstrap(options: BootstrapOptions): Promise<BootstrapResult>;
  abstract refreshToken(options: RefreshOptions): Promise<RefreshResult>;
  abstract revokeAccess(options: RevokeOptions): Promise<RevokeResult>;

  // Helper methods that can be used by derived classes
  protected async makeRequest<T>(
    url: string,
    options: RequestInit,
    accessToken?: string
  ): Promise<T> {
    const headers = new Headers(options.headers);
    
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // Not JSON
      }
      
      throw new Error(
        errorJson?.error_description || 
        errorJson?.error || 
        errorJson?.message || 
        `Request failed with status ${response.status}`
      );
    }
    
    return response.json();
  }
  
  protected getApiUrl(endpoint: string): string {
    if (!this.config.apiBaseUrl) {
      throw new Error('API base URL not defined for this provider');
    }
    
    const baseUrl = this.config.apiBaseUrl.endsWith('/')
      ? this.config.apiBaseUrl.slice(0, -1)
      : this.config.apiBaseUrl;
      
    const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${baseUrl}${path}`;
  }
}

export { BaseIntegrationProvider }