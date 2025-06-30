import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, AlertCircle, CheckCircle, Clock, RefreshCw, Search, Filter, Calendar, Download } from 'lucide-react';
import { useIntegrationStore } from '../store/integrationStore';
import { IntegrationLog } from '../lib/credentialManager';

interface HealthDrawerProps {
  integrationId: string;
  providerKey: string;
  providerName: string;
  onClose: () => void;
  onRefresh?: () => void;
}

const HealthDrawer: React.FC<HealthDrawerProps> = ({ 
  integrationId, 
  providerKey, 
  providerName, 
  onClose,
  onRefresh
}) => {
  const { getIntegrationLogs, getIntegrationDetails } = useIntegrationStore();
  
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [integration, setIntegration] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('7d');

  useEffect(() => {
    loadData();
  }, [integrationId, providerKey]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get integration details
      const details = await getIntegrationDetails(integrationId);
      setIntegration(details);
      
      // Get logs
      const logs = await getIntegrationLogs(providerKey);
      setLogs(logs);
    } catch (error) {
      console.error('Error loading health data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
        await loadData();
      } finally {
        setIsRefreshing(false);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'pending':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-400/10';
      case 'error':
        return 'bg-red-400/10';
      case 'pending':
        return 'bg-yellow-400/10';
      default:
        return 'bg-gray-400/10';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'info':
        return 'text-blue-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      case 'success':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getDateFilterDays = () => {
    switch (dateFilter) {
      case '1d':
        return 1;
      case '7d':
        return 7;
      case '30d':
        return 30;
      case '90d':
        return 90;
      default:
        return 7;
    }
  };

  const filteredLogs = logs.filter(log => {
    // Apply search filter
    const matchesSearch = searchTerm === '' || 
      log.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply status filter
    const matchesStatus = statusFilter === '' || log.status === statusFilter;
    
    // Apply date filter
    const days = getDateFilterDays();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const logDate = new Date(log.created_at);
    const matchesDate = logDate >= cutoffDate;
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-2xl bg-gray-800 h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {integration?.status && getStatusIcon(integration.status)}
            <div>
              <h2 className="text-xl font-bold text-white">
                {providerName} Health
              </h2>
              <p className="text-gray-400 text-sm">
                Connection status and activity logs
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
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center">
                <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mb-4" />
                <p className="text-gray-300">Loading health data...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Health Summary */}
              <div className="bg-gray-700/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Connection Status</h3>
                  <button
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isRefreshing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg ${getStatusBgColor(integration?.status || 'disconnected')}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(integration?.status || 'disconnected')}
                      <span className={`font-medium ${getStatusColor(integration?.status || 'disconnected')}`}>
                        {integration?.status === 'connected' ? 'Connected' : 
                         integration?.status === 'error' ? 'Error' : 
                         integration?.status === 'pending' ? 'Pending' : 'Disconnected'}
                      </span>
                    </div>
                    {integration?.error_message && (
                      <p className="text-red-300 text-sm mt-1">{integration.error_message}</p>
                    )}
                  </div>

                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-300 mb-1">Health Score</div>
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-gray-600 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
                          style={{ width: `${integration?.health_score || 0}%` }}
                        ></div>
                      </div>
                      <span className="text-white font-medium">{integration?.health_score || 0}%</span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-300 mb-1">Last Synced</div>
                    <div className="text-white">
                      {integration?.last_sync_at ? formatDate(integration.last_sync_at) : 'Never'}
                    </div>
                  </div>

                  <div className="p-4 bg-gray-700/50 rounded-lg">
                    <div className="text-sm text-gray-300 mb-1">Next Sync</div>
                    <div className="text-white">
                      {integration?.next_sync_at ? formatDate(integration.next_sync_at) : 'Not scheduled'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Logs */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Activity Logs</h3>
                  <button
                    onClick={() => {/* Export logs functionality */}}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                  >
                    <option value="">All Statuses</option>
                    <option value="connected">Connected</option>
                    <option value="error">Error</option>
                    <option value="pending">Pending</option>
                    <option value="disconnected">Disconnected</option>
                  </select>

                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 focus:outline-none"
                  >
                    <option value="1d">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                  </select>
                </div>

                {/* Logs List */}
                <div className="space-y-3 mt-4">
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <Clock className="w-12 h-12 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-300 font-medium">No logs found</p>
                      <p className="text-gray-500 text-sm">Try adjusting your filters or check back later</p>
                    </div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div key={log.id} className="bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <span className={`font-medium ${getStatusColor(log.status)}`}>
                              {log.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusBgColor(log.status)} ${getStatusColor(log.status)}`}>
                              {log.status}
                            </span>
                          </div>
                          <span className="text-gray-400 text-sm">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        {log.message && (
                          <p className="text-gray-300 text-sm mt-1">{log.message}</p>
                        )}
                        {log.error_details && (
                          <div className="mt-2 p-2 bg-red-900/20 border border-red-900/30 rounded text-red-300 text-xs">
                            <pre className="whitespace-pre-wrap font-mono">
                              {JSON.stringify(log.error_details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default HealthDrawer;