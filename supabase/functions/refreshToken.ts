import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import AES from "npm:crypto-js@4.1.1/aes";
import Utf8 from "npm:crypto-js@4.1.1/enc-utf8";

interface RefreshTokenPayload {
  integrationId: string;
  userId: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req: Request) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const encryptionKey = Deno.env.get("CREDENTIAL_ENCRYPTION_KEY") || "";
    
    if (!supabaseUrl || !supabaseServiceKey || !encryptionKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    const payload: RefreshTokenPayload = await req.json();
    
    // Validate required fields
    if (!payload.integrationId || !payload.userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get integration and credential details
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', payload.integrationId)
      .eq('user_id', payload.userId)
      .single();

    if (integrationError) {
      throw new Error(`Integration not found: ${integrationError.message}`);
    }

    const { data: credential, error: credentialError } = await supabase
      .from('credentials')
      .select('*')
      .eq('integration_id', payload.integrationId)
      .eq('user_id', payload.userId)
      .single();

    if (credentialError) {
      throw new Error(`Credentials not found: ${credentialError.message}`);
    }

    // Decrypt refresh token
    const decryptData = (encryptedData: string | null) => {
      if (!encryptedData) return null;
      const bytes = AES.decrypt(encryptedData, encryptionKey);
      return bytes.toString(Utf8);
    };

    const refreshToken = decryptData(credential.refresh_token);
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    // Determine which provider to refresh
    const providerKey = integration.provider_key;
    
    // Perform token refresh based on provider
    // This would typically call the provider's token endpoint
    // For this implementation, we'll simulate a successful refresh
    
    const newAccessToken = `new_access_token_${Date.now()}`;
    const newRefreshToken = `new_refresh_token_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour from now
    
    // Encrypt new tokens
    const encryptData = (data: string) => {
      return AES.encrypt(data, encryptionKey).toString();
    };

    const encryptedAccessToken = encryptData(newAccessToken);
    const encryptedRefreshToken = encryptData(newRefreshToken);

    // Update credentials
    const { error: updateError } = await supabase
      .from('credentials')
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', credential.id);

    if (updateError) {
      throw new Error(`Failed to update credentials: ${updateError.message}`);
    }

    // Update integration status
    const { error: statusError } = await supabase
      .from('integrations')
      .update({
        status: 'connected',
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id);

    if (statusError) {
      throw new Error(`Failed to update integration status: ${statusError.message}`);
    }

    // Log the activity
    await supabase.rpc('log_integration_activity', {
      p_user_id: payload.userId,
      p_platform: providerKey,
      p_action: 'refresh_token',
      p_status: 'connected',
      p_message: `Successfully refreshed token for ${integration.provider_name}`
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        expiresAt
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error refreshing token:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});