import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // Get code and state from query parameters
    const searchParams = req.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    // Check for OAuth errors
    if (error) {
      console.error(`OAuth error: ${error}`, error_description);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=${encodeURIComponent(error)}&description=${encodeURIComponent(error_description || '')}`);
    }

    if (!code || !state) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=invalid_request&description=Missing code or state parameter`);
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
      .eq('platform', 'gmail')
      .single();

    if (stateError || !oauthState) {
      console.error('Invalid or expired state token:', stateError);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=invalid_state&description=Invalid or expired state token`);
    }

    // Check if state is expired
    if (new Date(oauthState.expires_at) < new Date()) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=expired_state&description=Authorization flow expired, please try again`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: oauthState.redirect_uri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Failed to exchange code for tokens:', tokenData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=token_exchange_failed&description=${encodeURIComponent(tokenData.error_description || tokenData.error || 'Failed to exchange code for tokens')}`);
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
        providerKey: 'gmail',
        providerName: 'Gmail',
        credentialType: 'oauth',
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        expiresAt: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : undefined,
        scopes: oauthState.scopes,
        additionalData: {
          tokenType: tokenData.token_type,
          idToken: tokenData.id_token,
          scope: tokenData.scope
        }
      })
    });

    if (!storeResponse.ok) {
      const errorData = await storeResponse.json();
      console.error('Failed to store credentials:', errorData);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=storage_failed&description=Failed to store credentials`);
    }

    // Delete the used state token
    await supabase
      .from('oauth_states')
      .delete()
      .eq('state_token', state);

    // Redirect to success page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/success?provider=gmail`);
  } catch (error) {
    console.error('Error in Gmail OAuth callback:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/integrations/error?error=server_error&description=Internal server error`);
  }
}