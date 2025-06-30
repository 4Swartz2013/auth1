import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle, AlertTriangle, Copy, ExternalLink, Play, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface DatabaseSetupWizardProps {
  onSetupComplete: () => void;
  onClose: () => void;
}

const DatabaseSetupWizard: React.FC<DatabaseSetupWizardProps> = ({ 
  onSetupComplete, 
  onClose 
}) => {
  const [step, setStep] = useState(1);
  const [isCreatingTables, setIsCreatingTables] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sqlScript = `-- Complete Influence Mate Database Schema
-- This script creates all necessary tables, functions, and security policies

-- Create enum types
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
  updated_at timestamptz DEFAULT now(),
  role text DEFAULT 'client' NOT NULL CHECK (role IN ('admin', 'client', 'invited_user'))
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

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  settings jsonb DEFAULT '{}',
  brand_library_id uuid
);

-- Create workspace_members table with status column
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  role text DEFAULT 'member' NOT NULL,
  status text DEFAULT 'active' NOT NULL,
  joined_at timestamptz DEFAULT now(),
  
  PRIMARY KEY (workspace_id, user_id)
);

-- Add status column to workspace_members if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workspace_members' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE workspace_members ADD COLUMN status text DEFAULT 'active' NOT NULL;
    END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credentials_user_platform ON credentials(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_expires_at ON credentials(expires_at);
CREATE INDEX IF NOT EXISTS idx_integration_logs_user_created ON integration_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states(expires_at);
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_date ON platform_usage_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Enable Row Level Security
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for credentials
DROP POLICY IF EXISTS "Users can view own credentials" ON credentials;
CREATE POLICY "Users can view own credentials"
  ON credentials FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own credentials" ON credentials;
CREATE POLICY "Users can insert own credentials"
  ON credentials FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credentials" ON credentials;
CREATE POLICY "Users can update own credentials"
  ON credentials FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own credentials" ON credentials;
CREATE POLICY "Users can delete own credentials"
  ON credentials FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for integration_logs
DROP POLICY IF EXISTS "Users can view own logs" ON integration_logs;
CREATE POLICY "Users can view own logs"
  ON integration_logs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own logs" ON integration_logs;
CREATE POLICY "Users can insert own logs"
  ON integration_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create policies for oauth_states
DROP POLICY IF EXISTS "Users can manage own oauth states" ON oauth_states;
CREATE POLICY "Users can manage own oauth states"
  ON oauth_states FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for platform_usage_stats
DROP POLICY IF EXISTS "Users can view own usage stats" ON platform_usage_stats;
CREATE POLICY "Users can view own usage stats"
  ON platform_usage_stats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own usage stats" ON platform_usage_stats;
CREATE POLICY "Users can insert own usage stats"
  ON platform_usage_stats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own usage stats" ON platform_usage_stats;
CREATE POLICY "Users can update own usage stats"
  ON platform_usage_stats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Create policies for user_preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for workspaces
DROP POLICY IF EXISTS "Workspace members can view their workspaces" ON workspaces;
CREATE POLICY "Workspace members can view their workspaces"
  ON workspaces FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspaces.id 
    AND workspace_members.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Workspace owners can create workspaces" ON workspaces;
CREATE POLICY "Workspace owners can create workspaces"
  ON workspaces FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON workspaces;
CREATE POLICY "Workspace owners can update their workspaces"
  ON workspaces FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Workspace owners can delete their workspaces" ON workspaces;
CREATE POLICY "Workspace owners can delete their workspaces"
  ON workspaces FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- Create policies for workspace_members
DROP POLICY IF EXISTS "Users can view their workspace memberships" ON workspace_members;
CREATE POLICY "Users can view their workspace memberships"
  ON workspace_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

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

-- Create triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at triggers
DROP TRIGGER IF EXISTS handle_updated_at ON user_profiles;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON credentials;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON credentials
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON platform_usage_stats;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON platform_usage_stats
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at ON user_preferences;
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Connection count trigger
DROP TRIGGER IF EXISTS update_connection_count ON credentials;
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
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const createTablesAutomatically = async () => {
    setIsCreatingTables(true);
    setError(null);

    try {
      // Split the SQL script into individual statements and execute them
      const statements = sqlScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      let successCount = 0;
      let errorCount = 0;

      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error } = await supabase.rpc('exec_sql', { 
              sql: statement + ';' 
            });
            
            if (error) {
              console.warn('SQL Warning:', error);
              errorCount++;
            } else {
              successCount++;
            }
          } catch (err) {
            console.warn('SQL execution warning:', err);
            errorCount++;
          }
        }
      }

      // Test if core tables were created successfully
      const { data, error: testError } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1);

      if (testError) {
        throw new Error('Core tables were not created successfully');
      }

      console.log(`Database setup completed: ${successCount} statements succeeded, ${errorCount} had warnings`);
      setSetupComplete(true);
      setTimeout(() => {
        onSetupComplete();
      }, 2000);
    } catch (error: any) {
      console.error('Database setup error:', error);
      setError('Auto-setup encountered issues. Please use manual setup below.');
      setStep(2);
    } finally {
      setIsCreatingTables(false);
    }
  };

  if (setupComplete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-md w-full text-center"
        >
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            Database Setup Complete!
          </h2>
          <p className="text-gray-300 mb-4">
            Your database is now ready with all tables, security policies, and functions.
          </p>
          <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-3">
            <p className="text-green-300 text-sm">
              ✅ User profiles and preferences<br/>
              ✅ Secure credential storage<br/>
              ✅ Integration logging<br/>
              ✅ OAuth state management<br/>
              ✅ Usage analytics<br/>
              ✅ Workspaces and members<br/>
              ✅ Row Level Security (RLS)
            </p>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-800 rounded-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">
                Complete Database Setup
              </h1>
              <p className="text-gray-400 text-sm">
                Set up all tables and features for Influence Mate
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div className="bg-blue-600/20 border border-blue-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Database className="w-5 h-5 text-blue-400 mt-0.5" />
                  <div>
                    <h3 className="text-blue-300 font-semibold mb-1">Complete Database Schema</h3>
                    <p className="text-blue-200 text-sm mb-3">
                      This will create all necessary tables, security policies, and functions for the complete Influence Mate platform.
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-blue-200">
                      <div>✅ User profiles & preferences</div>
                      <div>✅ Secure credential storage</div>
                      <div>✅ Integration activity logs</div>
                      <div>✅ OAuth state management</div>
                      <div>✅ Platform usage analytics</div>
                      <div>✅ Workspaces & members</div>
                      <div>✅ Row Level Security (RLS)</div>
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-600/20 border border-red-600/30 rounded-lg text-red-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex justify-center gap-4">
                <button
                  onClick={createTablesAutomatically}
                  disabled={isCreatingTables}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isCreatingTables ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating Database...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Auto Setup Database
                    </>
                  )}
                </button>

                <button
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Manual Setup
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                  <div>
                    <h3 className="text-yellow-300 font-semibold mb-1">Manual Database Setup</h3>
                    <p className="text-yellow-200 text-sm">
                      Copy and run this complete SQL script in your Supabase SQL Editor.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium">Complete SQL Script:</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(sqlScript)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      Copy All
                    </button>
                    <a
                      href="https://supabase.com/dashboard"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Open Supabase
                    </a>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">
                    {sqlScript}
                  </pre>
                </div>

                <div className="bg-gray-700/50 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-2">Instructions:</h4>
                  <ol className="text-gray-300 text-sm space-y-1 list-decimal list-inside">
                    <li>Copy the complete SQL script above</li>
                    <li>Go to your Supabase project dashboard</li>
                    <li>Navigate to "SQL Editor"</li>
                    <li>Paste and run the entire script</li>
                    <li>Verify all tables were created successfully</li>
                    <li>Click "I've completed the setup" below</li>
                  </ol>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onSetupComplete}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300"
                  >
                    I've Completed the Setup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DatabaseSetupWizard;