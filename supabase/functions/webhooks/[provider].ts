import { createClient } from "npm:@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  // Extract provider from URL
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/');
  const provider = pathParts[pathParts.length - 1];

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

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing environment variables");
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const rawBody = await req.arrayBuffer();
    const body = new Uint8Array(rawBody);
    
    // Get headers for verification
    const headers: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headers[key] = value;
    });

    // Parse body
    let parsedBody;
    try {
      const textDecoder = new TextDecoder();
      const bodyText = textDecoder.decode(body);
      parsedBody = JSON.parse(bodyText);
    } catch (error) {
      console.error("Failed to parse webhook body:", error);
      parsedBody = { rawData: "Unable to parse" };
    }

    // Find the integration based on webhook ID
    const webhookId = headers["x-webhook-id"] || headers["x-hook-id"] || headers["x-signature"];
    
    let integration;
    if (webhookId) {
      const { data, error } = await supabase
        .from("integration_webhooks")
        .select("integration_id")
        .eq("webhook_id", webhookId)
        .single();
      
      if (!error && data) {
        const { data: integrationData, error: integrationError } = await supabase
          .from("integrations")
          .select("*")
          .eq("id", data.integration_id)
          .single();
        
        if (!integrationError) {
          integration = integrationData;
        }
      }
    }

    // Store webhook event
    const { data: event, error: eventError } = await supabase
      .from("integration_events")
      .insert({
        provider: provider,
        integration_id: integration?.id,
        user_id: integration?.user_id,
        event_type: headers["x-event-type"] || "webhook",
        payload: parsedBody,
        headers: headers,
        processed: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (eventError) {
      console.error("Failed to store webhook event:", eventError);
    }

    // Log the webhook
    if (integration) {
      await supabase.from("integration_logs").insert({
        user_id: integration.user_id,
        platform: provider,
        action: "webhook_received",
        status: "connected",
        log_level: "info",
        message: `Received webhook from ${provider}`,
        error_details: { eventId: event?.id }
      });
    }

    // Return success response
    return new Response(JSON.stringify({ 
      success: true,
      message: "Webhook received",
      eventId: event?.id
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});