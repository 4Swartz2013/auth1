import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserPlus, 
  Settings, 
  Shield, 
  Mail,
  Calendar,
  Activity,
  Building2,
  Crown,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  Clock,
  MoreVertical,
  Bell,
  Lock,
  Globe,
  Palette,
  Database,
  Zap,
  Save,
  AlertTriangle
} from 'lucide-react';
import { AuthManager } from '../lib/auth';
import { User, Workspace, WorkspaceMember, PermissionGroup, Invitation } from '../types/auth';
import InviteUserModal from './InviteUserModal';
import PermissionGroupModal from './PermissionGroupModal';
import AssignPermissionModal from './AssignPermissionModal';
import ParagonLayout from './ParagonLayout';

interface ClientDashboardProps {
  currentUser: User;
  workspace: Workspace;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ currentUser, workspace }) => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<PermissionGroup[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroup | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  // Settings state
  const [workspaceSettings, setWorkspaceSettings] = useState({
    name: workspace.name,
    description: '',
    timezone: 'UTC',
    language: 'en',
    theme: 'dark',
    emailNotifications: true,
    slackNotifications: false,
    webhookUrl: '',
    apiAccess: true,
    dataRetention: '90',
    autoBackup: true,
    twoFactorRequired: false,
    allowGuestAccess: false,
    maxMembers: '50'
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    loadWorkspaceData();
    loadWorkspaceSettings();
  }, [workspace.id]);

  const loadWorkspaceData = async () => {
    setLoading(true);
    try {
      const [membersData, groupsData, invitationsData] = await Promise.all([
        AuthManager.getWorkspaceMembers(workspace.id, currentUser.id),
        AuthManager.getPermissionGroups(workspace.id, currentUser.id),
        AuthManager.getPendingInvitations(workspace.id, currentUser.id)
      ]);
      setMembers(membersData);
      setPermissionGroups(groupsData);
      setPendingInvitations(invitationsData);
    } catch (error) {
      console.error('Error loading workspace data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceSettings = async () => {
    try {
      // Load workspace settings from the database
      // This would typically come from workspace.settings
      const settings = workspace.settings || {};
      setWorkspaceSettings(prev => ({
        ...prev,
        ...settings,
        name: workspace.name
      }));
    } catch (error) {
      console.error('Error loading workspace settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setSettingsLoading(true);
    setSettingsError(null);
    
    try {
      // Update workspace name and settings
      const success = await AuthManager.updateWorkspace(workspace.id, currentUser.id, {
        name: workspaceSettings.name,
        settings: workspaceSettings
      });

      if (success) {
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 3000);
      } else {
        setSettingsError('Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSettingsError('An error occurred while saving settings.');
    } finally {
      setSettingsLoading(false);
    }
  };

  const handleInviteUser = async (email: string, role: string, permissionGroupId?: string) => {
    const invitation = await AuthManager.inviteUser(workspace.id, currentUser.id, email, role, permissionGroupId);
    if (invitation) {
      setShowInviteModal(false);
      loadWorkspaceData();
    }
  };

  const handleCreatePermissionGroup = async (name: string, description: string, permissions: any[]) => {
    const group = await AuthManager.createPermissionGroup(workspace.id, currentUser.id, name, description, permissions);
    if (group) {
      setShowGroupModal(false);
      loadWorkspaceData();
    }
  };

  const handleAssignPermissionGroup = async (memberId: string, permissionGroupId: string) => {
    const success = await AuthManager.assignUserToPermissionGroup(workspace.id, currentUser.id, memberId, permissionGroupId);
    if (success) {
      setShowAssignModal(false);
      loadWorkspaceData();
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this member from the workspace?')) {
      const success = await AuthManager.removeMember(workspace.id, currentUser.id, memberId);
      if (success) {
        loadWorkspaceData();
      }
    }
  };

  const handleSignOut = async () => {
    // This would be handled by the parent component
  };

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    // This would be handled by the parent component
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading workspace...</div>
      </div>
    );
  }

  // Use Paragon layout for client dashboard
  return (
    <ParagonLayout 
      currentUser={currentUser}
      onSignOut={handleSignOut}
      workspaces={[workspace]}
      currentWorkspace={workspace}
      onWorkspaceSwitch={handleWorkspaceSwitch}
    />
  );
};

export default ClientDashboard;