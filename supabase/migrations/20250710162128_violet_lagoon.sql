-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE credential_type AS ENUM ('oauth', 'api_key', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE log_level AS ENUM ('info', 'warning', 'error', 'success');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create credentials table with enhanced security
CREATE TABLE IF NOT EXISTS credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  platform_name text NOT NULL,
  credential_type credential_type NOT NULL DEFAULT 'manual',
  
  -- Encrypted credential fields
  access_token text,
  refresh_token text,
  api_key text,
  api_secret text,
  
  -- Additional configuration
  additional_data jsonb DEFAULT '{}',
  scopes text[],
  
  -- Token management
  expires_at timestamptz,
  last_refreshed_at timestamptz,
  
  -- Status and metadata
  status integration_status DEFAULT 'connected',
  is_active boolean DEFAULT true,
  connection_count integer DEFAULT 0,
  last_used_at timestamptz DEFAULT now(),
  integration_id uuid,
  
  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, platform)
);

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

-- Create integration_logs table for tracking
CREATE TABLE IF NOT EXISTS integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  action text NOT NULL,
  status integration_status NOT NULL,
  log_level log_level DEFAULT 'info',
  message text,
  error_details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create oauth_states table for OAuth flow security
CREATE TABLE IF NOT EXISTS oauth_states (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  state_token text UNIQUE NOT NULL,
  code_verifier text,
  redirect_uri text,
  scopes text[],
  expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
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

-- Create integration_events table for webhook events
CREATE TABLE IF NOT EXISTS integration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  integration_id uuid REFERENCES integrations(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  headers jsonb,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credentials_user_platform ON credentials(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_expires_at ON credentials(expires_at);
CREATE INDEX IF NOT EXISTS idx_integration_logs_user_created ON integration_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_integrations_user_provider ON integrations(user_id, provider_key);
CREATE INDEX IF NOT EXISTS idx_integrations_workspace ON integrations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_integration_webhooks_integration ON integration_webhooks(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_integration ON integration_sync_jobs(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_jobs_status ON integration_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_integration_events_integration ON integration_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_events_processed ON integration_events(processed);

-- Add foreign key from credentials to integrations if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_credentials_integration'
  ) THEN
    ALTER TABLE credentials
    ADD CONSTRAINT fk_credentials_integration
    FOREIGN KEY (integration_id) REFERENCES integrations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;

-- Create policies for credentials
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own credentials') THEN
    CREATE POLICY "Users can view own credentials"
      ON credentials FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own credentials') THEN
    CREATE POLICY "Users can insert own credentials"
      ON credentials FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own credentials') THEN
    CREATE POLICY "Users can update own credentials"
      ON credentials FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own credentials') THEN
    CREATE POLICY "Users can delete own credentials"
      ON credentials FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for integrations
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own integrations') THEN
    CREATE POLICY "Users can view own integrations"
      ON integrations FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own integrations') THEN
    CREATE POLICY "Users can insert own integrations"
      ON integrations FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own integrations') THEN
    CREATE POLICY "Users can update own integrations"
      ON integrations FOR UPDATE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete own integrations') THEN
    CREATE POLICY "Users can delete own integrations"
      ON integrations FOR DELETE TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for integration_logs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own logs') THEN
    CREATE POLICY "Users can view own logs"
      ON integration_logs FOR SELECT TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own logs') THEN
    CREATE POLICY "Users can insert own logs"
      ON integration_logs FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for oauth_states
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own oauth states') THEN
    CREATE POLICY "Users can manage own oauth states"
      ON oauth_states FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Create policies for integration_webhooks
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own integration webhooks') THEN
    CREATE POLICY "Users can view own integration webhooks"
      ON integration_webhooks FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM integrations
        WHERE integrations.id = integration_webhooks.integration_id
        AND integrations.user_id = auth.uid()
      ));
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own integration webhooks') THEN
    CREATE POLICY "Users can manage own integration webhooks"
      ON integration_webhooks FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM integrations
        WHERE integrations.id = integration_webhooks.integration_id
        AND integrations.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Create policies for integration_sync_jobs
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own integration sync jobs') THEN
    CREATE POLICY "Users can view own integration sync jobs"
      ON integration_sync_jobs FOR SELECT TO authenticated
      USING (EXISTS (
        SELECT 1 FROM integrations
        WHERE integrations.id = integration_sync_jobs.integration_id
        AND integrations.user_id = auth.uid()
      ));
  END IF;
END $$;

-- Create policies for integration_events
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own integration events') THEN
    CREATE POLICY "Users can view own integration events"
      ON integration_events FOR SELECT TO authenticated
      USING (user_id IS NULL OR auth.uid() = user_id);
  END IF;
END $$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log integration activities
CREATE OR REPLACE FUNCTION log_integration_activity(
  p_user_id uuid,
  p_platform text,
  p_action text,
  p_status integration_status,
  p_message text DEFAULT NULL,
  p_error_details jsonb DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO integration_logs (
    user_id, platform, action, status, message, error_details
  ) VALUES (
    p_user_id, p_platform, p_action, p_status, p_message, p_error_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user connection count
CREATE OR REPLACE FUNCTION update_user_connection_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active = true THEN
    UPDATE user_profiles 
    SET total_connections = total_connections + 1
    WHERE id = NEW.user_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_active = false AND NEW.is_active = true THEN
      UPDATE user_profiles 
      SET total_connections = total_connections + 1
      WHERE id = NEW.user_id;
    ELSIF OLD.is_active = true AND NEW.is_active = false THEN
      UPDATE user_profiles 
      SET total_connections = total_connections - 1
      WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.is_active = true THEN
    UPDATE user_profiles 
    SET total_connections = total_connections - 1
    WHERE id = OLD.user_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Create triggers for updated_at
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_integrations_updated_at') THEN
    CREATE TRIGGER update_integrations_updated_at
      BEFORE UPDATE ON integrations
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_integration_webhooks_updated_at') THEN
    CREATE TRIGGER update_integration_webhooks_updated_at
      BEFORE UPDATE ON integration_webhooks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_integration_sync_jobs_updated_at') THEN
    CREATE TRIGGER update_integration_sync_jobs_updated_at
      BEFORE UPDATE ON integration_sync_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_credentials_updated_at') THEN
    CREATE TRIGGER update_credentials_updated_at
      BEFORE UPDATE ON credentials
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_connection_count') THEN
    CREATE TRIGGER update_connection_count
      AFTER INSERT OR UPDATE OR DELETE ON credentials
      FOR EACH ROW EXECUTE FUNCTION update_user_connection_count();
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;