import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Activity, 
  Lock, 
  Eye, 
  Edit, 
  AlertTriangle,
  CheckCircle,
  X,
  Info
} from 'lucide-react';
import { AuthManager } from '../lib/auth';
import { User, Workspace, Permission } from '../types/auth';
import ParagonLayout from './ParagonLayout';

interface InvitedUserDashboardProps {
  currentUser: User;
  workspace: Workspace;
}

const InvitedUserDashboard: React.FC<InvitedUserDashboardProps> = ({ currentUser, workspace }) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserPermissions();
  }, [currentUser.id, workspace.id]);

  const loadUserPermissions = async () => {
    setLoading(true);
    try {
      const userPermissions = await AuthManager.getUserPermissions(currentUser.id, workspace.id);
      setPermissions(userPermissions);
    } catch (error) {
      console.error('Error loading user permissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permissionId: string) => {
    return AuthManager.hasPermission(permissions, permissionId);
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
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  // Use Paragon layout for invited user dashboard with limited permissions
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

export default InvitedUserDashboard;