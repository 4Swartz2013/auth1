import { Queue, Worker, Job } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import * as CryptoJS from 'crypto-js';
import { getProvider } from '../packages/integrations-core';
import { BootstrapOptions } from '../packages/integrations-core/template';
import { logger } from '../packages/shared/log';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Redis connection for BullMQ
const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
};

// Create a queue for bootstrap jobs
const bootstrapQueue = new Queue('integration-bootstrap', {
  connection: redisOptions,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

// Function to decrypt sensitive data
const decryptData = (encryptedData: string | null) => {
  if (!encryptedData) return null;
  const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Worker to process bootstrap jobs
const worker = new Worker('integration-bootstrap', async (job: Job) => {
  const { integrationId } = job.data;
  
  try {
    logger.info(`Starting bootstrap for integration ${integrationId}`, { integrationId });
    
    // Update job status
    await supabase
      .from('integration_sync_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', job.data.jobId);
    
    // Get integration details
    const { data: integration, error: integrationError } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', integrationId)
      .single();
    
    if (integrationError || !integration) {
      throw new Error(`Integration not found: ${integrationError?.message}`);
    }
    
    // Get credentials
    const { data: credential, error: credentialError } = await supabase
      .from('credentials')
      .select('*')
      .eq('integration_id', integrationId)
      .single();
    
    if (credentialError || !credential) {
      throw new Error(`Credentials not found: ${credentialError?.message}`);
    }
    
    // Get provider
    const provider = getProvider(integration.provider_key);
    if (!provider) {
      throw new Error(`Provider not found: ${integration.provider_key}`);
    }
    
    // Decrypt tokens
    const accessToken = decryptData(credential.access_token);
    const refreshToken = decryptData(credential.refresh_token);
    const apiKey = decryptData(credential.api_key);
    const apiSecret = decryptData(credential.api_secret);
    
    if (!accessToken && !apiKey) {
      throw new Error('No access token or API key available');
    }
    
    // Prepare bootstrap options
    const bootstrapOptions: BootstrapOptions = {
      userId: integration.user_id,
      integrationId: integration.id,
      accessToken: accessToken!,
      refreshToken: refreshToken,
      apiKey: apiKey,
      apiSecret: apiSecret,
      additionalData: credential.additional_data
    };
    
    // Call provider's bootstrap method
    const result = await provider.bootstrap(bootstrapOptions);
    
    if (!result.success) {
      throw new Error(result.error || 'Bootstrap failed');
    }
    
    // Update integration with webhook info if available
    if (result.webhookId || result.webhookSecret) {
      await supabase
        .from('integration_webhooks')
        .upsert({
          integration_id: integrationId,
          webhook_id: result.webhookId,
          webhook_secret: result.webhookSecret,
          webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/${integration.provider_key}`,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'integration_id'
        });
    }
    
    // Update integration status
    await supabase
      .from('integrations')
      .update({
        status: 'connected',
        last_sync_at: new Date().toISOString(),
        next_sync_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        health_score: 100,
        error_message: null,
        metadata: {
          ...integration.metadata,
          ...result.metadata
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId);
    
    // Update job status
    await supabase
      .from('integration_sync_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        result_summary: {
          success: true,
          initialSyncCompleted: result.initialSyncCompleted,
          webhookSetup: !!result.webhookId
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', job.data.jobId);
    
    // Log success
    await supabase.rpc('log_integration_event', {
      p_integration_id: integrationId,
      p_event_type: 'bootstrap',
      p_status: 'connected',
      p_message: `Successfully bootstrapped ${integration.provider_name} integration`,
      p_details: result.metadata
    });
    
    logger.info(`Bootstrap completed for integration ${integrationId}`, { 
      integrationId,
      provider: integration.provider_key,
      success: true
    });
    
    return { success: true, integrationId };
  } catch (error) {
    logger.error(`Bootstrap failed for integration ${integrationId}`, { 
      integrationId,
      error: error.message
    });
    
    // Update integration status
    await supabase
      .from('integrations')
      .update({
        status: 'error',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', integrationId);
    
    // Update job status
    await supabase
      .from('integration_sync_jobs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.data.jobId);
    
    // Log error
    await supabase.rpc('log_integration_event', {
      p_integration_id: integrationId,
      p_event_type: 'bootstrap',
      p_status: 'error',
      p_message: `Bootstrap failed: ${error.message}`,
      p_details: { error: error.message }
    });
    
    throw error;
  }
}, { connection: redisOptions });

// Handle worker events
worker.on('completed', (job) => {
  logger.info(`Job ${job.id} completed`, { jobId: job.id });
});

worker.on('failed', (job, error) => {
  logger.error(`Job ${job?.id} failed`, { jobId: job?.id, error: error.message });
});

// Function to add a job to the queue
export async function queueBootstrapJob(integrationId: string, jobId: string) {
  await bootstrapQueue.add('bootstrap', { integrationId, jobId }, {
    jobId: `bootstrap-${integrationId}-${Date.now()}`
  });
}

// Export the queue and worker for use in other parts of the application
export { bootstrapQueue, worker };

// If this file is run directly, start the worker
if (require.main === module) {
  logger.info('Starting bootstrap worker...');
  
  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down bootstrap worker...');
    await worker.close();
    process.exit(0);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}