import { createClient } from '@supabase/supabase-js';
import * as CryptoJS from 'crypto-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const encryptionKey = process.env.CREDENTIAL_ENCRYPTION_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to decrypt sensitive data
const decryptData = (encryptedData: string | null) => {
  if (!encryptedData) return null;
  const bytes = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Main function to process bootstrap jobs
async function processBootstrapJobs() {
  console.log('Starting bootstrap job processing...');
  
  try {
    // Get pending jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('integration_sync_jobs')
      .select('*')
      .eq('status', 'pending')
      .eq('job_type', 'bootstrap')
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return;
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('No pending jobs found');
      return;
    }
    
    console.log(`Found ${jobs.length} pending jobs`);
    
    // Process each job
    for (const job of jobs) {
      await processJob(job);
    }
  } catch (error) {
    console.error('Error in processBootstrapJobs:', error);
  }
}

// Process a single job
async function processJob(job: any) {
  const { id: jobId, integration_id: integrationId } = job;
  
  console.log(`Processing job ${jobId} for integration ${integrationId}`);
  
  try {
    // Update job status
    await supabase
      .from('integration_sync_jobs')
      .update({
        status: 'running',
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
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
    
    // Decrypt tokens
    const accessToken = decryptData(credential.access_token);
    const refreshToken = decryptData(credential.refresh_token);
    const apiKey = decryptData(credential.api_key);
    const apiSecret = decryptData(credential.api_secret);
    
    if (!accessToken && !apiKey) {
      throw new Error('No access token or API key available');
    }
    
    // Simulate bootstrap process
    // In a real implementation, you would call the provider's bootstrap method
    const bootstrapResult = await simulateBootstrap(
      integration.provider_key,
      {
        userId: integration.user_id,
        integrationId: integration.id,
        accessToken: accessToken!,
        refreshToken,
        apiKey,
        apiSecret,
        additionalData: credential.additional_data
      }
    );
    
    if (!bootstrapResult.success) {
      throw new Error(bootstrapResult.error || 'Bootstrap failed');
    }
    
    // Update integration with webhook info if available
    if (bootstrapResult.webhookId || bootstrapResult.webhookSecret) {
      await supabase
        .from('integration_webhooks')
        .upsert({
          integration_id: integrationId,
          webhook_id: bootstrapResult.webhookId,
          webhook_secret: bootstrapResult.webhookSecret,
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
          ...bootstrapResult.metadata
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
          initialSyncCompleted: bootstrapResult.initialSyncCompleted,
          webhookSetup: !!bootstrapResult.webhookId
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    // Log success
    await supabase.from('integration_logs').insert({
      user_id: integration.user_id,
      platform: integration.provider_key,
      action: 'bootstrap',
      status: 'connected',
      log_level: 'info',
      message: `Successfully bootstrapped ${integration.provider_name} integration`,
    });
    
    console.log(`Bootstrap completed for integration ${integrationId}`);
  } catch (error: any) {
    console.error(`Bootstrap failed for integration ${integrationId}:`, error);
    
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
      .eq('id', jobId);
    
    // Log error
    await supabase.from('integration_logs').insert({
      user_id: job.user_id,
      platform: job.platform || 'unknown',
      action: 'bootstrap',
      status: 'error',
      log_level: 'error',
      message: `Bootstrap failed: ${error.message}`,
      error_details: { error: error.message }
    });
  }
}

// Simulate bootstrap process
async function simulateBootstrap(
  providerKey: string,
  options: {
    userId: string;
    integrationId: string;
    accessToken?: string;
    refreshToken?: string;
    apiKey?: string;
    apiSecret?: string;
    additionalData?: any;
  }
): Promise<{
  success: boolean;
  webhookId?: string;
  webhookSecret?: string;
  initialSyncCompleted: boolean;
  error?: string;
  metadata?: any;
}> {
  // In a real implementation, you would call the provider's bootstrap method
  // For this example, we'll simulate success for all providers
  
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Generate webhook ID and secret
  const webhookId = `${providerKey}-webhook-${Date.now()}`;
  const webhookSecret = `secret-${Math.random().toString(36).substring(2, 15)}`;
  
  // Return success
  return {
    success: true,
    webhookId,
    webhookSecret,
    initialSyncCompleted: true,
    metadata: {
      lastSyncTime: new Date().toISOString(),
      providerSpecificData: {
        // Add provider-specific data here
        [providerKey]: {
          connected: true,
          timestamp: Date.now()
        }
      }
    }
  };
}

// Run the job processor
if (require.main === module) {
  console.log('Starting bootstrap worker...');
  
  // Process jobs every 30 seconds
  setInterval(processBootstrapJobs, 30000);
  
  // Process jobs immediately on startup
  processBootstrapJobs();
  
  // Keep the process running
  process.stdin.resume();
  
  // Graceful shutdown
  const shutdown = async () => {
    console.log('Shutting down bootstrap worker...');
    process.exit(0);
  };
  
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

export { processBootstrapJobs };