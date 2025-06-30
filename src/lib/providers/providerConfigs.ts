import { z } from 'zod';

// Provider configuration schema
export const ProviderConfigSchema = z.object({
  key: z.string(),
  name: z.string(),
  defaultScopes: z.array(z.string()),
  authorizationUrl: z.string(),
  tokenUrl: z.string(),
  revokeUrl: z.string().optional(),
  userInfoUrl: z.string().optional(),
  getAuthorizationUrl: z.function()
    .args(z.object({
      clientId: z.string(),
      redirectUri: z.string(),
      scopes: z.array(z.string()).optional(),
      state: z.string(),
      additionalParams: z.record(z.string(), z.string()).optional()
    }))
    .returns(z.string()),
  exchangeCodeForTokens: z.function()
    .args(z.object({
      code: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
      redirectUri: z.string()
    }))
    .returns(z.promise(z.object({
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      additionalData: z.record(z.unknown()).optional(),
      error: z.string().optional()
    }))),
  refreshAccessToken: z.function()
    .args(z.object({
      refreshToken: z.string(),
      clientId: z.string(),
      clientSecret: z.string()
    }))
    .returns(z.promise(z.object({
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      expiresAt: z.string().optional(),
      error: z.string().optional()
    }))),
  revokeToken: z.function()
    .args(z.object({
      token: z.string(),
      clientId: z.string(),
      clientSecret: z.string(),
      tokenType: z.enum(['access_token', 'refresh_token']).optional()
    }))
    .returns(z.promise(z.object({
      success: z.boolean(),
      error: z.string().optional()
    })))
});

export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

// Google provider configuration
const googleProvider: ProviderConfig = {
  key: 'google',
  name: 'Google',
  defaultScopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
  authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  revokeUrl: 'https://oauth2.googleapis.com/revoke',
  userInfoUrl: 'https://www.googleapis.com/oauth2/v3/userinfo',
  
  getAuthorizationUrl: ({ clientId, redirectUri, scopes, state, additionalParams }) => {
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes?.join(' ') || 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
    url.searchParams.append('state', state);
    url.searchParams.append('access_type', 'offline');
    url.searchParams.append('prompt', 'consent');
    
    // Add any additional parameters
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error_description || data.error || 'Failed to exchange code for tokens'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
        additionalData: {
          tokenType: data.token_type,
          idToken: data.id_token,
          scope: data.scope
        }
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error_description || data.error || 'Failed to refresh access token'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken, // Some providers don't return a new refresh token
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to refresh access token'
      };
    }
  },
  
  revokeToken: async ({ token, clientId, clientSecret }) => {
    try {
      const response = await fetch('https://oauth2.googleapis.com/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          token,
          client_id: clientId,
          client_secret: clientSecret
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.error_description || data.error || 'Failed to revoke token'
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to revoke token'
      };
    }
  }
};

