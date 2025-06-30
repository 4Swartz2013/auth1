import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import AES from "npm:crypto-js@4.1.1/aes";
import Utf8 from "npm:crypto-js@4.1.1/enc-utf8";

interface RevokeTokenPayload {
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
    const payload: RevokeTokenPayload = await req.json();
    
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

    // Decrypt tokens if needed to call provider revoke endpoint
    const decryptData = (encryptedData: string | null) => {
      if (!encryptedData) return null;
      const bytes = AES.decrypt(encryptedData, encryptionKey);
      return bytes.toString(Utf8);
    };

    const accessToken = decryptData(credential.access_token);
    
    // Call provider's revoke endpoint if needed
    // This would typically call the provider's token revocation endpoint
    // For this implementation, we'll simulate a successful revocation
    
    // Update credentials to mark as inactive
    const { error: updateError } = await supabase
      .from('credentials')
      .update({
        is_active: false,
        status: 'disconnected',
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
        status: 'disconnected',
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id);

    if (statusError) {
      throw new Error(`Failed to update integration status: ${statusError.message}`);
    }

    // Log the activity
    await supabase.rpc('log_integration_activity', {
      p_user_id: payload.userId,
      p_platform: integration.provider_key,
      p_action: 'revoke_token',
      p_status: 'disconnected',
      p_message: `Successfully disconnected from ${integration.provider_name}`
    });

    return new Response(
      JSON.stringify({ success: true }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error revoking token:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});