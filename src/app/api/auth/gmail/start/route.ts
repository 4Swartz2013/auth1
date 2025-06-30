import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Schema for request validation
const requestSchema = z.object({
  redirectUri: z.string().url().optional(),
  scopes: z.array(z.string()).optional(),
  state: z.record(z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    
    // Validate request body
    const validationResult = requestSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validationResult.error.format() },
        { status: 400 }
      );
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Generate state token for security
    const stateToken = crypto.randomUUID();
    const stateData = {
      provider: 'gmail',
      redirectUri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/integrations/callback`,
      ...state
    };

    // Store state in Supabase
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        user_id: userId,
        platform: 'gmail',
        state_token: stateToken,
        redirect_uri: redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/integrations/callback`,
        scopes: scopes || ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes expiry
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return NextResponse.json({ error: 'Failed to initialize OAuth flow' }, { status: 500 });
    }

    // Generate authorization URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', process.env.GOOGLE_CLIENT_ID!);
    authUrl.searchParams.append('redirect_uri', redirectUri || `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/gmail/callback`);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', scopes?.join(' ') || 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile');
    authUrl.searchParams.append('state', stateToken);
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    // Return the authorization URL
    return NextResponse.json({
      authUrl: authUrl.toString(),
      state: stateToken
    });
  } catch (error) {
    console.error('Error in Gmail OAuth start:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}