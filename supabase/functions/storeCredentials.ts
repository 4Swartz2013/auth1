import { createClient } from "npm:@supabase/supabase-js";
import AES from "npm:crypto-js/aes";
import Utf8 from "npm:crypto-js/enc-utf8";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const encryptionKey = Deno.env.get("CREDENTIAL_ENCRYPTION_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey || !encryptionKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { 
      userId, 
      platform, 
      platformName, 
      credentialType, 
      accessToken, 
      refreshToken, 
      apiKey, 
      apiSecret, 
      additionalData, 
      scopes, 
      expiresAt 
    } = await req.json();

    if (!userId || !platform || !platformName || !credentialType) {
      throw new Error("Missing required parameters");
    }

    // Encrypt sensitive data
    const encryptedAccessToken = accessToken 
      ? AES.encrypt(accessToken, encryptionKey).toString() 
      : null;
    
    const encryptedRefreshToken = refreshToken 
      ? AES.encrypt(refreshToken, encryptionKey).toString() 
      : null;
    
    const encryptedApiKey = apiKey 
      ? AES.encrypt(apiKey, encryptionKey).toString() 
      : null;
    
    const encryptedApiSecret = apiSecret 
      ? AES.encrypt(apiSecret, encryptionKey).toString() 
      : null;

    // Upsert the credential
    const { error } = await supabase
      .from("credentials")
      .upsert({
        user_id: userId,
        platform,
        platform_name: platformName,
        credential_type: credentialType,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        api_key: encryptedApiKey,
        api_secret: encryptedApiSecret,
        additional_data: additionalData,
        scopes,
        expires_at: expiresAt,
        status: "connected",
        is_active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,platform"
      });

    if (error) {
      throw new Error(`Failed to store credential: ${error.message}`);
    }

    // Log the credential storage
    await supabase.from("integration_logs").insert({
      user_id: userId,
      platform,
      action: "store_credential",
      status: "connected",
      log_level: "info",
      message: `Successfully stored ${credentialType} credential for ${platformName}`,
    });

    // Queue a bootstrap job if needed
    if (credentialType === "oauth" && accessToken) {
      // In a real implementation, this would queue a job to bootstrap the integration
      // For this example, we'll just log it
      await supabase.from("integration_logs").insert({
        user_id: userId,
        platform,
        action: "bootstrap_queued",
        status: "pending",
        log_level: "info",
        message: "Bootstrap job queued",
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Store credentials error:", err);
    
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});