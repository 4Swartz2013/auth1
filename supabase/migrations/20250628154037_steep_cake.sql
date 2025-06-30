/*
  # Enhanced Permissions and User Management System

  1. New Tables
    - `permission_groups` - Predefined permission templates
    - `user_permission_groups` - Link users to permission groups
    - Enhanced workspace_members with permission group support

  2. Security
    - Enhanced RLS policies for permission management
    - Proper access control for clients vs admins

  3. Functions
    - Permission group management
    - User invitation with permission groups
*/

-- Create permission_groups table
CREATE TABLE IF NOT EXISTS permission_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  permissions jsonb NOT NULL DEFAULT '[]',
  is_system_default boolean DEFAULT false,
  created_by uuid REFERENCES user_profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(workspace_id, name)
);

-- Create user_permission_groups table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS user_permission_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  permission_group_id uuid REFERENCES permission_groups(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES user_profiles(id),
  assigned_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, workspace_id, permission_group_id)
);

-- Add permission_group_id to workspace_members if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workspace_members' 
        AND column_name = 'permission_group_id'
    ) THEN
        ALTER TABLE workspace_members ADD COLUMN permission_group_id uuid REFERENCES permission_groups(id);
    END IF;
END $$;

-- Add invited_by column to workspace_members if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'workspace_members' 
        AND column_name = 'invited_by'
    ) THEN
        ALTER TABLE workspace_members ADD COLUMN invited_by uuid REFERENCES user_profiles(id);
    END IF;
END $$;

-- Create workspace_invitations table for tracking invitations
CREATE TABLE IF NOT EXISTS workspace_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  permission_group_id uuid REFERENCES permission_groups(id),
  invited_by uuid REFERENCES user_profiles(id) NOT NULL,
  invitation_token text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_permission_groups_workspace ON permission_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_groups_user ON user_permission_groups(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_groups_workspace ON user_permission_groups(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_email ON workspace_invitations(email);
CREATE INDEX IF NOT EXISTS idx_workspace_invitations_token ON workspace_invitations(invitation_token);

-- Enable RLS
ALTER TABLE permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permission_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permission_groups
CREATE POLICY "Workspace members can view permission groups"
  ON permission_groups FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = permission_groups.workspace_id 
    AND workspace_members.user_id = auth.uid()
  ));

CREATE POLICY "Workspace owners and admins can manage permission groups"
  ON permission_groups FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = permission_groups.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = permission_groups.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  ));

-- RLS Policies for user_permission_groups
CREATE POLICY "Users can view their own permission groups"
  ON user_permission_groups FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = user_permission_groups.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  ));

CREATE POLICY "Workspace owners and admins can manage user permission groups"
  ON user_permission_groups FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = user_permission_groups.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = user_permission_groups.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  ));

-- RLS Policies for workspace_invitations
CREATE POLICY "Workspace members can view invitations"
  ON workspace_invitations FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspace_invitations.workspace_id 
    AND workspace_members.user_id = auth.uid()
  ));

CREATE POLICY "Workspace owners and admins can manage invitations"
  ON workspace_invitations FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspace_invitations.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspace_invitations.workspace_id 
    AND workspace_members.user_id = auth.uid()
    AND workspace_members.role IN ('owner', 'admin')
  ));

