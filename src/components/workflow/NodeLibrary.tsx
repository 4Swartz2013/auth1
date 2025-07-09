import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Search, 
  Zap, 
  Play, 
  Code, 
  GitBranch, 
  Globe, 
  CheckCircle, 
  ArrowRight, 
  Clock, 
  Database,
  Calendar,
  Settings,
  Filter
} from 'lucide-react';
import { NodeTemplate } from '../../types/workflow';

interface NodeLibraryProps {
  onSelectNode: (template: NodeTemplate) => void;
  onClose: () => void;
  integration?: string;
}

const NodeLibrary: React.FC<NodeLibraryProps> = ({ onSelectNode, onClose, integration }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const nodeTemplates: NodeTemplate[] = [
    // Triggers
    {
      type: 'trigger',
      label: 'App Event',
      description: 'Trigger on a custom event sent from your app',
      icon: '⚡',
      category: 'trigger',
      config: { triggerType: 'app_event' }
    },
    {
      type: 'trigger',
      label: 'Scheduler',
      description: 'Run this Workflow as a scheduled background job',
      icon: '⏰',
      category: 'trigger',
      config: { triggerType: 'scheduler' }
    },
    {
      type: 'trigger',
      label: 'Integration Enabled',
      description: 'Trigger when a user initially activates their integration',
      icon: '🔗',
      category: 'trigger',
      config: { triggerType: 'integration_enabled' }
    },
    {
      type: 'trigger',
      label: 'Request Trigger',
      description: 'Trigger the workflow directly with the SDK or API',
      icon: '📨',
      category: 'trigger',
      config: { triggerType: 'request' }
    },
    {
      type: 'trigger',
      label: 'API Resource Trigger',
      description: 'Trigger based on changes to API resources',
      icon: '🔄',
      category: 'trigger',
      config: { triggerType: 'api_resource' }
    },

    // Integration-specific actions
    {
      type: 'action',
      label: 'Mailchimp Action',
      description: 'Perform actions in Mailchimp like creating campaigns or managing contacts',
      icon: '🐵',
      category: 'action',
      integration: 'mailchimp'
    },
    {
      type: 'action',
      label: 'Slack Action',
      description: 'Send messages and manage channels in Slack',
      icon: '💬',
      category: 'action',
      integration: 'slack'
    },
    {
      type: 'action',
      label: 'Salesforce Action',
      description: 'Create and update records in Salesforce',
      icon: '☁️',
      category: 'action',
      integration: 'salesforce'
    },
    {
      type: 'action',
      label: 'HubSpot Action',
      description: 'Manage contacts and deals in HubSpot',
      icon: '🧡',
      category: 'action',
      integration: 'hubspot'
    },

    // Logic nodes
    {
      type: 'condition',
      label: 'Conditional',
      description: 'Add conditional logic that executes different paths based on conditions',
      icon: '🔀',
      category: 'logic'
    },
    {
      type: 'function',
      label: 'Function',
      description: 'Execute a custom JavaScript function and return a response',
      icon: '⚡',
      category: 'logic'
    },
    {
      type: 'fanout',
      label: 'Fan Out',
      description: 'Iterate over each item in an array. Can only be added after a step that returns an array',
      icon: '📤',
      category: 'logic'
    },

    // Utility nodes
    {
      type: 'request',
      label: 'Request',
      description: 'Perform an asynchronous HTTP request to an API endpoint',
      icon: '🌐',
      category: 'utility'
    },
    {
      type: 'response',
      label: 'Response',
      description: 'Send an HTTP response. Can only be added to Workflows triggered by an API Endpoint',
      icon: '✅',
      category: 'utility'
    },
    {
      type: 'delay',
      label: 'Delay',
      description: 'Wait for a specified period of time before executing the next step',
      icon: '⏰',
      category: 'utility'
    },
    {
      type: 'resource',
      label: 'API Resource',
      description: 'Connect your internal API as a reusable Resource for Workflows',
      icon: '🔗',
      category: 'utility'
    }
  ];

  const categories = [
    { id: 'all', label: 'All Steps', icon: Settings },
    { id: 'trigger', label: 'Triggers', icon: Zap },
    { id: 'action', label: 'Actions', icon: Play },
    { id: 'logic', label: 'Logic', icon: GitBranch },
    { id: 'utility', label: 'Utility', icon: Globe }
  ];
  
  // Add conditional node template if not already in the list
  const hasConditionalTemplate = nodeTemplates.some(t => t.type === 'condition');
  if (!hasConditionalTemplate) {
    nodeTemplates.push({
      type: 'condition',
      label: 'Conditional',
      description: 'Add conditional logic that executes different paths based on conditions',
      icon: '🔀',
      category: 'logic'
    });
  }

  const filteredTemplates = nodeTemplates.filter(template => {
    const matchesSearch = template.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Group templates by category for display
  const groupedTemplates = categories.reduce((acc, category) => {
    if (category.id === 'all') return acc;
    
    const categoryTemplates = filteredTemplates.filter(t => t.category === category.id);
    if (categoryTemplates.length > 0) {
      acc[category.id] = {
        label: category.label,
        icon: category.icon,
        templates: categoryTemplates
      };
    }
    return acc;
  }, {} as Record<string, { label: string; icon: any; templates: NodeTemplate[] }>);

  const handleSelectNode = (template: NodeTemplate) => {
    onSelectNode(template);
  };

  const getNodeIcon = (template: NodeTemplate) => {
    if (typeof template.icon === 'string') {
      return <span className="text-lg">{template.icon}</span>;
    }
    
    switch (template.type) {
      case 'trigger':
        return <Zap className="w-5 h-5 text-indigo-600" />;
      case 'action':
        return <Play className="w-5 h-5 text-blue-600" />;
      case 'function':
        return <Code className="w-5 h-5 text-purple-600" />;
      case 'condition':
        return <GitBranch className="w-5 h-5 text-orange-600" />;
      case 'request':
        return <Globe className="w-5 h-5 text-green-600" />;
      case 'response':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'fanout':
        return <ArrowRight className="w-5 h-5 text-pink-600" />;
      case 'delay':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'resource':
        return <Database className="w-5 h-5 text-gray-600" />;
      default:
        return <Settings className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Choose a step to add</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search steps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.label}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          {Object.keys(groupedTemplates).length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-lg font-medium mb-2">No steps found</p>
              <p className="text-sm">Try adjusting your search terms or category filter.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedTemplates).map(([categoryId, categoryData]) => (
                <div key={categoryId}>
                  <div className="flex items-center gap-3 mb-4">
                    <categoryData.icon className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-900">{categoryData.label}</h3>
                    <div className="flex-1 h-px bg-gray-200"></div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {categoryData.templates.map((template, index) => (
                      <button
                        key={`${categoryId}-${index}`}
                        onClick={() => handleSelectNode(template)}
                        className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-all text-left group"
                      >
                        <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200 group-hover:bg-white transition-colors">
                          {getNodeIcon(template)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-medium text-gray-900">{template.label}</div>
                            {template.integration && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium capitalize">
                                {template.integration}
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 leading-relaxed">
                            {template.description}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default NodeLibrary;