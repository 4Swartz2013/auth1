import { GmailProvider } from '../../../src/packages/integrations-core/gmail';
import { BootstrapOptions, RefreshOptions, RevokeOptions } from '../../../src/packages/integrations-core/template';

// Mock fetch
global.fetch = jest.fn();

describe('GmailProvider', () => {
  let provider: GmailProvider;
  
  beforeEach(() => {
    provider = new GmailProvider();
    jest.clearAllMocks();
    
    // Default mock implementation for fetch
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({})
    });
  });
  
  it('initializes with correct configuration', () => {
    expect(provider.config.key).toBe('gmail');
    expect(provider.config.name).toBe('Gmail');
    expect(provider.config.authType).toBe('oauth');
    expect(provider.config.apiBaseUrl).toBe('https://gmail.googleapis.com/gmail/v1');
    expect(provider.config.webhookSupport).toBe(true);
    expect(provider.config.supportsRefresh).toBe(true);
  });
  
  describe('bootstrap', () => {
    it('successfully bootstraps the integration', async () => {
      // Mock makeRequest to return user profile
      jest.spyOn(provider as any, 'makeRequest').mockResolvedValue({
        emailAddress: 'test@example.com',
        messagesTotal: 100
      });
      
      const options: BootstrapOptions = {
        userId: 'test-user-id',
        integrationId: 'test-integration-id',
        accessToken: 'test-access-token'
      };
      
      const result = await provider.bootstrap(options);
      
      expect(result.success).toBe(true);
      expect(result.initialSyncCompleted).toBe(true);
      expect(result.webhookId).toBeDefined();
      expect(result.webhookSecret).toBeDefined();
    });
    
    it('handles errors during bootstrap', async () => {
      // Mock makeRequest to throw an error
      jest.spyOn(provider as any, 'makeRequest').mockRejectedValue(
        new Error('Invalid token')
      );
      
      const options: BootstrapOptions = {
        userId: 'test-user-id',
        integrationId: 'test-integration-id',
        accessToken: 'invalid-token'
      };
      
      const result = await provider.bootstrap(options);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to validate Gmail access token');
      expect(result.initialSyncCompleted).toBe(false);
    });
  });
  
  describe('refreshToken', () => {
    it('successfully refreshes the token', async () => {
      // Mock fetch to return new tokens
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600
        })
      });
      
      const options: RefreshOptions = {
        userId: 'test-user-id',
        integrationId: 'test-integration-id',
        refreshToken: 'test-refresh-token',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      };
      
      const result = await provider.refreshToken(options);
      
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.expiresAt).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(URLSearchParams)
        })
      );
    });
    
    it('handles errors during token refresh', async () => {
      // Mock fetch to return an error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'invalid_grant',
          error_description: 'Invalid refresh token'
        })
      });
      
      const options: RefreshOptions = {
        userId: 'test-user-id',
        integrationId: 'test-integration-id',
        refreshToken: 'invalid-refresh-token',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret'
      };
      
      const result = await provider.refreshToken(options);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
    });
  });
  
  describe('revokeAccess', () => {
    it('successfully revokes access', async () => {
      // Mock fetch to return success
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({})
      });
      
      const options: RevokeOptions = {
        userId: 'test-user-id',
        integrationId: 'test-integration-id',
        accessToken: 'test-access-token'
      };
      
      const result = await provider.revokeAccess(options);
      
      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://oauth2.googleapis.com/revoke'),
        expect.any(Object)
      );
    });
    
    it('requires an access token', async () => {
      const options: RevokeOptions = {
        userId: 'test-user-id',
        integrationId: 'test-integration-id'
      };
      
      const result = await provider.revokeAccess(options);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Access token is required');
    });
    
    it('handles errors during revocation', async () => {
      // Mock fetch to return an error
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          error: 'invalid_token',
          error_description: 'Invalid token'
        })
      });
      
      const options: RevokeOptions = {
        userId: 'test-user-id',
        integrationId: 'test-integration-id',
        accessToken: 'invalid-token'
      };
      
      const result = await provider.revokeAccess(options);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid token');
    });
  });
});