import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { getProviderConfig } from '../../../../lib/providers/providerConfigs';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
      return res.redirect(`/integrations/error?error=${encodeURIComponent(error as string)}&description=${encodeURIComponent(error_description as string || '')}`);
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
      return res.redirect(`/integrations/error?error=invalid_state&description=Invalid or expired state token`);
    }

    // Check if state is expired
    if (new Date(oauthState.expires_at) < new Date()) {
      return res.redirect(`/integrations/error?error=expired_state&description=Authorization flow expired, please try again`);
    }

    // Get provider configuration
    const providerConfig = getProviderConfig(provider);
    if (!providerConfig) {
      return res.redirect(`/integrations/error?error=unsupported_provider&description=Unsupported provider: ${provider}`);
    }

    // Exchange code for tokens
    const tokenResponse = await providerConfig.exchangeCodeForTokens({
      code,
      clientId: process.env[`${provider.toUpperCase()}_CLIENT_ID`]!,
      clientSecret: process.env[`${provider.toUpperCase()}_CLIENT_SECRET`]!,
      redirectUri: oauthState.redirect_uri
    });

    if (!tokenResponse.accessToken) {
      console.error('Failed to exchange code for tokens:', tokenResponse.error);
      return res.redirect(`/integrations/error?error=token_exchange_failed&description=${encodeURIComponent(tokenResponse.error || 'Failed to exchange code for tokens')}`);
    }

    // Call Supabase Edge Function to store credentials securely
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/storeCredentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({
        userId: oauthState.user_id,
        providerKey: provider,
        providerName: providerConfig.name,
        credentialType: 'oauth',
        accessToken: tokenResponse.accessToken,
        refreshToken: tokenResponse.refreshToken,
        expiresAt: tokenResponse.expiresAt,
        scopes: oauthState.scopes,
        additionalData: tokenResponse.additionalData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to store credentials:', errorData);
      return res.redirect(`/integrations/error?error=storage_failed&description=Failed to store credentials`);
    }

    // Delete the used state token
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state_token', state);

    // Redirect to success page
    return res.redirect(`/integrations/success?provider=${encodeURIComponent(provider)}`);
  } catch (error) {
    console.error('Error in OAuth callback:', error);
    return res.redirect(`/integrations/error?error=server_error&description=Internal server error`);
  }
}