/*
  # Create Integrations Table and Related Schema

  1. New Tables
    - `integrations` - Tracks connected integration instances
    - `integration_webhooks` - Stores webhook configurations for integrations
    - `integration_sync_jobs` - Tracks sync jobs for integrations

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access
    - Implement audit logging

  3. Changes
    - Add integration_id foreign key to credentials table
*/

-- Create integrations table
CREATE TABLE IF NOT EXISTS integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  provider_key text NOT NULL,
  provider_name text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'error', 'disconnected')),
  last_sync_at timestamptz,
  next_sync_at timestamptz,
  health_score integer DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  error_message text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, provider_key, workspace_id)
);

-- Create integration_webhooks table
CREATE TABLE IF NOT EXISTS integration_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  webhook_url text NOT NULL,
  webhook_id text,
  webhook_secret text,
  event_types text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create integration_sync_jobs table
CREATE TABLE IF NOT EXISTS integration_sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid REFERENCES integrations(id) ON DELETE CASCADE NOT NULL,
  job_type text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  result_summary jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add integration_id to credentials table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'credentials' AND column_name = 'integration_id'
  ) THEN
    ALTER TABLE credentials ADD COLUMN integration_id uuid REFERENCES integrations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_integrations_user_provider ON integrations(user_id, provider_key);
CREATE INDEX IF NOT EXISTS idx_integrations_workspace ON integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_integration ON integration_webhooks(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_integration ON integration_sync_jobs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_status ON integration_sync_jobs(status);

-- Enable Row Level Security
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for integrations
CREATE POLICY "Users can view own integrations"
  ON integrations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON integrations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON integrations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON integrations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for integration_webhooks
CREATE POLICY "Users can view own integration webhooks"
  ON integration_webhooks FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM integrations
    WHERE integrations.id = integration_webhooks.integration_id
    AND integrations.user_id = auth.uid()
  ));

CREATE POLICY "Users can manage own integration webhooks"
  ON integration_webhooks FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM integrations
    WHERE integrations.id = integration_webhooks.integration_id
    AND integrations.user_id = auth.uid()
  ));

-- Create policies for integration_sync_jobs
CREATE POLICY "Users can view own integration sync jobs"
  ON integration_sync_jobs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM integrations
    WHERE integrations.id = integration_sync_jobs.integration_id
    AND integrations.user_id = auth.uid()
  ));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_webhooks_updated_at
  BEFORE UPDATE ON integration_webhooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_sync_jobs_updated_at
  BEFORE UPDATE ON integration_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log integration events
CREATE OR REPLACE FUNCTION log_integration_event(
  p_integration_id uuid,
  p_event_type text,
  p_status text,
  p_message text DEFAULT NULL,
  p_details jsonb DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_user_id uuid;
  v_provider_key text;
BEGIN
  -- Get user_id and provider_key from integration
  SELECT user_id, provider_key INTO v_user_id, v_provider_key
  FROM integrations
  WHERE id = p_integration_id;
  
  -- Insert log entry
  INSERT INTO integration_logs (
    user_id,
    platform,
    action,
    status,
    message,
    error_details
  ) VALUES (
    v_user_id,
    v_provider_key,
    p_event_type,
    p_status::integration_status,
    p_message,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;