import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import { decrypt } from "../util/crypto.ts";
import { getProvider } from "../../packages/integrations-core/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
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

    // Get all active integrations
    const { data: integrations, error: integrationsError } = await supabase
      .from("integrations")
      .select("*")
      .in("status", ["connected", "error"])
      .order("updated_at", { ascending: false });

    if (integrationsError) {
      throw new Error(`Failed to fetch integrations: ${integrationsError.message}`);
    }

    const results = [];

    // Process each integration
    for (const integration of integrations || []) {
      try {
        // Get credential
        const { data: credential, error: credentialError } = await supabase
          .from("credentials")
          .select("*")
          .eq("integration_id", integration.id)
          .eq("is_active", true)
          .single();

        if (credentialError || !credential) {
          // Log error and continue
          await supabase.from("integration_logs").insert({
            user_id: integration.user_id,
            platform: integration.provider_key,
            action: "health_check",
            status: "error",
            log_level: "error",
            message: `Credential not found: ${credentialError?.message || "Unknown error"}`,
          });
          
          // Update integration status
          await supabase
            .from("integrations")
            .update({
              status: "error",
              error_message: "Credential not found",
              updated_at: new Date().toISOString()
            })
            .eq("id", integration.id);
          
          results.push({
            integrationId: integration.id,
            providerKey: integration.provider_key,
            status: "error",
            message: "Credential not found"
          });
          
          continue;
        }

        // Check if token is expired or about to expire
        if (credential.credential_type === "oauth" && credential.expires_at) {
          const expiresAt = new Date(credential.expires_at);
          const now = new Date();
          
          // If token expires in less than 1 hour, refresh it
          if (expiresAt.getTime() - now.getTime() < 60 * 60 * 1000) {
            // Get provider
            const provider = getProvider(integration.provider_key);
            if (!provider) {
              throw new Error(`Provider not found: ${integration.provider_key}`);
            }
            
            // Decrypt refresh token
            const refreshToken = credential.refresh_token
              ? decrypt(credential.refresh_token, encryptionKey)
              : null;
            
            if (!refreshToken) {
              throw new Error("Missing refresh token");
            }
            
            // Get client credentials
            const clientId = Deno.env.get(`${integration.provider_key.toUpperCase()}_CLIENT_ID`);
            const clientSecret = Deno.env.get(`${integration.provider_key.toUpperCase()}_CLIENT_SECRET`);
            
            if (!clientId || !clientSecret) {
              throw new Error(`Missing client credentials for ${integration.provider_key}`);
            }
            
            // Log refresh attempt
            await supabase.from("integration_logs").insert({
              user_id: integration.user_id,
              platform: integration.provider_key,
              action: "token_refresh",
              status: "pending",
              log_level: "info",
              message: "Token refresh initiated by health check"
            });
            
            results.push({
              integrationId: integration.id,
              providerKey: integration.provider_key,
              status: "pending",
              message: "Token refresh initiated"
            });
          } else {
            // Token is still valid
            results.push({
              integrationId: integration.id,
              providerKey: integration.provider_key,
              status: "connected",
              message: "Token is valid"
            });
          }
        } else {
          // Non-OAuth credentials or no expiry
          results.push({
            integrationId: integration.id,
            providerKey: integration.provider_key,
            status: "connected",
            message: "Credential is valid"
          });
        }
      } catch (err) {
        console.error(`Error processing integration ${integration.id}:`, err);
        
        // Log error
        await supabase.from("integration_logs").insert({
          user_id: integration.user_id,
          platform: integration.provider_key,
          action: "health_check",
          status: "error",
          log_level: "error",
          message: `Health check error: ${err.message}`,
          error_details: { error: err.message }
        });
        
        // Update integration status
        await supabase
          .from("integrations")
          .update({
            status: "error",
            error_message: err.message,
            updated_at: new Date().toISOString()
          })
          .eq("id", integration.id);
        
        results.push({
          integrationId: integration.id,
          providerKey: integration.provider_key,
          status: "error",
          message: err.message
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Health check error:", err);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});