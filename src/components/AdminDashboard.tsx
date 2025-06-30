import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Building2, 
  Shield, 
  Activity, 
  TrendingUp, 
  AlertTriangle,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Crown,
  UserCheck
} from 'lucide-react';
import { AuthManager } from '../lib/auth';
import { User, Workspace, WorkspaceMember } from '../types/auth';

interface AdminDashboardProps {
  currentUser: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ currentUser }) => {
  const [allUsers, setAllUsers] = useState<WorkspaceMember[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'workspaces'>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [usersData, workspacesData] = await Promise.all([
        AuthManager.getAllUsers(currentUser.id),
        AuthManager.getAllWorkspaces(currentUser.id)
      ]);
      setAllUsers(usersData);
      setWorkspaces(workspacesData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    const success = await AuthManager.updateUserRole(currentUser.id, userId, newRole);
    if (success) {
      loadAdminData();
    }
  };

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.workspace_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !selectedRole || user.user_profiles?.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const stats = [
    {
      label: 'Total Users',
      value: allUsers.length,
      icon: Users,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      change: '+12%'
    },
    {
      label: 'Active Workspaces',
      value: workspaces.length,
      icon: Building2,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      change: '+8%'
    },
    {
      label: 'Admin Users',
      value: allUsers.filter(u => u.user_profiles?.role === 'admin').length,
      icon: Shield,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      change: '+2%'
    },
    {
      label: 'Client Workspaces',
      value: workspaces.filter(w => w.owner_id).length,
      icon: Activity,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      change: '+25%'
    }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading admin dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
              <p className="text-gray-400">Manage all users, workspaces, and system settings</p>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" />
              <span className="text-purple-400 font-medium">Super Admin</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${stat.bgColor} border border-gray-700 rounded-xl p-6`}
            >
              <div className="flex items-center justify-between mb-4">
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
                <div className="flex items-center gap-1 text-green-400 text-sm">
                  <TrendingUp className="w-4 h-4" />
                  {stat.change}
                </div>
              </div>
              <div className={`text-3xl font-bold ${stat.color} mb-1`}>
                {stat.value}
              </div>
              <div className="text-gray-400 text-sm">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-6">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'users', label: 'All Users', icon: Users },
            { id: 'workspaces', label: 'Workspaces', icon: Building2 }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Recent Activity */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {[
                  { action: 'New user registered', user: 'john@example.com', workspace: 'Marketing Team', time: '2 minutes ago' },
                  { action: 'Workspace created', user: 'sarah@company.com', workspace: 'Design Studio', time: '15 minutes ago' },
                  { action: 'User invited to workspace', user: 'mike@startup.io', workspace: 'Tech Startup', time: '1 hour ago' },
                  { action: 'Permission group created', user: 'admin@system.com', workspace: 'Enterprise Corp', time: '2 hours ago' }
                ].map((activity, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="text-white font-medium">{activity.action}</p>
                      <p className="text-gray-400 text-sm">
                        {activity.user} • {activity.workspace}
                      </p>
                    </div>
                    <span className="text-gray-500 text-sm">{activity.time}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* System Health */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">System Health</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 font-medium">Database</span>
                  </div>
                  <p className="text-gray-300 text-sm">All systems operational</p>
                </div>
                <div className="bg-green-600/20 border border-green-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 font-medium">API Services</span>
                  </div>
                  <p className="text-gray-300 text-sm">99.9% uptime</p>
                </div>
                <div className="bg-yellow-600/20 border border-yellow-600/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                    <span className="text-yellow-400 font-medium">OAuth Services</span>
                  </div>
                  <p className="text-gray-300 text-sm">Minor delays detected</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search and Filters */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search users or workspaces..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                  />
                </div>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                  <option value="invited_user">Invited User</option>
                </select>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-700/50">
                    <tr>
                      <th className="text-left p-4 text-gray-300 font-medium">User</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Role</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Workspace</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Workspace Role</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Permission Group</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Invited By</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Joined</th>
                      <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={`${user.user_id}-${user.workspace_id}`} className="border-t border-gray-700 hover:bg-gray-700/30">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                              <span className="text-white font-medium">
                                {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{user.full_name || 'No name'}</p>
                              <p className="text-gray-400 text-sm">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <select
                            value={user.user_profiles?.role || 'client'}
                            onChange={(e) => handleRoleChange(user.user_id, e.target.value)}
                            className="bg-gray-700 border border-gray-600 rounded px-3 py-1 text-white text-sm"
                          >
                            <option value="admin">Admin</option>
                            <option value="client">Client</option>
                            <option value="invited_user">Invited User</option>
                          </select>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-gray-400" />
                            <span className="text-white font-medium">{user.workspace_name}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            user.role === 'owner' 
                              ? 'bg-purple-600/20 text-purple-300'
                              : user.role === 'admin'
                              ? 'bg-blue-600/20 text-blue-300'
                              : 'bg-gray-600/20 text-gray-300'
                          }`}>
                            {user.role}
                            {user.role === 'owner' && <Crown className="w-3 h-3 inline ml-1" />}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-300 text-sm">
                            {user.permission_group_name || 'None'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-gray-400 text-sm">
                            {user.invited_by_name || 'System'}
                          </span>
                        </td>
                        <td className="p-4 text-gray-400 text-sm">
                          {new Date(user.joined_at).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                              <Eye className="w-4 h-4" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                              <Edit className="w-4 h-4" />
                            </button>
                            {user.user_profiles?.role !== 'admin' && (
                              <button className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'workspaces' && (
          <div className="space-y-6">
            {/* Workspaces Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {workspaces.map((workspace) => (
                <motion.div
                  key={workspace.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-purple-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold">{workspace.name}</h3>
                        <p className="text-gray-400 text-sm">{workspace.member_count || 0} members</p>
                      </div>
                    </div>
                    <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Plan:</span>
                      <span className="text-white capitalize">{workspace.subscription_plan || 'free'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Created:</span>
                      <span className="text-white">{new Date(workspace.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors">
                      View Details
                    </button>
                    <button className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;