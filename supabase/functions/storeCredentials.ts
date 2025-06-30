import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import * as CryptoJS from "npm:crypto-js@4.1.1";

interface CredentialPayload {
  userId: string;
  workspaceId?: string;
  providerKey: string;
  providerName: string;
  credentialType: 'oauth' | 'api_key' | 'manual';
  accessToken?: string;
  refreshToken?: string;
  apiKey?: string;
  apiSecret?: string;
  expiresAt?: string;
  scopes?: string[];
  additionalData?: Record<string, any>;
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
    const payload: CredentialPayload = await req.json();
    
    // Validate required fields
    if (!payload.userId || !payload.providerKey || !payload.providerName || !payload.credentialType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Encrypt sensitive data
    const encryptData = (data: string | undefined) => {
      if (!data) return null;
      return CryptoJS.AES.encrypt(data, encryptionKey).toString();
    };

    const encryptedAccessToken = encryptData(payload.accessToken);
    const encryptedRefreshToken = encryptData(payload.refreshToken);
    const encryptedApiKey = encryptData(payload.apiKey);
    const encryptedApiSecret = encryptData(payload.apiSecret);

    // Create or update integration record
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .upsert({
        user_id: payload.userId,
        workspace_id: payload.workspaceId,
        provider_key: payload.providerKey,
        provider_name: payload.providerName,
        status: 'connected',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,provider_key,workspace_id',
        returning: 'representation'
      })
      .select()
      .single();

    if (integrationError) {
      throw new Error(`Failed to create integration: ${integrationError.message}`);
    }

    // Store credentials
    const { error: credentialError } = await supabase
      .from('credentials')
      .upsert({
        user_id: payload.userId,
        integration_id: integration.id,
        platform: payload.providerKey,
        platform_name: payload.providerName,
        credential_type: payload.credentialType,
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        api_key: encryptedApiKey,
        api_secret: encryptedApiSecret,
        additional_data: payload.additionalData,
        scopes: payload.scopes,
        expires_at: payload.expiresAt,
        status: 'connected',
        is_active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,platform',
        returning: 'minimal'
      });

    if (credentialError) {
      throw new Error(`Failed to store credentials: ${credentialError.message}`);
    }

    // Log the activity
    await supabase.rpc('log_integration_activity', {
      p_user_id: payload.userId,
      p_platform: payload.providerKey,
      p_action: 'store_credentials',
      p_status: 'connected',
      p_message: `Successfully stored ${payload.credentialType} credentials for ${payload.providerName}`
    });

    // Queue bootstrap job
    const { data: job, error: jobError } = await supabase
      .from('integration_sync_jobs')
      .insert({
        integration_id: integration.id,
        job_type: 'bootstrap',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error(`Failed to create bootstrap job: ${jobError.message}`);
      // Continue anyway, as the credentials were stored successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        integrationId: integration.id,
        jobId: job?.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error storing credentials:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});