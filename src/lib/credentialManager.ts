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
      const credential: Partial<DatabaseCredential> = {
        user_id: userId,
        platform,
        platform_name: platformName,
        credential_type: credentialData.type,
        access_token: credentialData.accessToken,
        refresh_token: credentialData.refreshToken,
        api_key: credentialData.apiKey,
        api_secret: credentialData.apiSecret,
        additional_data: credentialData.additionalData,
        scopes: credentialData.scopes,
        expires_at: credentialData.expiresAt,
        status: 'connected',
        is_active: true,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('credentials')
        .upsert(credential, {
          onConflict: 'user_id,platform'
        });

      if (error) {
        console.error('Error saving credential:', error);
        
        // Log the error
        await this.logIntegrationActivity(
          userId,
          platform,
          'save_credential',
          'error',
          `Failed to save credential: ${error.message}`,
          { error: error.message, code: error.code }
        );
        
        return { success: false, error: error.message };
      }

      // Log successful save
      await this.logIntegrationActivity(
        userId,
        platform,
        'save_credential',
        'connected',
        `Successfully saved ${credentialData.type} credential for ${platformName}`
      );

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
      const { error } = await supabase
        .from('credentials')
        .update({ 
          is_active: false, 
          status: 'disconnected',
          updated_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .eq('platform', platform);

      if (error) {
        console.error('Error deleting credential:', error);
        
        await this.logIntegrationActivity(
          userId,
          platform,
          'delete_credential',
          'error',
          `Failed to delete credential: ${error.message}`,
          { error: error.message, code: error.code }
        );
        
        return { success: false, error: error.message };
      }

      // Log successful deletion
      await this.logIntegrationActivity(
        userId,
        platform,
        'delete_credential',
        'disconnected',
        `Successfully disconnected from ${platform}`
      );

      return { success: true };
    } catch (error) {
      console.error('Error in deleteCredential:', error);
      return { success: false, error: 'Failed to delete credential' };
    }
  }

  static async refreshToken(
    userId: string,
    platform: string,
    newAccessToken: string,
    newRefreshToken?: string,
    expiresAt?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData: Partial<DatabaseCredential> = {
        access_token: newAccessToken,
        last_refreshed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        status: 'connected'
      };

      if (newRefreshToken) {
        updateData.refresh_token = newRefreshToken;
      }

      if (expiresAt) {
        updateData.expires_at = expiresAt;
      }

      const { error } = await supabase
        .from('credentials')
        .update(updateData)
        .eq('user_id', userId)
        .eq('platform', platform);

      if (error) {
        console.error('Error refreshing token:', error);
        
        await this.logIntegrationActivity(
          userId,
          platform,
          'refresh_token',
          'error',
          `Failed to refresh token: ${error.message}`,
          { error: error.message, code: error.code }
        );
        
        return { success: false, error: error.message };
      }

      // Log successful refresh
      await this.logIntegrationActivity(
        userId,
        platform,
        'refresh_token',
        'connected',
        `Successfully refreshed token for ${platform}`
      );

      return { success: true };
    } catch (error) {
      console.error('Error in refreshToken:', error);
      return { success: false, error: 'Failed to refresh token' };
    }
  }

  static async logIntegrationActivity(
    userId: string,
    platform: string,
    action: string,
    status: 'connected' | 'disconnected' | 'error' | 'pending',
    message?: string,
    errorDetails?: Record<string, any>
  ): Promise<void> {
    try {
      await supabase.rpc('log_integration_activity', {
        p_user_id: userId,
        p_platform: platform,
        p_action: action,
        p_status: status,
        p_message: message,
        p_error_details: errorDetails
      });
    } catch (error) {
      console.error('Error logging integration activity:', error);
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
      const updateData: Partial<DatabaseCredential> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'error' && errorMessage) {
        updateData.additional_data = { error: errorMessage };
      }

      const { error } = await supabase
        .from('credentials')
        .update(updateData)
        .eq('user_id', userId)
        .eq('platform', platform);

      if (error) {
        console.error('Error updating credential status:', error);
        return { success: false, error: error.message };
      }

      // Log status change
      await this.logIntegrationActivity(
        userId,
        platform,
        'status_update',
        status,
        `Status updated to ${status}${errorMessage ? `: ${errorMessage}` : ''}`
      );

      return { success: true };
    } catch (error) {
      console.error('Error in updateCredentialStatus:', error);
      return { success: false, error: 'Failed to update credential status' };
    }
  }
}