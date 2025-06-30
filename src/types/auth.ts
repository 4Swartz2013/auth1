export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  role: 'admin' | 'client' | 'invited_user';
  subscription_tier: string;
  created_at: string;
  updated_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  settings: Record<string, any>;
  subscription_plan?: string;
  member_count?: number;
}

export interface WorkspaceMember {
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  permission_group_id?: string;
  permission_group_name?: string;
  permission_group_description?: string;
  invited_by?: string;
  invited_by_name?: string;
  invited_by_email?: string;
  joined_at: string;
  status: 'active' | 'pending' | 'suspended';
  user_profiles?: {
    email: string;
    full_name?: string;
    avatar_url?: string;
    role: string;
    subscription_tier: string;
  };
  workspace_name?: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: 'integrations' | 'analytics' | 'settings' | 'billing' | 'users';
  level: 'read' | 'write' | 'admin';
}

export interface PermissionGroup {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  is_system_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  permission_group_id?: string;
  permission_group_name?: string;
  invited_by: string;
  invited_by_name?: string;
  invitation_token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  created_at: string;
}

export interface AuthState {
  user: User | null;
  workspace: Workspace | null;
  permissions: Permission[];
  loading: boolean;
  error: string | null;
}