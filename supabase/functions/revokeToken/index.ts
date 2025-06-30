import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { decrypt } from "../util/crypto.ts";
import { getProvider } from "../../packages/integrations-core/index.ts";

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

    // Get provider configuration
    const provider = getProvider(integration.provider_key);
    if (!provider) {
      throw new Error(`Provider not found: ${integration.provider_key}`);
    }

    // Decrypt tokens
    const accessToken = credential.access_token
      ? decrypt(credential.access_token, encryptionKey)
      : null;
    
    const refreshToken = credential.refresh_token
      ? decrypt(credential.refresh_token, encryptionKey)
      : null;

    // Get client credentials from environment
    const clientId = Deno.env.get(`${integration.provider_key.toUpperCase()}_CLIENT_ID`);
    const clientSecret = Deno.env.get(`${integration.provider_key.toUpperCase()}_CLIENT_SECRET`);

    // Revoke the token with the provider
    // Note: We'll proceed even if this fails, to ensure we clean up our database
    try {
      if (accessToken) {
        await provider.revokeAccess({
          userId,
          integrationId,
          accessToken,
          refreshToken,
          clientId,
          clientSecret
        });
      }
    } catch (revokeError) {
      console.error("Provider revoke error:", revokeError);
      // Continue with local cleanup
    }

    // Update credential
    const { error: updateCredentialError } = await supabase
      .from("credentials")
      .update({
        is_active: false,
        status: "disconnected",
        updated_at: new Date().toISOString()
      })
      .eq("id", credential.id);

    if (updateCredentialError) {
      throw new Error(`Failed to update credential: ${updateCredentialError.message}`);
    }

    // Update integration status
    const { error: updateIntegrationError } = await supabase
      .from("integrations")
      .update({
        status: "disconnected",
        updated_at: new Date().toISOString()
      })
      .eq("id", integrationId);

    if (updateIntegrationError) {
      throw new Error(`Failed to update integration: ${updateIntegrationError.message}`);
    }

    // Log the revocation
    await supabase.from("integration_logs").insert({
      user_id: userId,
      platform: integration.provider_key,
      action: "revoke_token",
      status: "disconnected",
      log_level: "info",
      message: "Integration disconnected successfully",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Token revocation error:", err);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});