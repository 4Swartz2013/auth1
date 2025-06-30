import { BaseIntegrationProvider, BootstrapOptions, BootstrapResult, RefreshOptions, RefreshResult, RevokeOptions, RevokeResult } from './template';

export class SlackProvider extends BaseIntegrationProvider {
  constructor() {
    super({
      key: 'slack',
      name: 'Slack',
      description: 'Connect to Slack to send messages and manage channels',
      logoUrl: '/icons/slack.svg',
      authType: 'oauth',
      apiBaseUrl: 'https://slack.com/api',
      docsUrl: 'https://api.slack.com/start',
      webhookSupport: true,
      supportsRefresh: false, // Slack tokens don't expire
      defaultScopes: ['channels:read', 'chat:write', 'team:read'],
      requiredScopes: ['channels:read', 'chat:write'],
      apiVersion: 'v2',
      rateLimits: {
        'tier_1': 1, // Tier 1 methods: 1 request per minute
        'tier_2': 20, // Tier 2 methods: 20 requests per minute
        'tier_3': 50, // Tier 3 methods: 50 requests per minute
        'tier_4': 100 // Tier 4 methods: 100 requests per minute
      }
    });
  }

  async bootstrap(options: BootstrapOptions): Promise<BootstrapResult> {
    try {
      const { accessToken, userId, integrationId, additionalData } = options;
      
      // Validate the token by making a simple API call
      try {
        const authTest = await this.makeRequest<any>(
          `${this.config.apiBaseUrl}/auth.test`,
          { 
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!authTest.ok) {
          throw new Error(authTest.error || 'Failed to validate Slack token');
        }
        
        // Get team info
        const teamInfo = await this.makeRequest<any>(
          `${this.config.apiBaseUrl}/team.info`,
          { 
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!teamInfo.ok) {
          throw new Error(teamInfo.error || 'Failed to get team info');
        }
        
        // Set up webhook (Events API)
        // In a real implementation, you would register an Events API endpoint
        // For this example, we'll simulate webhook setup
        const webhookId = `slack-webhook-${Date.now()}`;
        const webhookSecret = `secret-${Math.random().toString(36).substring(2, 15)}`;
        
        return {
          success: true,
          webhookId,
          webhookSecret,
          initialSyncCompleted: true,
          metadata: {
            teamId: teamInfo.team.id,
            teamName: teamInfo.team.name,
            teamDomain: teamInfo.team.domain,
            userId: authTest.user_id,
            userName: authTest.user,
            botUserId: additionalData?.bot_user_id,
            lastSyncTime: new Date().toISOString()
          }
        };
      } catch (error) {
        return {
          success: false,
          error: `Failed to validate Slack access token: ${error.message}`,
          initialSyncCompleted: false
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Slack bootstrap failed: ${error.message}`,
        initialSyncCompleted: false
      };
    }
  }

  async refreshToken(options: RefreshOptions): Promise<RefreshResult> {
    // Slack tokens don't expire, so no refresh is needed
    return {
      success: false,
      error: 'Slack does not support token refresh'
    };
  }

  async revokeAccess(options: RevokeOptions): Promise<RevokeResult> {
    try {
      const { accessToken, clientId, clientSecret } = options;
      
      if (!accessToken) {
        return {
          success: false,
          error: 'Access token is required to revoke Slack access'
        };
      }
      
      // Call Slack's revoke endpoint
      const response = await fetch(`${this.config.apiBaseUrl}/auth.revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.error || 'Failed to revoke access token'
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Slack access revocation failed: ${error.message}`
      };
    }
  }

  verifyWebhook(headers: Record<string, string>, body: Uint8Array): boolean {
    // In a real implementation, you would verify the signature from Slack
    // For this example, we'll just return true
    return true;
  }
}