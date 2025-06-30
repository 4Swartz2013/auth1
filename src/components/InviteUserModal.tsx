import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, Shield, Users, UserPlus } from 'lucide-react';
import { PermissionGroup } from '../types/auth';

interface InviteUserModalProps {
  onClose: () => void;
  onInvite: (email: string, role: string, permissionGroupId?: string) => void;
  permissionGroups: PermissionGroup[];
}

const InviteUserModal: React.FC<InviteUserModalProps> = ({ onClose, onInvite, permissionGroups }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [permissionGroupId, setPermissionGroupId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await onInvite(email.trim(), role, permissionGroupId || undefined);
    } finally {
      setLoading(false);
    }
  };

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
        className="bg-gray-800 rounded-2xl border border-gray-700 max-w-md w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Invite User</h1>
              <p className="text-gray-400 text-sm">Send an invitation to join your workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address..."
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Role Selection */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-300 mb-2">
              Role *
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
            >
              <option value="viewer">Viewer - Read-only access</option>
              <option value="member">Member - Standard access</option>
              <option value="admin">Admin - Full access</option>
            </select>
          </div>

          {/* Permission Group Selection */}
          <div>
            <label htmlFor="permissionGroup" className="block text-sm font-medium text-gray-300 mb-2">
              Permission Group (Optional)
            </label>
            <select
              id="permissionGroup"
              value={permissionGroupId}
              onChange={(e) => setPermissionGroupId(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
            >
              <option value="">Select a permission group...</option>
              {permissionGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} - {group.description}
                </option>
              ))}
            </select>
            <p className="text-gray-400 text-xs mt-1">
              Permission groups define what the user can access in your workspace
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!email.trim() || loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default InviteUserModal;