import { createClient } from '@supabase/supabase-js';
import { LogflareTransport } from 'logflare-transport-core';
import { createLogger, format, transports } from 'winston';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Logflare transport if API key is available
const logflareTransport = process.env.LOGFLARE_API_KEY && process.env.LOGFLARE_SOURCE_ID
  ? new LogflareTransport({
      apiKey: process.env.LOGFLARE_API_KEY,
      sourceToken: process.env.LOGFLARE_SOURCE_ID,
      metadata: {
        env: process.env.NODE_ENV || 'development',
        service: 'influence-mate'
      }
    })
  : null;

// Create Winston logger
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  defaultMeta: { service: 'influence-mate' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    // Add Logflare transport if available
    ...(logflareTransport ? [logflareTransport] : [])
  ]
});

// Function to log to Supabase integration_logs table
export async function logIntegrationEvent(
  userId: string,
  platform: string,
  action: string,
  status: 'connected' | 'disconnected' | 'error' | 'pending',
  message?: string,
  errorDetails?: Record<string, any>
) {
  try {
    // Log to Winston/Logflare
    logger.info(`Integration event: ${action} - ${status}`, {
      userId,
      platform,
      action,
      status,
      message,
      errorDetails
    });
    
    // Log to Supabase
    await supabase.rpc('log_integration_activity', {
      p_user_id: userId,
      p_platform: platform,
      p_action: action,
      p_status: status,
      p_message: message,
      p_error_details: errorDetails
    });
  } catch (error) {
    logger.error('Failed to log integration event', {
      userId,
      platform,
      action,
      error: error.message
    });
  }
}

// Export a function to create a child logger with additional context
export function createChildLogger(context: Record<string, any>) {
  return logger.child(context);
}