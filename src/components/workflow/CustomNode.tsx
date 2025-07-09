import React from 'react';
import { Handle, Position, NodeProps, useReactFlow } from 'reactflow';
import { 
  MoreHorizontal, 
  Copy, 
  Trash2, 
  Play, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Zap,
  Code,
  Calendar,
  GitBranch,
  Globe,
  Database,
  ArrowRight,
  Shield,
  Activity,
  Pause,
  X,
  Plus,
  Check,
  XCircle
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';

const CustomNode: React.FC<NodeProps> = ({ id, data, selected }) => {
  const { setSelectedNode, deleteNode, currentWorkflow } = useWorkflowStore();
  const [showMenu, setShowMenu] = React.useState(false);
  const reactFlowInstance = useReactFlow();

  const handleClick = () => {
    const node = currentWorkflow?.nodes.find(n => n.id === id);
    if (node) {
      setSelectedNode(node);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(id);
    setShowMenu(false);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement copy functionality
    setShowMenu(false);
  };

  const getNodeIcon = () => {
    // Integration-specific icons
    if (data.integration === 'mailchimp') return '🐵';
    if (data.integration === 'slack') return '💬';
    if (data.integration === 'salesforce') return '☁️';
    if (data.integration === 'hubspot') return '🧡';
    if (data.integration === 'shopify') return '🛍️';
    
    // Node type icons
    switch (data.nodeType || data.type) {
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

  const getStatusIndicator = () => {
    switch (data.status) {
      case 'success':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'error':
        return <div className="w-2 h-2 bg-red-500 rounded-full" />;
      case 'running':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />;
      default:
        return <div className="w-2 h-2 bg-gray-400 rounded-full" />;
    }
  };

  const getNodeTypeLabel = () => {
    switch (data.nodeType || data.type) {
      case 'trigger':
        return 'Trigger';
      case 'action':
        return 'Action';
      case 'condition':
        return 'Conditional';
      case 'function':
        return 'Function';
      case 'request':
        return 'Request';
      case 'response':
        return 'Response';
      case 'fanout':
        return 'Fan Out';
      case 'delay':
        return 'Delay';
      case 'resource':
        return 'Resource';
      default:
        return data.label;
    }
  };

  const isConditionalNode = data.nodeType === 'condition' || data.type === 'condition' || data.isConditional;
  const isTriggerNode = data.nodeType === 'trigger' || data.type === 'trigger';
  const isFanOutNode = data.nodeType === 'fanout' || data.type === 'fanout';

  return (
    <div className="relative group">
      {/* Input Handle - Only for non-trigger nodes */}
      {!isTriggerNode && (
        <Handle
          type="target"
          position={Position.Top}
          className="w-3 h-3 bg-gray-300 border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ top: -6 }}
        />
      )}

      {/* Node Body - Conditional nodes have special styling */}
      <div
        onClick={handleClick}
        className={`
          bg-white border-2 rounded-xl shadow-sm min-w-[280px] cursor-pointer transition-all relative
          ${selected 
            ? 'border-indigo-500 shadow-lg ring-2 ring-indigo-200' 
            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
          }
        `}
      >
        {/* Delete Button - Top Right Corner */}
        <button
          onClick={handleDelete}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Node Header */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                {typeof getNodeIcon() === 'string' ? (
                  <span className="text-lg">{getNodeIcon()}</span>
                ) : (
                  getNodeIcon()
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {getNodeTypeLabel()}
                  </span>
                  {data.integration && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-500 capitalize">{data.integration}</span>
                    </>
                  )}
                </div>
                <div className="font-medium text-gray-900 text-sm leading-tight">
                  {data.label || 'Untitled Step'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Status Indicator */}
              {getStatusIndicator()}
              
              {/* Menu Button */}
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {/* Dropdown Menu */}
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        // Handle configure
                        handleClick();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                    >
                      <Settings className="w-3 h-3" />
                      Configure
                    </button>
                    <button
                      onClick={handleCopy}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Copy className="w-3 h-3" />
                      Duplicate
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        // Handle test
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Play className="w-3 h-3" />
                      Test Step
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 last:rounded-b-lg"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Subtitle */}
          {data.subtitle && (
            <div className="text-sm text-gray-600 mb-3">
              {data.subtitle}
            </div>
          )}

          {/* Configuration Summary */}
          {data.config && Object.keys(data.config).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-600 space-y-1">
                {data.config.triggerType && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Type:</span>
                    <span className="capitalize">{data.config.triggerType.replace('_', ' ')}</span>
                  </div>
                )}
                {data.config.action && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Action:</span>
                    <span className="capitalize">{data.config.action.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {data.config.condition && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Condition:</span>
                    <code className="bg-gray-100 px-1 rounded text-xs">{data.config.condition}</code>
                  </div>
                )}
                {data.config.campaignName && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Campaign:</span>
                    <span>{data.config.campaignName}</span>
                  </div>
                )}
                {data.config.delay && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Delay:</span>
                    <span>{data.config.delay}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Output Handles */}
      {isConditionalNode ? (
        <>
          {/* Yes branch - left bottom */}
          <div className="absolute -bottom-8 left-1/4 transform -translate-x-1/2 text-xs text-green-600 font-medium">
            Yes
          </div>
          <Handle
            id="yes"
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 bg-green-500 border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ bottom: -6, left: '25%' }}
          />
          
          {/* No branch - right bottom */}
          <div className="absolute -bottom-8 right-1/4 transform translate-x-1/2 text-xs text-red-600 font-medium">
            No
          </div>
          <Handle
            id="no"
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 bg-red-500 border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ bottom: -6, right: '25%' }}
          />
        </>
      ) : (
        /* Regular output handle - center bottom */
        <Handle
          type="source"
          position={Position.Bottom}
          className="w-3 h-3 bg-indigo-500 border-2 border-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ bottom: -6 }}
        />
      )}

      {/* Add Node Button - Below this node */}
      <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            // Trigger add node functionality
            if (data.onAddNodeBelow) {
              data.onAddNodeBelow(id);
            }
          }}
          className="w-6 h-6 bg-white border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors shadow-sm"
        >
          <Plus className="w-3 h-3 text-gray-600" />
        </button>
      </div>
    </div>
  );
};

export default CustomNode;