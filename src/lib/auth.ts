import { supabase } from './supabase';
import { User, Workspace, WorkspaceMember, Permission, PermissionGroup, Invitation } from '../types/auth';

export class AuthManager {
  // Admin Functions
  static async getAllUsers(adminUserId: string): Promise<WorkspaceMember[]> {
    try {
      // Verify admin role
      const { data: adminUser } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', adminUserId)
        .single();

      if (adminUser?.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      // Get all users with their workspace information
      const { data, error } = await supabase
        .from('enhanced_workspace_members')
        .select('*')
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all users:', error);
      return [];
    }
  }

  static async getAllWorkspaces(adminUserId: string): Promise<Workspace[]> {
    try {
      const { data: adminUser } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', adminUserId)
        .single();

      if (adminUser?.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { data, error } = await supabase
        .from('workspaces')
        .select(`
          *,
          workspace_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all workspaces:', error);
      return [];
    }
  }

  static async updateUserRole(adminUserId: string, targetUserId: string, newRole: string): Promise<boolean> {
    try {
      const { data: adminUser } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', adminUserId)
        .single();

      if (adminUser?.role !== 'admin') {
        throw new Error('Unauthorized: Admin access required');
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', targetUserId);

      return !error;
    } catch (error) {
      console.error('Error updating user role:', error);
      return false;
    }
  }

  // Client Functions
  static async createWorkspace(userId: string, name: string): Promise<Workspace | null> {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name,
          owner_id: userId,
          settings: {}
        })
        .select()
        .single();

      if (error) throw error;

      // Add user as workspace owner
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: data.id,
          user_id: userId,
          role: 'owner',
          status: 'active'
        });

      if (memberError) {
        console.error('Error adding workspace member:', memberError);
      }

      return data;
    } catch (error) {
      console.error('Error creating workspace:', error);
      return null;
    }
  }

  static async updateWorkspace(workspaceId: string, userId: string, updates: { name?: string; settings?: any }): Promise<boolean> {
    try {
      // Check if user has permission to update workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new Error('Unauthorized: Cannot update workspace');
      }

      const { error } = await supabase
        .from('workspaces')
        .update(updates)
        .eq('id', workspaceId);

      return !error;
    } catch (error) {
      console.error('Error updating workspace:', error);
      return false;
    }
  }

  static async getWorkspaceMembers(workspaceId: string, userId: string): Promise<WorkspaceMember[]> {
    try {
      // Check if user has access to this workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        throw new Error('Unauthorized: No access to this workspace');
      }

      const { data, error } = await supabase
        .from('enhanced_workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching workspace members:', error);
      return [];
    }
  }

  // Permission Groups Management
  static async getPermissionGroups(workspaceId: string, userId: string): Promise<PermissionGroup[]> {
    try {
      // Verify access to workspace
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (!membership) {
        throw new Error('Unauthorized: No access to this workspace');
      }

      const { data, error } = await supabase
        .from('permission_groups')
        .select(`
          *,
          workspace_members(count)
        `)
        .eq('workspace_id', workspaceId)
        .order('is_system_default', { ascending: false })
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching permission groups:', error);
      return [];
    }
  }

  static async createPermissionGroup(
    workspaceId: string,
    userId: string,
    name: string,
    description: string,
    permissions: Permission[]
  ): Promise<PermissionGroup | null> {
    try {
      // Check if user has permission to create groups
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new Error('Unauthorized: Cannot create permission groups');
      }

      const { data, error } = await supabase
        .from('permission_groups')
        .insert({
          workspace_id: workspaceId,
          name,
          description,
          permissions: JSON.stringify(permissions),
          created_by: userId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating permission group:', error);
      return null;
    }
  }

  static async updatePermissionGroup(
    groupId: string,
    userId: string,
    updates: Partial<PermissionGroup>
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('permission_groups')
        .update(updates)
        .eq('id', groupId);

      return !error;
    } catch (error) {
      console.error('Error updating permission group:', error);
      return false;
    }
  }

  static async deletePermissionGroup(groupId: string, userId: string): Promise<boolean> {
    try {
      // Check if it's a system default group
      const { data: group } = await supabase
        .from('permission_groups')
        .select('is_system_default')
        .eq('id', groupId)
        .single();

      if (group?.is_system_default) {
        throw new Error('Cannot delete system default permission groups');
      }

      const { error } = await supabase
        .from('permission_groups')
        .delete()
        .eq('id', groupId);

      return !error;
    } catch (error) {
      console.error('Error deleting permission group:', error);
      return false;
    }
  }

  // User Invitation and Management
  static async inviteUser(
    workspaceId: string,
    inviterUserId: string,
    email: string,
    role: string,
    permissionGroupId?: string
  ): Promise<Invitation | null> {
    try {
      // Check if inviter has permission to invite users
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', inviterUserId)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new Error('Unauthorized: Cannot invite users');
      }

      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email,
          role,
          permission_group_id: permissionGroupId,
          invited_by: inviterUserId,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        })
        .select(`
          *,
          permission_groups(name),
          user_profiles!invited_by(full_name)
        `)
        .single();

      if (error) throw error;

      // Send invitation email (would integrate with email service)
      await this.sendInvitationEmail(email, workspaceId, data.invitation_token);

      return data;
    } catch (error) {
      console.error('Error inviting user:', error);
      return null;
    }
  }

  static async acceptInvitation(invitationToken: string, userId: string): Promise<boolean> {
    try {
      // Get invitation details
      const { data: invitation, error: invError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('invitation_token', invitationToken)
        .eq('status', 'pending')
        .single();

      if (invError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Check if invitation is expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('workspace_invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);
        throw new Error('Invitation has expired');
      }

      // Add user to workspace
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: invitation.workspace_id,
          user_id: userId,
          role: invitation.role,
          permission_group_id: invitation.permission_group_id,
          invited_by: invitation.invited_by,
          status: 'active'
        });

      if (memberError) throw memberError;

      // Update invitation status
      await supabase
        .from('workspace_invitations')
        .update({ status: 'accepted' })
        .eq('id', invitation.id);

      // Update user role to invited_user if not already set
      await supabase
        .from('user_profiles')
        .update({ role: 'invited_user' })
        .eq('id', userId)
        .eq('role', 'client'); // Only update if currently 'client'

      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return false;
    }
  }

  static async assignUserToPermissionGroup(
    workspaceId: string,
    assignerUserId: string,
    targetUserId: string,
    permissionGroupId: string
  ): Promise<boolean> {
    try {
      // Check if assigner has permission
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', assignerUserId)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new Error('Unauthorized: Cannot assign permission groups');
      }

      // Update workspace member
      const { error: memberError } = await supabase
        .from('workspace_members')
        .update({ permission_group_id: permissionGroupId })
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUserId);

      if (memberError) throw memberError;

      // Also add to user_permission_groups for tracking
      const { error: groupError } = await supabase
        .from('user_permission_groups')
        .upsert({
          user_id: targetUserId,
          workspace_id: workspaceId,
          permission_group_id: permissionGroupId,
          assigned_by: assignerUserId
        });

      return !groupError;
    } catch (error) {
      console.error('Error assigning user to permission group:', error);
      return false;
    }
  }

  static async removeMember(
    workspaceId: string,
    removerUserId: string,
    targetUserId: string
  ): Promise<boolean> {
    try {
      // Check if remover has permission
      const { data: membership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', removerUserId)
        .single();

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        throw new Error('Unauthorized: Cannot remove members');
      }

      // Cannot remove workspace owner
      const { data: targetMembership } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUserId)
        .single();

      if (targetMembership?.role === 'owner') {
        throw new Error('Cannot remove workspace owner');
      }

      // Remove from workspace_members
      const { error: memberError } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUserId);

      if (memberError) throw memberError;

      // Remove from user_permission_groups
      await supabase
        .from('user_permission_groups')
        .delete()
        .eq('workspace_id', workspaceId)
        .eq('user_id', targetUserId);

      return true;
    } catch (error) {
      console.error('Error removing member:', error);
      return false;
    }
  }

  // Permission Management
  static async getAllPermissions(): Promise<Permission[]> {
    const permissions: Permission[] = [
      // Integration permissions
      { id: 'integrations.view', name: 'View Integrations', description: 'View connected platforms', category: 'integrations', level: 'read' },
      { id: 'integrations.connect', name: 'Connect Platforms', description: 'Connect new platforms', category: 'integrations', level: 'write' },
      { id: 'integrations.disconnect', name: 'Disconnect Platforms', description: 'Disconnect platforms', category: 'integrations', level: 'write' },
      { id: 'integrations.manage', name: 'Manage All Integrations', description: 'Full integration management', category: 'integrations', level: 'admin' },

      // Analytics permissions
      { id: 'analytics.view', name: 'View Analytics', description: 'View performance data', category: 'analytics', level: 'read' },
      { id: 'analytics.export', name: 'Export Analytics', description: 'Export analytics data', category: 'analytics', level: 'write' },
      { id: 'analytics.configure', name: 'Configure Analytics', description: 'Configure analytics settings', category: 'analytics', level: 'admin' },

      // Settings permissions
      { id: 'settings.view', name: 'View Settings', description: 'View workspace settings', category: 'settings', level: 'read' },
      { id: 'settings.edit', name: 'Edit Settings', description: 'Edit workspace settings', category: 'settings', level: 'write' },
      { id: 'settings.admin', name: 'Admin Settings', description: 'Full settings management', category: 'settings', level: 'admin' },

      // User management permissions
      { id: 'users.view', name: 'View Users', description: 'View workspace members', category: 'users', level: 'read' },
      { id: 'users.invite', name: 'Invite Users', description: 'Invite new members', category: 'users', level: 'write' },
      { id: 'users.manage', name: 'Manage Users', description: 'Full user management', category: 'users', level: 'admin' },

      // Billing permissions
      { id: 'billing.view', name: 'View Billing', description: 'View billing information', category: 'billing', level: 'read' },
      { id: 'billing.manage', name: 'Manage Billing', description: 'Manage billing and subscriptions', category: 'billing', level: 'admin' }
    ];

    return permissions;
  }

  static async getUserPermissions(userId: string, workspaceId: string): Promise<Permission[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_user_permissions', {
          user_id_param: userId,
          workspace_id_param: workspaceId
        });

      if (error) {
        console.error('Error fetching user permissions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserPermissions:', error);
      return [];
    }
  }

  static hasPermission(userPermissions: Permission[], requiredPermission: string): boolean {
    return userPermissions.some(p => p.id === requiredPermission);
  }

  // Utility Functions
  static async sendInvitationEmail(email: string, workspaceId: string, invitationToken: string): Promise<void> {
    // This would integrate with your email service
    console.log(`Sending invitation email to ${email} for workspace ${workspaceId} with token ${invitationToken}`);
    // Implementation would depend on your email service (SendGrid, etc.)
  }

  static async getUserWorkspaces(userId: string): Promise<Workspace[]> {
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          role,
          workspaces(*)
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) throw error;
      return data?.map(item => item.workspaces).filter(Boolean) || [];
    } catch (error) {
      console.error('Error fetching user workspaces:', error);
      return [];
    }
  }

  static async switchWorkspace(userId: string, workspaceId: string): Promise<boolean> {
    try {
      // Verify user has access to workspace
      const { data } = await supabase
        .from('workspace_members')
        .select('role')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId)
        .eq('status', 'active')
        .single();
      
      if (!data) return false;

      // Update user's current workspace
      const { error } = await supabase
        .from('user_profiles')
        .update({ current_workspace_id: workspaceId })
        .eq('id', userId);

      return !error;
    } catch (error) {
      console.error('Error switching workspace:', error);
      return false;
    }
  }

  // Get pending invitations for a workspace
  static async getPendingInvitations(workspaceId: string, userId: string): Promise<Invitation[]> {
    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select(`
          *,
          permission_groups(name),
          user_profiles!invited_by(full_name, email)
        `)
        .eq('workspace_id', workspaceId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  }
}