-- Function to create default permission groups for a workspace
CREATE OR REPLACE FUNCTION create_default_permission_groups(workspace_id_param uuid, created_by_param uuid)
RETURNS void AS $$
BEGIN
  -- Admin Group
  INSERT INTO permission_groups (workspace_id, name, description, permissions, is_system_default, created_by)
  VALUES (
    workspace_id_param,
    'Admin',
    'Full access to all features',
    '[
      {"id": "integrations.manage", "name": "Manage All Integrations", "category": "integrations", "level": "admin"},
      {"id": "analytics.configure", "name": "Configure Analytics", "category": "analytics", "level": "admin"},
      {"id": "settings.admin", "name": "Admin Settings", "category": "settings", "level": "admin"},
      {"id": "users.manage", "name": "Manage Users", "category": "users", "level": "admin"},
      {"id": "billing.manage", "name": "Manage Billing", "category": "billing", "level": "admin"}
    ]'::jsonb,
    true,
    created_by_param
  );

  -- Editor Group
  INSERT INTO permission_groups (workspace_id, name, description, permissions, is_system_default, created_by)
  VALUES (
    workspace_id_param,
    'Editor',
    'Can edit and manage content',
    '[
      {"id": "integrations.connect", "name": "Connect Platforms", "category": "integrations", "level": "write"},
      {"id": "integrations.disconnect", "name": "Disconnect Platforms", "category": "integrations", "level": "write"},
      {"id": "analytics.export", "name": "Export Analytics", "category": "analytics", "level": "write"},
      {"id": "settings.edit", "name": "Edit Settings", "category": "settings", "level": "write"}
    ]'::jsonb,
    true,
    created_by_param
  );

  -- Viewer Group
  INSERT INTO permission_groups (workspace_id, name, description, permissions, is_system_default, created_by)
  VALUES (
    workspace_id_param,
    'Viewer',
    'Read-only access to most features',
    '[
      {"id": "integrations.view", "name": "View Integrations", "category": "integrations", "level": "read"},
      {"id": "analytics.view", "name": "View Analytics", "category": "analytics", "level": "read"},
      {"id": "settings.view", "name": "View Settings", "category": "settings", "level": "read"},
      {"id": "users.view", "name": "View Users", "category": "users", "level": "read"}
    ]'::jsonb,
    true,
    created_by_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user permissions from their permission groups
CREATE OR REPLACE FUNCTION get_user_permissions(user_id_param uuid, workspace_id_param uuid)
RETURNS jsonb AS $$
DECLARE
  permissions jsonb := '[]'::jsonb;
  group_permissions jsonb;
BEGIN
  -- Get all permissions from user's permission groups
  FOR group_permissions IN
    SELECT pg.permissions
    FROM user_permission_groups upg
    JOIN permission_groups pg ON upg.permission_group_id = pg.id
    WHERE upg.user_id = user_id_param 
    AND upg.workspace_id = workspace_id_param
  LOOP
    permissions := permissions || group_permissions;
  END LOOP;

  -- Also check workspace_members for direct permission group assignment
  SELECT COALESCE(pg.permissions, '[]'::jsonb) INTO group_permissions
  FROM workspace_members wm
  LEFT JOIN permission_groups pg ON wm.permission_group_id = pg.id
  WHERE wm.user_id = user_id_param 
  AND wm.workspace_id = workspace_id_param;

  IF group_permissions IS NOT NULL THEN
    permissions := permissions || group_permissions;
  END IF;

  RETURN permissions;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default permission groups when workspace is created
CREATE OR REPLACE FUNCTION handle_new_workspace()
RETURNS trigger AS $$
BEGIN
  PERFORM create_default_permission_groups(NEW.id, NEW.owner_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new workspaces
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW EXECUTE FUNCTION handle_new_workspace();

-- Updated_at triggers
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON permission_groups
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create view for enhanced user management
CREATE OR REPLACE VIEW enhanced_workspace_members AS
SELECT 
  wm.*,
  up.email,
  up.full_name,
  up.avatar_url,
  up.role as user_role,
  up.subscription_tier,
  pg.name as permission_group_name,
  pg.description as permission_group_description,
  w.name as workspace_name,
  inviter.full_name as invited_by_name,
  inviter.email as invited_by_email
FROM workspace_members wm
JOIN user_profiles up ON wm.user_id = up.id
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN permission_groups pg ON wm.permission_group_id = pg.id
LEFT JOIN user_profiles inviter ON wm.invited_by = inviter.id;

-- Grant permissions
GRANT ALL ON permission_groups TO authenticated;
GRANT ALL ON user_permission_groups TO authenticated;
GRANT ALL ON workspace_invitations TO authenticated;
GRANT SELECT ON enhanced_workspace_members TO authenticated;