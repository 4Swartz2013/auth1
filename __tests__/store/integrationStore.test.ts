import { act, renderHook } from '@testing-library/react-hooks';
import { useIntegrationStore } from '../../src/store/integrationStore';

// Mock fetch
global.fetch = jest.fn();

describe('integrationStore', () => {
  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Mock fetch implementation
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        integrationId: 'mock-integration-id',
        jobId: 'mock-job-id'
      })
    });
  });

  it('initializes with default values', () => {
    const { result } = renderHook(() => useIntegrationStore());
    
    expect(result.current.connectedPlatforms).toBeInstanceOf(Map);
    expect(result.current.connectedPlatforms.size).toBe(0);
    expect(result.current.loadingProviders).toBeInstanceOf(Set);
    expect(result.current.loadingProviders.size).toBe(0);
    expect(result.current.currentUserId).toBeNull();
    expect(result.current.integrations).toBeInstanceOf(Map);
    expect(result.current.integrations.size).toBe(0);
    expect(result.current.isLoadingIntegrations).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets current user ID', () => {
    const { result } = renderHook(() => useIntegrationStore());
    
    act(() => {
      result.current.setCurrentUserId('test-user-id');
    });
    
    expect(result.current.currentUserId).toBe('test-user-id');
  });

  it('saves credential to database', async () => {
    const { result } = renderHook(() => useIntegrationStore());
    
    // Set current user ID
    act(() => {
      result.current.setCurrentUserId('test-user-id');
    });
    
    // Save credential
    let success;
    await act(async () => {
      success = await result.current.saveCredentialToDatabase(
        'test-provider',
        'Test Provider',
        {
          type: 'oauth',
          accessToken: 'test-access-token',
          refreshToken: 'test-refresh-token'
        }
      );
    });
    
    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/storeCredentials'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('test-access-token')
      })
    );
    expect(result.current.connectedPlatforms.has('test-provider')).toBe(true);
  });

  it('deletes credential from database', async () => {
    const { result } = renderHook(() => useIntegrationStore());
    
    // Set current user ID and add a connected platform
    act(() => {
      result.current.setCurrentUserId('test-user-id');
      result.current.connectPlatform('test-provider', {
        accessToken: 'test-access-token',
        connectedAt: new Date().toISOString()
      });
      
      // Add a mock integration
      const integrations = new Map();
      integrations.set('mock-integration-id', {
        id: 'mock-integration-id',
        userId: 'test-user-id',
        providerKey: 'test-provider',
        providerName: 'Test Provider',
        status: 'connected',
        healthScore: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      result.current.integrations = integrations;
    });
    
    // Delete credential
    let success;
    await act(async () => {
      success = await result.current.deleteCredentialFromDatabase('test-provider');
    });
    
    expect(success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/revokeToken'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('mock-integration-id')
      })
    );
    expect(result.current.connectedPlatforms.has('test-provider')).toBe(false);
  });

  it('refreshes integration', async () => {
    const { result } = renderHook(() => useIntegrationStore());
    
    // Set current user ID
    act(() => {
      result.current.setCurrentUserId('test-user-id');
    });
    
    // Refresh integration
    let refreshResult;
    await act(async () => {
      refreshResult = await result.current.refreshIntegration('mock-integration-id');
    });
    
    expect(refreshResult.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/refreshToken'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('mock-integration-id')
      })
    );
  });

  it('handles errors when saving credentials', async () => {
    // Mock fetch to return an error
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: jest.fn().mockResolvedValue({
        error: 'Failed to store credentials'
      })
    });
    
    const { result } = renderHook(() => useIntegrationStore());
    
    // Set current user ID
    act(() => {
      result.current.setCurrentUserId('test-user-id');
    });
    
    // Save credential
    let success;
    await act(async () => {
      success = await result.current.saveCredentialToDatabase(
        'test-provider',
        'Test Provider',
        {
          type: 'oauth',
          accessToken: 'test-access-token'
        }
      );
    });
    
    expect(success).toBe(false);
    expect(result.current.error).toBe('Failed to store credentials');
    expect(result.current.connectedPlatforms.has('test-provider')).toBe(false);
  });
});