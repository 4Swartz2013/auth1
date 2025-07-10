import { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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
    const stateToken = uuidv4();
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
        scopes: scopes || getDefaultScopes(provider),
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expiry
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return res.status(500).json({ error: 'Failed to initialize OAuth flow' });
    }

    // Generate authorization URL
    const authUrl = getAuthorizationUrl(
      provider,
      process.env[`${provider.toUpperCase()}_CLIENT_ID`]!,
      redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/${provider}/callback`,
      scopes || getDefaultScopes(provider),
      stateToken
    );

    // Return the authorization URL
    return res.status(200).json({
      authUrl,
      state: stateToken
    });
  } catch (error: any) {
    console.error('Error in OAuth start:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}

// Helper function to get default scopes for providers
function getDefaultScopes(provider: string): string[] {
  switch (provider) {
    case 'google':
    case 'gmail':
      return ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile', 'https://www.googleapis.com/auth/gmail.readonly'];
    case 'facebook':
      return ['email', 'public_profile'];
    case 'instagram':
      return ['user_profile', 'user_media'];
    case 'twitter':
      return ['tweet.read', 'users.read', 'offline.access'];
    case 'linkedin':
      return ['r_liteprofile', 'r_emailaddress'];
    case 'slack':
      return ['channels:read', 'chat:write'];
    case 'github':
      return ['read:user', 'user:email'];
    default:
      return [];
  }
}

// Helper function to generate authorization URL for providers
function getAuthorizationUrl(
  provider: string,
  clientId: string,
  redirectUri: string,
  scopes: string[],
  state: string
): string {
  switch (provider) {
    case 'google':
    case 'gmail':
      return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}&access_type=offline&prompt=consent`;
    
    case 'facebook':
      return `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(','))}&state=${state}`;
    
    case 'instagram':
      return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}`;
    
    case 'twitter':
      return `https://twitter.com/i/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
    
    case 'linkedin':
      return `https://www.linkedin.com/oauth/v2/authorization?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}`;
    
    case 'slack':
      return `https://slack.com/oauth/v2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(','))}&state=${state}`;
    
    case 'github':
      return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes.join(' '))}&state=${state}`;
    
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}