// Facebook provider configuration
const facebookProvider: ProviderConfig = {
  key: 'facebook',
  name: 'Facebook',
  defaultScopes: ['email', 'public_profile'],
  authorizationUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
  tokenUrl: 'https://graph.facebook.com/v18.0/oauth/access_token',
  userInfoUrl: 'https://graph.facebook.com/me',
  
  getAuthorizationUrl: ({ clientId, redirectUri, scopes, state }) => {
    const url = new URL('https://www.facebook.com/v18.0/dialog/oauth');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes?.join(',') || 'email,public_profile');
    url.searchParams.append('state', state);
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error?.message || 'Failed to exchange code for tokens'
        };
      }
      
      return {
        accessToken: data.access_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
        additionalData: {
          tokenType: data.token_type
        }
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    // Facebook doesn't support refresh tokens in the same way as other providers
    // Long-lived tokens are used instead
    return {
      error: 'Facebook does not support token refresh. Please re-authenticate.'
    };
  },
  
  revokeToken: async ({ token, clientId, clientSecret }) => {
    try {
      const response = await fetch(`https://graph.facebook.com/v18.0/me/permissions?access_token=${token}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.error?.message || 'Failed to revoke token'
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to revoke token'
      };
    }
  }
};

// Instagram provider configuration
const instagramProvider: ProviderConfig = {
  key: 'instagram',
  name: 'Instagram',
  defaultScopes: ['user_profile', 'user_media'],
  authorizationUrl: 'https://api.instagram.com/oauth/authorize',
  tokenUrl: 'https://api.instagram.com/oauth/access_token',
  userInfoUrl: 'https://graph.instagram.com/me',
  
  getAuthorizationUrl: ({ clientId, redirectUri, scopes, state }) => {
    const url = new URL('https://api.instagram.com/oauth/authorize');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes?.join(' ') || 'user_profile user_media');
    url.searchParams.append('state', state);
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://api.instagram.com/oauth/access_token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        return {
          error: data.error_message || data.error?.message || 'Failed to exchange code for tokens'
        };
      }
      
      // Get long-lived token
      const longLivedResponse = await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${data.access_token}`);
      const longLivedData = await longLivedResponse.json();
      
      if (!longLivedResponse.ok || longLivedData.error) {
        return {
          error: longLivedData.error_message || longLivedData.error?.message || 'Failed to get long-lived token'
        };
      }
      
      return {
        accessToken: longLivedData.access_token,
        expiresAt: longLivedData.expires_in ? new Date(Date.now() + longLivedData.expires_in * 1000).toISOString() : undefined,
        additionalData: {
          userId: data.user_id
        }
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    try {
      // For Instagram, we refresh by extending the existing token
      const response = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`);
      
      const data = await response.json();
      
      if (!response.ok || data.error) {
        return {
          error: data.error_message || data.error?.message || 'Failed to refresh access token'
        };
      }
      
      return {
        accessToken: data.access_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to refresh access token'
      };
    }
  },
  
  revokeToken: async ({ token }) => {
    // Instagram doesn't have a dedicated revoke endpoint
    // We consider the token revoked on our end
    return { success: true };
  }
};

// LinkedIn provider configuration
const linkedinProvider: ProviderConfig = {
  key: 'linkedin',
  name: 'LinkedIn',
  defaultScopes: ['r_liteprofile', 'r_emailaddress'],
  authorizationUrl: 'https://www.linkedin.com/oauth/v2/authorization',
  tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
  userInfoUrl: 'https://api.linkedin.com/v2/me',
  
  getAuthorizationUrl: ({ clientId, redirectUri, scopes, state }) => {
    const url = new URL('https://www.linkedin.com/oauth/v2/authorization');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes?.join(' ') || 'r_liteprofile r_emailaddress');
    url.searchParams.append('state', state);
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error_description || data.error || 'Failed to exchange code for tokens'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    try {
      const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error_description || data.error || 'Failed to refresh access token'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to refresh access token'
      };
    }
  },
  
  revokeToken: async ({ token, clientId, clientSecret }) => {
    // LinkedIn doesn't have a dedicated revoke endpoint
    // We consider the token revoked on our end
    return { success: true };
  }
};

// Twitter/X provider configuration
const twitterProvider: ProviderConfig = {
  key: 'twitter',
  name: 'Twitter/X',
  defaultScopes: ['tweet.read', 'users.read', 'offline.access'],
  authorizationUrl: 'https://twitter.com/i/oauth2/authorize',
  tokenUrl: 'https://api.twitter.com/2/oauth2/token',
  revokeUrl: 'https://api.twitter.com/2/oauth2/revoke',
  userInfoUrl: 'https://api.twitter.com/2/users/me',
  
  getAuthorizationUrl: ({ clientId, redirectUri, scopes, state }) => {
    const url = new URL('https://twitter.com/i/oauth2/authorize');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes?.join(' ') || 'tweet.read users.read offline.access');
    url.searchParams.append('state', state);
    url.searchParams.append('code_challenge', 'challenge'); // In production, use PKCE
    url.searchParams.append('code_challenge_method', 'plain');
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: 'challenge' // In production, use PKCE
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error_description || data.error || 'Failed to exchange code for tokens'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined,
        additionalData: {
          tokenType: data.token_type,
          scope: data.scope
        }
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    try {
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error_description || data.error || 'Failed to refresh access token'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to refresh access token'
      };
    }
  },
  
  revokeToken: async ({ token, clientId, clientSecret }) => {
    try {
      const response = await fetch('https://api.twitter.com/2/oauth2/revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: new URLSearchParams({
          token,
          token_type_hint: 'access_token'
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.error_description || data.error || 'Failed to revoke token'
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to revoke token'
      };
    }
  }
};

// Slack provider configuration
const slackProvider: ProviderConfig = {
  key: 'slack',
  name: 'Slack',
  defaultScopes: ['channels:read', 'chat:write'],
  authorizationUrl: 'https://slack.com/oauth/v2/authorize',
  tokenUrl: 'https://slack.com/api/oauth.v2.access',
  revokeUrl: 'https://slack.com/api/auth.revoke',
  
  getAuthorizationUrl: ({ clientId, redirectUri, scopes, state }) => {
    const url = new URL('https://slack.com/oauth/v2/authorize');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', scopes?.join(' ') || 'channels:read chat:write');
    url.searchParams.append('state', state);
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        return {
          error: data.error || 'Failed to exchange code for tokens'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: undefined, // Slack tokens don't expire
        additionalData: {
          teamId: data.team?.id,
          teamName: data.team?.name,
          userId: data.authed_user?.id,
          botUserId: data.bot_user_id,
          appId: data.app_id
        }
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    // Slack tokens don't expire, so no refresh is needed
    return {
      error: 'Slack does not support token refresh'
    };
  },
  
  revokeToken: async ({ token }) => {
    try {
      const response = await fetch('https://slack.com/api/auth.revoke', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.ok) {
        return {
          success: false,
          error: data.error || 'Failed to revoke token'
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to revoke token'
      };
    }
  }
};

// HubSpot provider configuration
const hubspotProvider: ProviderConfig = {
  key: 'hubspot',
  name: 'HubSpot',
  defaultScopes: ['contacts'],
  authorizationUrl: 'https://app.hubspot.com/oauth/authorize',
  tokenUrl: 'https://api.hubapi.com/oauth/v1/token',
  revokeUrl: 'https://api.hubapi.com/oauth/v1/refresh-tokens/:token',
  
  getAuthorizationUrl: ({ clientId, redirectUri, scopes, state }) => {
    const url = new URL('https://app.hubspot.com/oauth/authorize');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('scope', scopes?.join(' ') || 'contacts');
    url.searchParams.append('state', state);
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.message || data.error || 'Failed to exchange code for tokens'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    try {
      const response = await fetch('https://api.hubapi.com/oauth/v1/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.message || data.error || 'Failed to refresh access token'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : undefined
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to refresh access token'
      };
    }
  },
  
  revokeToken: async ({ token, clientId, clientSecret }) => {
    try {
      const response = await fetch(`https://api.hubapi.com/oauth/v1/refresh-tokens/${token}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.message || data.error || 'Failed to revoke token'
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to revoke token'
      };
    }
  }
};

