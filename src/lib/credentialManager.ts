import { supabase } from './supabase';
import { Integration } from '../types';

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

export interface IntegrationLog {
  id: string;
  user_id: string;
  platform: string;
  action: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  log_level: 'info' | 'warning' | 'error' | 'success';
  message?: string;
  error_details?: Record<string, any>;
  created_at: string;
}

export interface UserDashboardStats {
  user_id: string;
  total_connections: number;
  active_platforms: number;
  connected_count: number;
  error_count: number;
  last_activity?: string;
  avg_performance_score?: number;
}

export class CredentialManager {
  static async saveCredential(
    userId: string,
    platform: string,
    platformName: string,
    credentialData: {
      type: 'oauth' | 'api_key' | 'manual';
      accessToken?: string;
      refreshToken?: string;
      apiKey?: string;
      apiSecret?: string;
      additionalData?: Record<string, any>;
      scopes?: string[];
      expiresAt?: string;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Call the Edge Function to store credentials securely
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/storeCredentials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          userId,
          providerKey: platform,
          providerName: platformName,
          credentialType: credentialData.type,
          accessToken: credentialData.accessToken,
          refreshToken: credentialData.refreshToken,
          apiKey: credentialData.apiKey,
          apiSecret: credentialData.apiSecret,
          expiresAt: credentialData.expiresAt,
          additionalData: credentialData.additionalData,
          scopes: credentialData.scopes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to save credential' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in saveCredential:', error);
      return { success: false, error: 'Failed to save credential' };
    }
  }

  static async getCredentials(userId: string): Promise<DatabaseCredential[]> {
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching credentials:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCredentials:', error);
      return [];
    }
  }

  static async getIntegrations(userId: string): Promise<Integration[]> {
    try {
      const { data, error } = await supabase
        .from('integrations') 
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching integrations:', error);
        return [];
      }

      return (data || []).map(item => ({
        id: item.id, 
        userId: item.user_id,
        workspaceId: item.workspace_id,
        providerKey: item.provider_key,
        providerName: item.provider_name,
        status: item.status,
        lastSyncAt: item.last_sync_at,
        nextSyncAt: item.next_sync_at,
        healthScore: item.health_score,
        errorMessage: item.error_message,
        metadata: item.metadata,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      }));
    } catch (error) {
      console.error('Error in getIntegrations:', error);
      return [];
    }
  }

  static async getIntegration(userId: string, platform: string): Promise<Integration | null> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('user_id', userId)
        .eq('provider_key', platform)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching integration:', error);
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        workspaceId: data.workspace_id,
        providerKey: data.provider_key,
        providerName: data.provider_name,
        status: data.status,
        lastSyncAt: data.last_sync_at,
        nextSyncAt: data.next_sync_at,
        healthScore: data.health_score,
        errorMessage: data.error_message,
        metadata: data.metadata,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error in getIntegrations:', error);
      return [];
    }
  }

  static async getCredential(userId: string, platform: string): Promise<DatabaseCredential | null> {
    try {
      const { data, error } = await supabase
        .from('credentials')
        .select('*')
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        console.error('Error fetching credential:', error);
        return null;
      }

      // Update last_used_at
      await supabase
        .from('credentials')
        .update({ 
          last_used_at: new Date().toISOString(),
          connection_count: (data.connection_count || 0) + 1
        })
        .eq('id', data.id);

      return data;
    } catch (error) {
      console.error('Error in getCredential:', error);
      return null;
    }
  }

  static async deleteCredential(userId: string, platform: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Find the integration ID for this platform
      const { data: integrations, error: integrationsError } = await supabase
        .from('integrations')
        .select('id')
        .eq('user_id', userId)
        .eq('provider_key', platform);

      if (integrationsError) {
        console.error('Error finding integration:', integrationsError);
        return { success: false, error: integrationsError.message };
      }

      if (!integrations || integrations.length === 0) {
        return { success: false, error: 'Integration not found' };
      }

      // Call the Edge Function to revoke the token
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/revokeToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          integrationId: integrations[0].id,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to revoke token' };
      }

      return { success: true };
    } catch (error) {
      console.error('Error in deleteCredential:', error);
      return { success: false, error: 'Failed to delete credential' };
    }
  }

  static async refreshToken(
    userId: string,
    integrationId: string
  ): Promise<{ success: boolean; error?: string; expiresAt?: string }> {
    try {
      // Call the Edge Function to refresh the token
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refreshToken`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          integrationId,
          userId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, error: errorData.error || 'Failed to refresh token' };
      }

      const result = await response.json();
      return { 
        success: true,
        expiresAt: result.expiresAt
      };
    } catch (error) {
      console.error('Error in refreshToken:', error);
      return { success: false, error: 'Failed to refresh token' };
    }
  }

  static async getIntegrationLogs(
    userId: string,
    platform?: string,
    limit: number = 50
  ): Promise<IntegrationLog[]> {
    try {
      let query = supabase
        .from('integration_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching integration logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getIntegrationLogs:', error);
      return [];
    }
  }

  static async getDashboardStats(userId: string): Promise<UserDashboardStats | null> {
    try {
      const { data, error } = await supabase
        .from('user_dashboard_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching dashboard stats:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      return null;
    }
  }

  static async updateCredentialStatus(
    userId: string,
    platform: string,
    status: 'connected' | 'disconnected' | 'error' | 'pending',
    errorMessage?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: credentials, error: credentialsError } = await supabase
        .from('credentials')
        .select('id')
        .eq('user_id', userId)
        .eq('platform', platform)
        .eq('is_active', true);

      if (credentialsError || !credentials || credentials.length === 0) {
        return { success: false, error: 'Credential not found' };
      }

      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'error' && errorMessage) {
        updateData.additional_data = { error: errorMessage };
      }

      const { error } = await supabase
        .from('credentials')
        .update(updateData)
        .eq('id', credentials[0].id);

      if (error) {
        console.error('Error updating credential status:', error);
        return { success: false, error: error.message };
      }

      // Log status change
      await supabase.from('integration_logs').insert({
        user_id: userId,
        platform,
        action: 'status_update',
        status,
        log_level: status === 'error' ? 'error' : 'info',
        message: `Status updated to ${status}${errorMessage ? `: ${errorMessage}` : ''}`
      });

      return { success: true };
    } catch (error) {
      console.error('Error in updateCredentialStatus:', error);
      return { success: false, error: 'Failed to update credential status' };
    }
  }
}