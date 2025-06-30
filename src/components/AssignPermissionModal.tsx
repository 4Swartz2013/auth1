import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, UserCheck, Shield } from 'lucide-react';
import { WorkspaceMember, PermissionGroup } from '../types/auth';

interface AssignPermissionModalProps {
  member: WorkspaceMember;
  permissionGroups: PermissionGroup[];
  onClose: () => void;
  onAssign: (memberId: string, permissionGroupId: string) => void;
}

const AssignPermissionModal: React.FC<AssignPermissionModalProps> = ({ 
  member, 
  permissionGroups, 
  onClose, 
  onAssign 
}) => {
  const [selectedGroupId, setSelectedGroupId] = useState(member.permission_group_id || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId) return;

    setLoading(true);
    try {
      await onAssign(member.user_id, selectedGroupId);
    } finally {
      setLoading(false);
    }
  };

  const selectedGroup = permissionGroups.find(g => g.id === selectedGroupId);

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
            <UserCheck className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Assign Permission Group</h1>
              <p className="text-gray-400 text-sm">
                {member.user_profiles?.full_name || member.user_profiles?.email}
              </p>
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
          {/* Current Assignment */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Current Assignment</h4>
            <p className="text-gray-300 text-sm">
              {member.permission_group_name || 'No permission group assigned'}
            </p>
          </div>

          {/* Permission Group Selection */}
          <div>
            <label htmlFor="permissionGroup" className="block text-sm font-medium text-gray-300 mb-2">
              Select Permission Group *
            </label>
            <select
              id="permissionGroup"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
              required
            >
              <option value="">Select a permission group...</option>
              {permissionGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} - {group.permissions.length} permissions
                </option>
              ))}
            </select>
          </div>

          {/* Selected Group Preview */}
          {selectedGroup && (
            <div className="bg-gray-700/30 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-5 h-5 text-purple-400" />
                <h4 className="text-white font-medium">{selectedGroup.name}</h4>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                {selectedGroup.description}
              </p>
              <div className="space-y-2">
                <p className="text-gray-400 text-xs font-medium">Permissions included:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedGroup.permissions.slice(0, 5).map((permission) => (
                    <span
                      key={permission.id}
                      className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded"
                    >
                      {permission.name}
                    </span>
                  ))}
                  {selectedGroup.permissions.length > 5 && (
                    <span className="px-2 py-1 bg-gray-600/20 text-gray-300 text-xs rounded">
                      +{selectedGroup.permissions.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

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
              disabled={!selectedGroupId || loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Assign Group
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AssignPermissionModal;