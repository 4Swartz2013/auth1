import { createClient } from "npm:@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js@4.1.1";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const encryptionKey = Deno.env.get("CREDENTIAL_ENCRYPTION_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey || !encryptionKey) {
      throw new Error("Missing environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active credentials that need checking
    const { data: credentials, error } = await supabase
      .from("credentials")
      .select("*")
      .eq("is_active", true)
      .eq("credential_type", "oauth")
      .lt("expires_at", new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()); // Expiring in the next 24 hours

    if (error) throw error;

    const results = [];

    // Process each credential
    for (const credential of credentials || []) {
      try {
        // Decrypt the refresh token
        const refreshToken = credential.refresh_token
          ? CryptoJS.AES.decrypt(credential.refresh_token, encryptionKey).toString(CryptoJS.enc.Utf8)
          : null;

        if (!refreshToken) {
          // Log error and continue
          await supabase.from("integration_logs").insert({
            user_id: credential.user_id,
            platform: credential.platform,
            action: "health_check",
            status: "error",
            log_level: "error",
            message: "Missing refresh token",
          });
          
          results.push({
            platform: credential.platform,
            user_id: credential.user_id,
            status: "error",
            message: "Missing refresh token",
          });
          
          continue;
        }

        // Queue a token refresh job
        // In a real implementation, this would call a token refresh service
        // For now, we'll just log it
        await supabase.from("integration_logs").insert({
          user_id: credential.user_id,
          platform: credential.platform,
          action: "health_check",
          status: "pending",
          log_level: "info",
          message: "Token refresh scheduled",
        });

        results.push({
          platform: credential.platform,
          user_id: credential.user_id,
          status: "pending",
          message: "Token refresh scheduled",
        });
      } catch (err) {
        console.error(`Error processing credential ${credential.id}:`, err);
        
        results.push({
          platform: credential.platform,
          user_id: credential.user_id,
          status: "error",
          message: err.message,
        });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Health check error:", err);
    
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});