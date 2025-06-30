import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.0";
import * as CryptoJS from "npm:crypto-js@4.1.1";

// This function runs on a cron schedule (hourly)
// It checks all active integrations and refreshes tokens if needed

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    
    // Get all active integrations with credentials that need checking
    const { data: integrations, error: fetchError } = await supabase
      .from('integrations')
      .select(`
        id,
        user_id,
        provider_key,
        provider_name,
        status,
        credentials!inner(
          id,
          credential_type,
          access_token,
          refresh_token,
          expires_at,
          last_refreshed_at
        )
      `)
      .in('status', ['connected', 'error'])
      .order('updated_at', { ascending: true })
      .limit(100); // Process in batches

    if (fetchError) {
      throw new Error(`Failed to fetch integrations: ${fetchError.message}`);
    }

    if (!integrations || integrations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No integrations to check" }),
        { 
          status: 200, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const results = {
      total: integrations.length,
      refreshed: 0,
      errors: 0,
      skipped: 0
    };

    // Process each integration
    for (const integration of integrations) {
      try {
        const credential = integration.credentials[0];
        
        // Skip if no credential found
        if (!credential) {
          results.skipped++;
          continue;
        }

        // Check if token needs refreshing
        const expiresAt = credential.expires_at ? new Date(credential.expires_at) : null;
        const needsRefresh = expiresAt && expiresAt < new Date(Date.now() + 60 * 60 * 1000); // Within 1 hour of expiry
        
        if (needsRefresh && credential.refresh_token) {
          // Decrypt refresh token
          const decryptData = (encryptedData: string | null) => {
            if (!encryptedData) return null;
            const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
            return bytes.toString(CryptoJS.enc.Utf8);
          };

          const refreshToken = decryptData(credential.refresh_token);
          
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }

          // Simulate token refresh - in production, this would call the provider's token endpoint
          const newAccessToken = `new_access_token_${Date.now()}`;
          const newRefreshToken = `new_refresh_token_${Date.now()}`;
          const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
          
          // Encrypt new tokens
          const encryptData = (data: string) => {
            return CryptoJS.AES.encrypt(data, encryptionKey).toString();
          };

          const encryptedAccessToken = encryptData(newAccessToken);
          const encryptedRefreshToken = encryptData(newRefreshToken);

          // Update credentials
          const { error: updateError } = await supabase
            .from('credentials')
            .update({
              access_token: encryptedAccessToken,
              refresh_token: encryptedRefreshToken,
              expires_at: newExpiresAt.toISOString(),
              last_refreshed_at: new Date().toISOString(),
              status: 'connected',
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
              health_score: 100, // Reset health score
              error_message: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', integration.id);

          if (statusError) {
            throw new Error(`Failed to update integration status: ${statusError.message}`);
          }

          // Log the activity
          await supabase.rpc('log_integration_activity', {
            p_user_id: integration.user_id,
            p_platform: integration.provider_key,
            p_action: 'auto_refresh_token',
            p_status: 'connected',
            p_message: `Automatically refreshed token for ${integration.provider_name}`
          });

          results.refreshed++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        console.error(`Error processing integration ${integration.id}:`, error);
        
        // Update integration status to error
        await supabase
          .from('integrations')
          .update({
            status: 'error',
            health_score: Math.max(0, (integration.health_score || 100) - 10), // Decrease health score
            error_message: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', integration.id);
        
        // Log the error
        await supabase.rpc('log_integration_activity', {
          p_user_id: integration.user_id,
          p_platform: integration.provider_key,
          p_action: 'health_check',
          p_status: 'error',
          p_message: `Health check failed: ${error.message}`,
          p_error_details: { error: error.message }
        });
        
        results.errors++;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Health check completed",
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in health check:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});