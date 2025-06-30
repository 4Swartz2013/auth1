import { BaseIntegrationProvider, BootstrapOptions, BootstrapResult, RefreshOptions, RefreshResult, RevokeOptions, RevokeResult } from './template';

export class InstagramProvider extends BaseIntegrationProvider {
  constructor() {
    super({
      key: 'instagram',
      name: 'Instagram',
      description: 'Connect to Instagram to access user profile and media',
      logoUrl: '/icons/instagram.svg',
      authType: 'oauth',
      apiBaseUrl: 'https://graph.instagram.com',
      docsUrl: 'https://developers.facebook.com/docs/instagram-basic-display-api',
      webhookSupport: false,
      supportsRefresh: true,
      defaultScopes: ['user_profile', 'user_media'],
      requiredScopes: ['user_profile'],
      apiVersion: 'v18.0',
      rateLimits: {
        'requests_per_hour': 200
      }
    });
  }

  async bootstrap(options: BootstrapOptions): Promise<BootstrapResult> {
    try {
      const { accessToken, userId, integrationId } = options;
      
      // Validate the token by making a simple API call to get user profile
      try {
        const userProfile = await this.makeRequest<any>(
          `${this.config.apiBaseUrl}/me?fields=id,username,account_type&access_token=${accessToken}`,
          { method: 'GET' }
        );
        
        // Store user metadata
        return {
          success: true,
          initialSyncCompleted: true,
          metadata: {
            instagramUserId: userProfile.id,
            username: userProfile.username,
            accountType: userProfile.account_type,
            lastSyncTime: new Date().toISOString()
          }
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to validate Instagram access token: ${error.message}`,
          initialSyncCompleted: false
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Instagram bootstrap failed: ${error.message}`,
        initialSyncCompleted: false
      };
    }
  }

  async refreshToken(options: RefreshOptions): Promise<RefreshResult> {
    try {
      const { refreshToken, clientId, clientSecret } = options;
      
      // For Instagram, we refresh by extending the existing token
      // Note: refreshToken is actually the access token for Instagram
      const response = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error?.message || 'Failed to refresh access token'
        };
      }
      
      return {
        success: true,
        accessToken: data.access_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: `Instagram token refresh failed: ${error.message}`
      };
    }
  }

  async revokeAccess(options: RevokeOptions): Promise<RevokeResult> {
    // Instagram Basic Display API doesn't have a dedicated revoke endpoint
    // We consider the token revoked on our end
    return { success: true };
  }
}