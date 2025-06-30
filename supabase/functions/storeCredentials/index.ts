import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { encrypt } from "../util/crypto.ts";

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
    const { 
      userId, 
      providerKey, 
      providerName, 
      credentialType, 
      accessToken, 
      refreshToken, 
      apiKey, 
      apiSecret, 
      expiresAt,
      additionalData,
      scopes,
      workspaceId
    } = await req.json();

    // Validate required parameters
    if (!userId || !providerKey || !providerName || !credentialType) {
      throw new Error("Missing required parameters");
    }

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      throw new Error(`User not found: ${userError?.message || "Unknown error"}`);
    }

    // Create or update integration record
    const { data: integration, error: integrationError } = await supabase
      .from("integrations")
      .upsert({
        user_id: userId,
        workspace_id: workspaceId,
        provider_key: providerKey,
        provider_name: providerName,
        status: "pending",
        health_score: 100,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,provider_key,workspace_id",
        returning: "representation"
      })
      .select()
      .single();

    if (integrationError) {
      throw new Error(`Failed to create integration: ${integrationError.message}`);
    }

    // Encrypt sensitive data
    const encryptedAccessToken = accessToken 
      ? encrypt(accessToken, encryptionKey)
      : null;
    
    const encryptedRefreshToken = refreshToken 
      ? encrypt(refreshToken, encryptionKey)
      : null;
    
    const encryptedApiKey = apiKey 
      ? encrypt(apiKey, encryptionKey)
      : null;
    
    const encryptedApiSecret = apiSecret 
      ? encrypt(apiSecret, encryptionKey)
      : null;

    // Store credentials
    const { error: credentialError } = await supabase
      .from("credentials")
      .upsert({
        user_id: userId,
        platform: providerKey,
        platform_name: providerName,
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
        integration_id: integration.id,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,platform"
      });

    if (credentialError) {
      throw new Error(`Failed to store credential: ${credentialError.message}`);
    }

    // Log the credential storage
    await supabase.from("integration_logs").insert({
      user_id: userId,
      platform: providerKey,
      action: "store_credential",
      status: "connected",
      log_level: "info",
      message: `Successfully stored ${credentialType} credential for ${providerName}`,
    });

    // Create a bootstrap job
    const { data: job, error: jobError } = await supabase
      .from("integration_sync_jobs")
      .insert({
        integration_id: integration.id,
        job_type: "bootstrap",
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error("Failed to create bootstrap job:", jobError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      integrationId: integration.id,
      jobId: job?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Store credentials error:", err);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});