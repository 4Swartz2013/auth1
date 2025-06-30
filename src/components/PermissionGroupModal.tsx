import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Shield, Plus, Eye, Edit, UserCheck } from 'lucide-react';
import { Permission } from '../types/auth';
import { AuthManager } from '../lib/auth';

interface PermissionGroupModalProps {
  onClose: () => void;
  onCreate: (name: string, description: string, permissions: Permission[]) => void;
}

const PermissionGroupModal: React.FC<PermissionGroupModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    const permissions = await AuthManager.getAllPermissions();
    setAllPermissions(permissions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      await onCreate(name.trim(), description.trim(), selectedPermissions);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (permission: Permission) => {
    setSelectedPermissions(prev => {
      const exists = prev.find(p => p.id === permission.id);
      if (exists) {
        return prev.filter(p => p.id !== permission.id);
      } else {
        return [...prev, permission];
      }
    });
  };

  const getPermissionsByCategory = () => {
    return allPermissions.reduce((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {} as Record<string, Permission[]>);
  };

  const permissionsByCategory = getPermissionsByCategory();

  const getPermissionIcon = (level: string) => {
    switch (level) {
      case 'read': return Eye;
      case 'write': return Edit;
      case 'admin': return Shield;
      default: return UserCheck;
    }
  };

  const getPermissionColor = (level: string) => {
    switch (level) {
      case 'read': return 'text-blue-400';
      case 'write': return 'text-yellow-400';
      case 'admin': return 'text-red-400';
      default: return 'text-gray-400';
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
        className="bg-gray-800 rounded-2xl border border-gray-700 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <Plus className="w-8 h-8 text-purple-400" />
            <div>
              <h1 className="text-xl font-bold text-white">Create Permission Group</h1>
              <p className="text-gray-400 text-sm">Define a set of permissions for your team members</p>
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
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                Group Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Content Editors"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <input
                id="description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this group"
                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Permissions</h3>
            <div className="space-y-6">
              {Object.entries(permissionsByCategory).map(([category, permissions]) => (
                <div key={category} className="bg-gray-700/30 rounded-lg p-4">
                  <h4 className="text-white font-medium mb-3 capitalize">
                    {category.replace('_', ' ')}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {permissions.map((permission) => {
                      const Icon = getPermissionIcon(permission.level);
                      const colorClass = getPermissionColor(permission.level);
                      const isSelected = selectedPermissions.find(p => p.id === permission.id);
                      
                      return (
                        <label
                          key={permission.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-purple-600/20 border-purple-500/50'
                              : 'bg-gray-800/50 border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => togglePermission(permission)}
                            className="sr-only"
                          />
                          <Icon className={`w-4 h-4 ${colorClass}`} />
                          <div className="flex-1">
                            <div className="text-white text-sm font-medium">
                              {permission.name}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {permission.description}
                            </div>
                          </div>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            isSelected
                              ? 'bg-purple-600 border-purple-600'
                              : 'border-gray-500'
                          }`}>
                            {isSelected && (
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-700/30 rounded-lg p-4">
            <h4 className="text-white font-medium mb-2">Summary</h4>
            <p className="text-gray-300 text-sm">
              This group will have <span className="text-purple-400 font-medium">{selectedPermissions.length}</span> permissions across{' '}
              <span className="text-purple-400 font-medium">
                {new Set(selectedPermissions.map(p => p.category)).size}
              </span> categories.
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
              disabled={!name.trim() || loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Group
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default PermissionGroupModal;