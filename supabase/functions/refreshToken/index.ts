import { createClient } from "npm:@supabase/supabase-js@2";
import CryptoJS from "npm:crypto-js@4.1.1";

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
    const { userId, platform } = await req.json();

    if (!userId || !platform) {
      throw new Error("Missing required parameters: userId and platform");
    }

    // Get the credential
    const { data: credential, error } = await supabase
      .from("credentials")
      .select("*")
      .eq("user_id", userId)
      .eq("platform", platform)
      .eq("is_active", true)
      .single();

    if (error || !credential) {
      throw new Error(`Credential not found: ${error?.message || "Unknown error"}`);
    }

    // Decrypt the refresh token
    const refreshToken = credential.refresh_token
      ? CryptoJS.AES.decrypt(credential.refresh_token, encryptionKey).toString(CryptoJS.enc.Utf8)
      : null;

    if (!refreshToken) {
      throw new Error("Missing refresh token");
    }

    // In a real implementation, this would call the provider's token refresh API
    // For this example, we'll simulate a successful refresh
    const newAccessToken = `new_access_token_${Date.now()}`;
    const newRefreshToken = `new_refresh_token_${Date.now()}`;
    const expiresAt = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour from now

    // Encrypt the new tokens
    const encryptedAccessToken = CryptoJS.AES.encrypt(newAccessToken, encryptionKey).toString();
    const encryptedRefreshToken = CryptoJS.AES.encrypt(newRefreshToken, encryptionKey).toString();

    // Update the credential in the database
    const { error: updateError } = await supabase
      .from("credentials")
      .update({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        last_refreshed_at: new Date().toISOString(),
        status: "connected",
      })
      .eq("id", credential.id);

    if (updateError) {
      throw new Error(`Failed to update credential: ${updateError.message}`);
    }

    // Log the refresh
    await supabase.from("integration_logs").insert({
      user_id: userId,
      platform,
      action: "refresh_token",
      status: "connected",
      log_level: "info",
      message: "Token refreshed successfully",
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Token refresh error:", err);
    
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});