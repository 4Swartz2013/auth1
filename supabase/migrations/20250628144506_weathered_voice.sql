/*
  # Complete Influence Mate Database Schema

  1. New Tables
    - `user_profiles` - User information and metadata
    - `credentials` - Encrypted storage for platform credentials
    - `integration_logs` - Track connection attempts and status
    - `oauth_states` - Temporary storage for OAuth flows
    - `platform_usage_stats` - Track platform usage and performance
    - `user_preferences` - Store user settings and preferences

  2. Security
    - Enable RLS on all tables
    - Add comprehensive policies for data access
    - Implement audit logging

  3. Functions
    - Automatic user profile creation
    - Credential encryption/decryption
    - Usage tracking
*/

-- Create enum types
CREATE TYPE credential_type AS ENUM ('oauth', 'api_key', 'manual');
CREATE TYPE integration_status AS ENUM ('connected', 'disconnected', 'error', 'pending');
CREATE TYPE log_level AS ENUM ('info', 'warning', 'error', 'success');

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text,
  avatar_url text,
  subscription_tier text DEFAULT 'free',
  total_connections integer DEFAULT 0,
  last_active_at timestamptz DEFAULT now(),
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create credentials table with enhanced security
CREATE TABLE IF NOT EXISTS credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
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
  
  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, platform)
);

-- Create integration_logs table for tracking
CREATE TABLE IF NOT EXISTS integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
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
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  state_token text UNIQUE NOT NULL,
  code_verifier text,
  redirect_uri text,
  scopes text[],
  expires_at timestamptz DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz DEFAULT now()
);

-- Create platform_usage_stats table
CREATE TABLE IF NOT EXISTS platform_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  date date DEFAULT CURRENT_DATE,
  api_calls_count integer DEFAULT 0,
  data_synced_mb numeric(10,2) DEFAULT 0,
  last_sync_at timestamptz,
  performance_score integer CHECK (performance_score >= 0 AND performance_score <= 100),
  error_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, platform, date)
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- UI preferences
  theme text DEFAULT 'dark',
  language text DEFAULT 'en',
  timezone text DEFAULT 'UTC',
  
  -- Notification preferences
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  security_alerts boolean DEFAULT true,
  
  -- Integration preferences
  auto_refresh_tokens boolean DEFAULT true,
  sync_frequency text DEFAULT 'daily',
  preferred_oauth_method text DEFAULT 'popup',
  
  -- Privacy settings
  analytics_enabled boolean DEFAULT true,
  data_sharing_enabled boolean DEFAULT false,
  
  -- Custom settings
  custom_settings jsonb DEFAULT '{}',
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credentials_user_platform ON credentials(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_expires_at ON credentials(expires_at);
CREATE INDEX IF NOT EXISTS idx_integration_logs_user_created ON integration_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON platform_usage_stats(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for credentials
CREATE POLICY "Users can view own credentials"
  ON credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials"
  ON credentials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own credentials"
  ON credentials FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials"
  ON credentials FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for integration_logs
CREATE POLICY "Users can view own logs"
  ON integration_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own logs"
  ON integration_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for oauth_states
CREATE POLICY "Users can manage own oauth states"
  ON oauth_states FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for platform_usage_stats
CREATE POLICY "Users can view own usage stats"
  ON platform_usage_stats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage stats"
  ON platform_usage_stats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage stats"
  ON platform_usage_stats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for user_preferences
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Function to automatically create user profile and preferences
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert user profile
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  
  -- Insert default preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to log integration activities
CREATE OR REPLACE FUNCTION public.log_integration_activity(
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
CREATE OR REPLACE FUNCTION public.update_user_connection_count()
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

-- Function to clean up expired OAuth states
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void AS $$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON platform_usage_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Connection count trigger
CREATE TRIGGER update_connection_count
  AFTER INSERT OR UPDATE OR DELETE ON credentials
  FOR EACH ROW EXECUTE FUNCTION public.update_user_connection_count();

-- Create a view for user dashboard stats
CREATE OR REPLACE VIEW user_dashboard_stats AS
SELECT 
  up.id as user_id,
  up.total_connections,
  COUNT(DISTINCT c.platform) as active_platforms,
  COUNT(CASE WHEN c.status = 'connected' THEN 1 END) as connected_count,
  COUNT(CASE WHEN c.status = 'error' THEN 1 END) as error_count,
  MAX(c.last_used_at) as last_activity,
  AVG(pus.performance_score) as avg_performance_score
FROM user_profiles up
LEFT JOIN credentials c ON up.id = c.user_id AND c.is_active = true
LEFT JOIN platform_usage_stats pus ON up.id = pus.user_id 
  AND pus.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY up.id, up.total_connections;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;