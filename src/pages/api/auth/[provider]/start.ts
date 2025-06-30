import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { getProviderConfig } from '../../../../lib/providers/providerConfigs';

// Schema for request validation
const requestSchema = z.object({
  redirectUri: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
  state: z.record(z.unknown()).optional(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get provider from URL
    const { provider } = req.query;
    
    if (!provider || Array.isArray(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Validate request body
    const validationResult = requestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid request body', details: validationResult.error.format() });
    }

    const { redirectUri, scopes, state } = validationResult.data;

    // Get provider configuration
    const providerConfig = getProviderConfig(provider);
    if (!providerConfig) {
      return res.status(400).json({ error: `Unsupported provider: ${provider}` });
    }

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user from session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;

    // Generate state token for security
    const stateToken = crypto.randomUUID();
    const stateData = {
      provider,
      redirectUri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/integrations/callback`,
      ...state
    };

    // Store state in Supabase
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        user_id: userId,
        platform: provider,
        state_token: stateToken,
        redirect_uri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/integrations/callback`,
        scopes: scopes || providerConfig.defaultScopes,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expiry
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return res.status(500).json({ error: 'Failed to initialize OAuth flow' });
    }

    // Generate authorization URL
    const authUrl = providerConfig.getAuthorizationUrl({
      clientId: process.env[`${provider.toUpperCase()}_CLIENT_ID`]!,
      redirectUri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/${provider}/callback`,
      scopes: scopes || providerConfig.defaultScopes,
      state: stateToken,
      additionalParams: {}
    });

    // Return the authorization URL
    return res.status(200).json({
      authUrl,
      state: stateToken
    });
  } catch (error) {
    console.error('Error in OAuth start:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}