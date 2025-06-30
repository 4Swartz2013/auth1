import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. Please configure your .env file.');
}

// Create a mock client if environment variables are not set to prevent initialization errors
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key');

// Database types
export interface DatabaseCredential {
  id: string;
  user_id: string;
  platform: string;
  platform_name: string;
  credential_type: 'oauth' | 'api_key' | 'manual';
  access_token?: string;
  refresh_token?: string;
  api_key?: string;
  api_secret?: string;
  additional_data?: Record<string, any>;
  scopes?: string[];
  expires_at?: string;
  last_refreshed_at?: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  is_active: boolean;
  connection_count: number;
  last_used_at: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseUser {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  subscription_tier: string;
  total_connections: number;
  last_active_at: string;
  preferences: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  theme: string;
  language: string;
  timezone: string;
  email_notifications: boolean;
  push_notifications: boolean;
  security_alerts: boolean;
  auto_refresh_tokens: boolean;
  sync_frequency: string;
  preferred_oauth_method: string;
  analytics_enabled: boolean;
  data_sharing_enabled: boolean;
  custom_settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Helper functions for database operations
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      return false;
    }
    const { data, error } = await supabase.from('user_profiles').select('count').limit(1);
    return !error;
  } catch (error) {
    return false;
  }
};

export const createUserProfile = async (user: any): Promise<boolean> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      console.warn('Supabase not configured properly');
      return false;
    }
    const { error } = await supabase.from('user_profiles').insert({
      id: user.id,
      email: user.email,
      full_name: user.user_metadata?.full_name,
      avatar_url: user.user_metadata?.avatar_url
    });
    return !error;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return false;
  }
};

export const getUserProfile = async (userId: string): Promise<DatabaseUser | null> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      console.warn('Supabase not configured properly');
      return null;
    }
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserProfile:', error);
    return null;
  }
};

export const updateUserProfile = async (
  userId: string, 
  updates: Partial<DatabaseUser>
): Promise<boolean> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      console.warn('Supabase not configured properly');
      return false;
    }
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId);

    return !error;
  } catch (error) {
    console.error('Error updating user profile:', error);
    return false;
  }
};

export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      console.warn('Supabase not configured properly');
      return null;
    }
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUserPreferences:', error);
    return null;
  }
};

export const updateUserPreferences = async (
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<boolean> => {
  try {
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('placeholder')) {
      console.warn('Supabase not configured properly');
      return false;
    }
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      });

    return !error;
  } catch (error) {
    console.error('Error updating user preferences:', error);
    return false;
  }
};