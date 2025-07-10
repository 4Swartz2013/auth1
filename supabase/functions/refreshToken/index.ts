import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { encrypt, decrypt } from "../util/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const encryptionKey = Deno.env.get("CREDENTIAL_ENCRYPTION_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey || !encryptionKey) {
      throw new Error("Missing environment variables");
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { integrationId, userId } = await req.json();

    if (!integrationId || !userId) {
      throw new Error("Missing required parameters: integrationId and userId");
    }

    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .select("*")
      .eq("id", integrationId)
      .eq("user_id", userId)
      .single();

    if (integrationError || !integration) {
      throw new Error(`Integration not found: ${integrationError?.message || "Unknown error"}`);
    }

    // Get credential
    const { data: credential, error: credentialError } = await supabase
      .from("credentials")
      .select("*")
      .eq("integration_id", integrationId)
      .eq("user_id", userId)
      .single();

    if (credentialError || !credential) {
      throw new Error(`Credential not found: ${credentialError?.message || "Unknown error"}`);
    }

    // Decrypt refresh token
    const refreshToken = credential.refresh_token
      ? decrypt(credential.refresh_token, encryptionKey)
      : null;

    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    // Get client credentials from environment
    const clientId = Deno.env.get(`${integration.provider_key.toUpperCase()}_CLIENT_ID`);
    const clientSecret = Deno.env.get(`${integration.provider_key.toUpperCase()}_CLIENT_SECRET`);

    if (!clientId || !clientSecret) {
      throw new Error(`Missing client credentials for ${integration.provider_key}`);
    }

    // Call the appropriate OAuth endpoint to refresh the token
    let tokenResponse;
    
    // Different providers have different refresh token endpoints and parameters
    if (integration.provider_key === 'google' || integration.provider_key === 'gmail') {
      tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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
    } else if (integration.provider_key === 'instagram') {
      // Instagram uses a different refresh mechanism
      tokenResponse = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${refreshToken}`);
    } else {
      throw new Error(`Refresh token not supported for provider: ${integration.provider_key}`);
    }
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || 'Failed to refresh token');
    }
    
    // Calculate new expiry time
    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() 
      : undefined;
    
    // Encrypt new tokens
    const encryptedAccessToken = tokenData.access_token
      ? encrypt(tokenData.access_token, encryptionKey)
      : null;
    
    const encryptedRefreshToken = tokenData.refresh_token
      ? encrypt(tokenData.refresh_token, encryptionKey)
      : credential.refresh_token; // Keep existing if not provided

    // Update credential
    const { error: updateError } = await supabase
      .from("credentials")
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        last_refreshed_at: new Date().toISOString(),
        status: "connected",
        updated_at: new Date().toISOString()
      })
      .eq("id", credential.id);

    if (updateError) {
      throw new Error(`Failed to update credential: ${updateError.message}`);
    }

    // Update integration status
    await supabase
      .from("integrations")
      .update({
        status: "connected",
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq("id", integrationId);

    // Log the refresh
    await supabase.from("integration_logs").insert({
      user_id: userId,
      platform: integration.provider_key,
      action: "refresh_token",
      status: "connected",
      log_level: "info",
      message: "Token refreshed successfully",
    });

    return new Response(JSON.stringify({ 
      success: true,
      expiresAt: expiresAt
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    
    // Try to log the error if possible
    try {
      const { userId, integrationId } = await req.json();
      if (userId && integrationId) {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL") || "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
        );
        
        // Get integration details
        const { data: integration } = await supabase
          .from("integrations")
          .select("provider_key")
          .eq("id", integrationId)
          .single();
        
        if (integration) {
          // Update integration status
          await supabase
            .from("integrations")
            .update({
              status: "error",
              error_message: err.message,
              updated_at: new Date().toISOString()
            })
            .eq("id", integrationId);
          
          // Log the error
          await supabase.from("integration_logs").insert({
            user_id: userId,
            platform: integration.provider_key,
            action: "refresh_token",
            status: "error",
            log_level: "error",
            message: `Failed to refresh token: ${err.message}`,
            error_details: { error: err.message }
          });
        }
      }
    } catch (logError) {
      console.error("Failed to log refresh error:", logError);
    }
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});