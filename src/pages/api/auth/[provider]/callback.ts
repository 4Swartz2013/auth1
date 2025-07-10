import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get provider from URL
    const { provider } = req.query;
    
    if (!provider || Array.isArray(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Get code and state from query parameters
    const { code, state, error, error_description } = req.query;

    // Check for OAuth errors
    if (error) {
      console.error(`OAuth error: ${error}`, error_description);
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=${encodeURIComponent(error as string)}&description=${encodeURIComponent(error_description as string || '')}`);
    }

    if (!code || !state || Array.isArray(code) || Array.isArray(state)) {
      return res.status(400).json({ error: 'Invalid code or state' });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Retrieve state from database
    const { data: oauthState, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state_token', state)
      .eq('platform', provider)
      .single();

    if (stateError || !oauthState) {
      console.error('Invalid or expired state token:', stateError);
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=invalid_state&description=Invalid or expired state token`);
    }

    // Check if state is expired
    if (new Date(oauthState.expires_at) < new Date()) {
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=expired_state&description=Authorization flow expired, please try again`);
    }

    // Exchange code for tokens
    const tokenResponse = await exchangeCodeForTokens(
      provider,
      code,
      process.env[`${provider.toUpperCase()}_CLIENT_ID`]!,
      process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]!,
      oauthState.redirect_uri
    );

    if (!tokenResponse.accessToken) {
      console.error('Failed to exchange code for tokens:', tokenResponse.error);
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=token_exchange_failed&description=${encodeURIComponent(tokenResponse.error || 'Failed to exchange code for tokens')}`);
    }

    // Call Supabase Edge Function to store credentials securely
    const storeResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/storeCredentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        userId: oauthState.user_id,
        providerKey: provider,
        providerName: getProviderName(provider),
        credentialType: 'oauth',
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresAt: tokenResponse.expiresAt,
        scopes: oauthState.scopes,
        additionalData: tokenResponse.additionalData
      })
    });

    if (!storeResponse.ok) {
      const errorData = await storeResponse.json();
      console.error('Failed to store credentials:', errorData);
      return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=storage_failed&description=Failed to store credentials`);
    }

    // Delete the used state token
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state_token', state);

    // Redirect to success page
    return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/success?provider=${encodeURIComponent(provider)}`);
  } catch (error: any) {
    console.error('Error in OAuth callback:', error);
    return res.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=server_error&description=Internal server error: ${encodeURIComponent(error.message)}`);
  }
}

// Helper function to exchange code for tokens
async function exchangeCodeForTokens(
  provider: string,
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<{
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: string;
  additionalData?: Record<string, any>;
  error?: string;
}> {
  try {
    let response;
    let data;

    switch (provider) {
      case 'google':
      case 'gmail':
        response = await fetch('https://oauth2.googleapis.com/token', {
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
        
        data = await response.json();
        
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
      
      case 'facebook':
        response = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
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
        
        data = await response.json();
        
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
      
      case 'instagram':
        // First, exchange code for short-lived token
        response = await fetch('https://api.instagram.com/oauth/access_token', {
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
        
        data = await response.json();
        
        if (!response.ok || data.error) {
          return {
            error: data.error_message || data.error?.message || 'Failed to exchange code for tokens'
          };
        }
        
        // Then, exchange short-lived token for long-lived token
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
      
      case 'slack':
        response = await fetch('https://slack.com/api/oauth.v2.access', {
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
        
        data = await response.json();
        
        if (!response.ok || !data.ok) {
          return {
            error: data.error || 'Failed to exchange code for tokens'
          };
        }
        
        return {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          additionalData: {
            teamId: data.team?.id,
            teamName: data.team?.name,
            userId: data.authed_user?.id,
            botUserId: data.bot_user_id,
            appId: data.app_id
          }
        };
      
      default:
        return {
          error: `Unsupported provider: ${provider}`
        };
    }
  } catch (error: any) {
    return {
      error: error.message || 'Failed to exchange code for tokens'
    };
  }
}

// Helper function to get provider display name
function getProviderName(provider: string): string {
  switch (provider) {
    case 'gmail':
      return 'Gmail';
    case 'google':
      return 'Google';
    case 'facebook':
      return 'Facebook';
    case 'instagram':
      return 'Instagram';
    case 'twitter':
      return 'Twitter';
    case 'linkedin':
      return 'LinkedIn';
    case 'slack':
      return 'Slack';
    case 'github':
      return 'GitHub';
    default:
      return provider.charAt(0).toUpperCase() + provider.slice(1);
  }
}