// Notion provider configuration
const notionProvider: ProviderConfig = {
  key: 'notion',
  name: 'Notion',
  defaultScopes: ['read_user', 'read_content', 'create_content'],
  authorizationUrl: 'https://api.notion.com/v1/oauth/authorize',
  tokenUrl: 'https://api.notion.com/v1/oauth/token',
  
  getAuthorizationUrl: ({ clientId, redirectUri, scopes, state }) => {
    const url = new URL('https://api.notion.com/v1/oauth/authorize');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('owner', 'user');
    url.searchParams.append('state', state);
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        },
        body: JSON.stringify({
          code,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error_description || data.error || 'Failed to exchange code for tokens'
        };
      }
      
      return {
        accessToken: data.access_token,
        expiresAt: undefined, // Notion tokens don't expire
        additionalData: {
          workspaceId: data.workspace_id,
          workspaceName: data.workspace_name,
          workspaceIcon: data.workspace_icon,
          botId: data.bot_id
        }
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    // Notion tokens don't expire, so no refresh is needed
    return {
      error: 'Notion does not support token refresh'
    };
  },
  
  revokeToken: async ({ token }) => {
    // Notion doesn't have a dedicated revoke endpoint
    // We consider the token revoked on our end
    return { success: true };
  }
};

// Stripe provider configuration
const stripeProvider: ProviderConfig = {
  key: 'stripe',
  name: 'Stripe',
  defaultScopes: ['read_write'],
  authorizationUrl: 'https://connect.stripe.com/oauth/authorize',
  tokenUrl: 'https://connect.stripe.com/oauth/token',
  revokeUrl: 'https://connect.stripe.com/oauth/deauthorize',
  
  getAuthorizationUrl: ({ clientId, redirectUri, scopes, state }) => {
    const url = new URL('https://connect.stripe.com/oauth/authorize');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('scope', scopes?.join(' ') || 'read_write');
    url.searchParams.append('state', state);
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://connect.stripe.com/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'authorization_code'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error_description || data.error || 'Failed to exchange code for tokens'
        };
      }
      
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: undefined, // Stripe tokens don't expire
        additionalData: {
          stripeUserId: data.stripe_user_id,
          stripePublishableKey: data.stripe_publishable_key,
          tokenType: data.token_type,
          scope: data.scope
        }
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    // Stripe tokens don't expire, so no refresh is needed
    return {
      error: 'Stripe does not support token refresh'
    };
  },
  
  revokeToken: async ({ token, clientId, clientSecret }) => {
    try {
      const response = await fetch('https://connect.stripe.com/oauth/deauthorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          stripe_user_id: token // For Stripe, we use the user ID as the token
        })
      });
      
      const data = await response.json();
      
      if (!response.ok || !data.stripe_user_id) {
        return {
          success: false,
          error: data.error_description || data.error || 'Failed to revoke token'
        };
      }
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message || 'Failed to revoke token'
      };
    }
  }
};

