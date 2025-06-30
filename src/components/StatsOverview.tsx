import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Clock, AlertCircle, Zap, TrendingUp, Activity } from 'lucide-react';
import { useIntegrationStore } from '../store/integrationStore';
import { CredentialManager, UserDashboardStats } from '../lib/credentialManager';
import { providerConfig } from '../lib/providerConfig';

const StatsOverview: React.FC = () => {
  const { connectedPlatforms, currentUserId } = useIntegrationStore();
  const [dashboardStats, setDashboardStats] = useState<UserDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const totalProviders = providerConfig.length;
  const connectedCount = connectedPlatforms.size;
  const pendingCount = 0; // Could track OAuth flows in progress
  const availableCount = totalProviders - connectedCount;

  useEffect(() => {
    const loadDashboardStats = async () => {
      if (!currentUserId) {
        setLoading(false);
        return;
      }

      try {
        const stats = await CredentialManager.getDashboardStats(currentUserId);
        setDashboardStats(stats);
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, [currentUserId, connectedPlatforms]);

  const stats = [
    {
      label: 'Connected',
      value: dashboardStats?.connected_count || connectedCount,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/20',
      description: 'Active connections'
    },
    {
      label: 'Available',
      value: availableCount,
      icon: Zap,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/10',
      borderColor: 'border-blue-400/20',
      description: 'Ready to connect'
    },
    {
      label: 'Errors',
      value: dashboardStats?.error_count || 0,
      icon: AlertCircle,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/20',
      description: 'Need attention'
    },
    {
      label: 'Total Platforms',
      value: totalProviders,
      icon: Activity,
      color: 'text-purple-400',
      bgColor: 'bg-purple-400/10',
      borderColor: 'border-purple-400/20',
      description: 'Supported platforms'
    }
  ];

  const performanceScore = dashboardStats?.avg_performance_score || 0;
  const lastActivity = dashboardStats?.last_activity;

  return (
    <div className="space-y-6 mb-8">
      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${stat.bgColor} ${stat.borderColor} border rounded-xl p-4 text-center hover:scale-105 transition-transform duration-200`}
          >
            <div className="flex items-center justify-center mb-2">
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div className={`text-2xl font-bold ${stat.color} mb-1`}>
              {loading ? '...' : stat.value}
            </div>
            <div className="text-gray-400 text-sm font-medium">
              {stat.label}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              {stat.description}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Additional Stats Row */}
      {currentUserId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {/* Performance Score */}
          <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-400" />
                <span className="text-white font-medium">Performance</span>
              </div>
              <div className="text-purple-300 text-sm">
                {loading ? '...' : `${Math.round(performanceScore)}%`}
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${performanceScore}%` }}
              ></div>
            </div>
            <div className="text-gray-400 text-xs mt-1">
              Average platform performance
            </div>
          </div>

          {/* Connection Health */}
          <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border border-green-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-400" />
                <span className="text-white font-medium">Health</span>
              </div>
              <div className="text-green-300 text-sm">
                {loading ? '...' : connectedCount > 0 ? 'Good' : 'No connections'}
              </div>
            </div>
            <div className="text-gray-400 text-xs">
              {connectedCount > 0 
                ? `${connectedCount} active connections`
                : 'Start connecting platforms'
              }
            </div>
          </div>

          {/* Last Activity */}
          <div className="bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-white font-medium">Last Activity</span>
              </div>
            </div>
            <div className="text-blue-300 text-sm">
              {loading ? '...' : (
                lastActivity 
                  ? new Date(lastActivity).toLocaleDateString()
                  : 'No activity yet'
              )}
            </div>
            <div className="text-gray-400 text-xs">
              Most recent platform use
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      {connectedCount === 0 && currentUserId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-r from-purple-600/10 to-pink-600/10 border border-purple-500/20 rounded-xl p-6 text-center"
        >
          <h3 className="text-white font-semibold mb-2">Get Started</h3>
          <p className="text-gray-300 text-sm mb-4">
            Connect your first platform to start managing your influencer business
          </p>
          <div className="flex flex-wrap justify-center gap-2 text-xs">
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full">
              Social Media
            </span>
            <span className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full">
              Email Marketing
            </span>
            <span className="px-3 py-1 bg-green-500/20 text-green-300 rounded-full">
              E-Commerce
            </span>
            <span className="px-3 py-1 bg-yellow-500/20 text-yellow-300 rounded-full">
              Analytics
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StatsOverview;