// Mailchimp provider configuration
const mailchimpProvider: ProviderConfig = {
  key: 'mailchimp',
  name: 'Mailchimp',
  defaultScopes: [],
  authorizationUrl: 'https://login.mailchimp.com/oauth2/authorize',
  tokenUrl: 'https://login.mailchimp.com/oauth2/token',
  
  getAuthorizationUrl: ({ clientId, redirectUri, state }) => {
    const url = new URL('https://login.mailchimp.com/oauth2/authorize');
    url.searchParams.append('client_id', clientId);
    url.searchParams.append('redirect_uri', redirectUri);
    url.searchParams.append('response_type', 'code');
    url.searchParams.append('state', state);
    return url.toString();
  },
  
  exchangeCodeForTokens: async ({ code, clientId, clientSecret, redirectUri }) => {
    try {
      const response = await fetch('https://login.mailchimp.com/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code'
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return {
          error: data.error || 'Failed to exchange code for tokens'
        };
      }
      
      // Get metadata about the account
      const metadataResponse = await fetch('https://login.mailchimp.com/oauth2/metadata', {
        headers: {
          'Authorization': `OAuth ${data.access_token}`
        }
      });
      
      const metadata = await metadataResponse.json();
      
      return {
        accessToken: data.access_token,
        expiresAt: undefined, // Mailchimp tokens don't expire
        additionalData: {
          dc: metadata.dc,
          loginEmail: metadata.login_email,
          accountName: metadata.accountname,
          apiEndpoint: `https://${metadata.dc}.api.mailchimp.com/3.0/`
        }
      };
    } catch (error) {
      return {
        error: error.message || 'Failed to exchange code for tokens'
      };
    }
  },
  
  refreshAccessToken: async ({ refreshToken, clientId, clientSecret }) => {
    // Mailchimp tokens don't expire, so no refresh is needed
    return {
      error: 'Mailchimp does not support token refresh'
    };
  },
  
  revokeToken: async ({ token }) => {
    // Mailchimp doesn't have a dedicated revoke endpoint
    // We consider the token revoked on our end
    return { success: true };
  }
};

// Map of all providers
const providers: Record<string, ProviderConfig> = {
  google: googleProvider,
  facebook: facebookProvider,
  instagram: instagramProvider,
  linkedin: linkedinProvider,
  twitter: twitterProvider,
  slack: slackProvider,
  hubspot: hubspotProvider,
  notion: notionProvider,
  stripe: stripeProvider,
  mailchimp: mailchimpProvider
};

// Function to get provider configuration
export function getProviderConfig(providerKey: string): ProviderConfig | undefined {
  return providers[providerKey];
}

// Function to get all provider configurations
export function getAllProviderConfigs(): Record<string, ProviderConfig> {
  return providers;
}