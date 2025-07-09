import React, { useState } from 'react';
import { 
  X, 
  Save, 
  TestTube,
  ChevronRight, 
  Play, 
  ArrowRight, 
  Code, 
  Calendar, 
  Clock, 
  Globe,
  Database,
  Zap,
  GitBranch,
  Settings,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { WorkflowNode } from '../../types/workflow';
import { useWorkflowStore } from '../../store/workflowStore';

interface NodeConfigPanelProps {
  node: WorkflowNode;
  onClose: () => void;
}

const NodeConfigPanel: React.FC<NodeConfigPanelProps> = ({ node, onClose }) => {
  const { updateNode } = useWorkflowStore();
  const [config, setConfig] = useState(node.data.config || {});
  const [activeSection, setActiveSection] = useState('config');
  const [testResults, setTestResults] = useState<any>(null);
  const [isTestingStep, setIsTestingStep] = useState(false);

  const handleSave = () => {
    updateNode(node.id, {
      data: {
        ...node.data,
        config,
        subtitle: getSubtitle()
      }
    });
    onClose();
  };

  const handleTest = async () => {
    setIsTestingStep(true);
    // Simulate test execution
    setTimeout(() => {
      setTestResults({
        status: 'success',
        executionTime: '1.2s',
        output: {
          message: 'Test completed successfully',
          data: { userId: '12345', email: 'test@example.com' }
        }
      });
      setIsTestingStep(false);
    }, 2000);
  };

  const getSubtitle = () => {
    const nodeType = node.data.nodeType || node.type;
    
    if (nodeType === 'trigger') {
      if (config.triggerType === 'app_event') return 'App Event';
      if (config.triggerType === 'scheduler') return 'Scheduler';
      if (config.triggerType === 'integration_enabled') return 'Integration Enabled';
      if (config.triggerType === 'request') return 'Request';
      if (config.triggerType === 'api_resource') return 'API Resource';
      return 'Choose a Trigger';
    }
    
    if (nodeType === 'action' && config.action) {
      return config.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    if (nodeType === 'condition' && config.condition) {
      return `If ${config.condition}`;
    }
    
    if (nodeType === 'delay' && config.delay) {
      return `Wait ${config.delay}`;
    }
    
    return node.data.subtitle || node.data.integration || '';
  };

  const renderTriggerConfig = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-4">How should this Workflow be triggered?</h4>
        
        <div className="space-y-3">
          {/* App Event Trigger */}
          <button 
            onClick={() => setConfig({ ...config, triggerType: 'app_event' })}
            className={`w-full p-4 border rounded-lg hover:border-indigo-300 transition-colors text-left ${
              config.triggerType === 'app_event' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mt-0.5">
                <Zap className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">App Event</div>
                <div className="text-xs text-gray-500">Trigger on a custom event sent from your app</div>
              </div>
            </div>
          </button>

          {/* Scheduler Trigger */}
          <button 
            onClick={() => setConfig({ ...config, triggerType: 'scheduler' })}
            className={`w-full p-4 border rounded-lg hover:border-indigo-300 transition-colors text-left ${
              config.triggerType === 'scheduler' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">Scheduler</div>
                <div className="text-xs text-gray-500">Run this Workflow as a scheduled background job</div>
              </div>
            </div>
          </button>

          {/* Integration Enabled Trigger */}
          <button 
            onClick={() => setConfig({ ...config, triggerType: 'integration_enabled' })}
            className={`w-full p-4 border rounded-lg hover:border-indigo-300 transition-colors text-left ${
              config.triggerType === 'integration_enabled' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mt-0.5">
                <Settings className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">Integration Enabled</div>
                <div className="text-xs text-gray-500">Trigger when a user initially activates their integration</div>
              </div>
            </div>
          </button>

          {/* Request Trigger */}
          <button 
            onClick={() => setConfig({ ...config, triggerType: 'request' })}
            className={`w-full p-4 border rounded-lg hover:border-indigo-300 transition-colors text-left ${
              config.triggerType === 'request' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-0.5">
                <Globe className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">Request</div>
                <div className="text-xs text-gray-500">Trigger the workflow directly with the SDK or API</div>
              </div>
            </div>
          </button>

          {/* API Resource Trigger */}
          <button 
            onClick={() => setConfig({ ...config, triggerType: 'api_resource' })}
            className={`w-full p-4 border rounded-lg hover:border-indigo-300 transition-colors text-left ${
              config.triggerType === 'api_resource' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mt-0.5">
                <Database className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 mb-1">API Resource</div>
                <div className="text-xs text-gray-500">Trigger based on changes to API resources</div>
              </div>
            </div>
          </button>
        </div>

        {/* Additional configuration based on trigger type */}
        {config.triggerType === 'scheduler' && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schedule
              </label>
              <select 
                value={config.schedule || ''}
                onChange={(e) => setConfig({ ...config, schedule: e.target.value })}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              >
                <option value="">Select schedule...</option>
                <option value="every_minute">Every minute</option>
                <option value="every_5_minutes">Every 5 minutes</option>
                <option value="every_hour">Every hour</option>
                <option value="every_day">Every day</option>
                <option value="every_week">Every week</option>
                <option value="custom">Custom cron expression</option>
              </select>
            </div>
            
            {config.schedule === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cron Expression
                </label>
                <input
                  type="text"
                  value={config.cronExpression || ''}
                  onChange={(e) => setConfig({ ...config, cronExpression: e.target.value })}
                  placeholder="0 0 * * *"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use standard cron format: minute hour day month weekday
                </p>
              </div>
            )}
          </div>
        )}

        {config.triggerType === 'app_event' && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Name
              </label>
              <input
                type="text"
                value={config.eventName || ''}
                onChange={(e) => setConfig({ ...config, eventName: e.target.value })}
                placeholder="user.created"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderActionConfig = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Choose an action
        </label>
        <select 
          value={config.action || ''}
          onChange={(e) => setConfig({ ...config, action: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
        >
          <option value="">Select an action...</option>
          
          {node.data.integration === 'mailchimp' && (
            <>
              <optgroup label="Campaigns">
                <option value="create_campaign">Create Campaign</option>
                <option value="update_campaign">Update Campaign</option>
                <option value="send_campaign">Send Campaign</option>
                <option value="search_campaigns">Search Campaigns</option>
                <option value="get_campaign_by_id">Get Campaign by ID</option>
                <option value="delete_campaign_by_id">Delete Campaign by ID</option>
              </optgroup>
              <optgroup label="Lists/Audiences">
                <option value="create_list">Create List</option>
                <option value="get_list_by_id">Get List by ID</option>
                <option value="search_lists">Search Lists</option>
                <option value="add_contact_to_list">Add Contact to List</option>
                <option value="update_contact_in_list">Update Contact in List</option>
                <option value="get_contacts_from_list">Get Contacts from List</option>
              </optgroup>
            </>
          )}
          
          {node.data.integration === 'slack' && (
            <>
              <optgroup label="Messages">
                <option value="send_message">Send Message</option>
                <option value="send_direct_message">Send Direct Message</option>
                <option value="update_message">Update Message</option>
                <option value="delete_message">Delete Message</option>
              </optgroup>
              <optgroup label="Channels">
                <option value="create_channel">Create Channel</option>
                <option value="archive_channel">Archive Channel</option>
                <option value="invite_to_channel">Invite to Channel</option>
              </optgroup>
            </>
          )}
          
          {!node.data.integration && (
            <>
              <option value="http_request">HTTP Request</option>
              <option value="send_email">Send Email</option>
              <option value="create_record">Create Record</option>
              <option value="update_record">Update Record</option>
            </>
          )}
        </select>
      </div>

      {config.action && (
        <div className="space-y-4">
          {/* Dynamic fields based on action */}
          {config.action.includes('campaign') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Name
              </label>
              <input
                type="text"
                value={config.campaignName || ''}
                onChange={(e) => setConfig({ ...config, campaignName: e.target.value })}
                placeholder="Enter campaign name..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          )}
          
          {config.action.includes('message') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel
                </label>
                <input
                  type="text"
                  value={config.channel || ''}
                  onChange={(e) => setConfig({ ...config, channel: e.target.value })}
                  placeholder="#general"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message Text
                </label>
                <textarea
                  value={config.messageText || ''}
                  onChange={(e) => setConfig({ ...config, messageText: e.target.value })}
                  placeholder="Enter your message..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  rows={3}
                />
              </div>
            </>
          )}
          
          {config.action === 'send_campaign' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject Line
              </label>
              <input
                type="text"
                value={config.subject || ''}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                placeholder="Enter subject line..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderConditionalConfig = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Condition Logic
        </label>
        <textarea
          value={config.condition || ''}
          onChange={(e) => setConfig({ ...config, condition: e.target.value })}
          placeholder="{{email}}.includes('@gmail.com')"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-2 mb-4">
          Use JavaScript expressions with variables in double braces. Example: {`{{email}}.includes('@gmail.com')`}
        </p>
        
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-3">
          <GitBranch className="w-4 h-4 text-orange-500" />
          <span className="font-medium">Branch Configuration</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 border border-green-200 rounded-lg bg-green-50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Yes Branch</span>
            </div>
            <p className="text-xs text-green-700">
              Actions to perform when condition is true
            </p>
          </div>
          
          <div className="p-3 border border-red-200 rounded-lg bg-red-50">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">No Branch</span>
            </div>
            <p className="text-xs text-red-700">
              Actions to perform when condition is false
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <h5 className="text-sm font-medium text-gray-900 mb-2">Available Variables</h5>
        <div className="space-y-1 text-xs text-gray-600">
          <div><code className="bg-white px-1 rounded">{`{{email}}`}</code> - User email address</div>
          <div><code className="bg-white px-1 rounded">{`{{name}}`}</code> - User full name</div>
          <div><code className="bg-white px-1 rounded">{`{{userId}}`}</code> - User ID</div>
          <div><code className="bg-white px-1 rounded">{`{{data}}`}</code> - Previous step output</div>
        </div>
      </div>
    </div>
  );

  const renderFunctionConfig = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Function Code
        </label>
        <textarea
          value={config.functionCode || `// Write your JavaScript function here
function execute(input) {
  // Your logic here
  return {
    success: true,
    data: input
  };
}`}
          onChange={(e) => setConfig({ ...config, functionCode: e.target.value })}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
          rows={10}
        />
        <p className="text-xs text-gray-500 mt-2">
          Write a JavaScript function that processes the input and returns a result.
        </p>
      </div>
    </div>
  );

  const renderDelayConfig = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Delay Duration
        </label>
        <div className="flex gap-3">
          <input
            type="number"
            value={config.delayAmount || ''}
            onChange={(e) => setConfig({ ...config, delayAmount: e.target.value })}
            placeholder="5"
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
          <select
            value={config.delayUnit || 'minutes'}
            onChange={(e) => setConfig({ ...config, delayUnit: e.target.value })}
            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          >
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderTestSection = () => (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <TestTube className="w-8 h-8 text-gray-400" />
        </div>
        <h4 className="text-lg font-medium text-gray-900 mb-2">Test this step</h4>
        <p className="text-gray-600 text-sm mb-6 max-w-sm mx-auto">
          Run a test to see how this step performs with sample data.
        </p>
        <button
          onClick={handleTest}
          disabled={isTestingStep}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center gap-2 mx-auto disabled:opacity-50"
        >
          {isTestingStep ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Testing...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Test
            </>
          )}
        </button>
      </div>
      
      <div className="border-t border-gray-200 pt-6">
        <h5 className="text-sm font-medium text-gray-900 mb-3">Test Results</h5>
        {testResults ? (
          <div className="space-y-3">
            <div className={`p-4 rounded-lg border ${
              testResults.status === 'success' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {testResults.status === 'success' ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  testResults.status === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {testResults.status === 'success' ? 'Test Passed' : 'Test Failed'}
                </span>
                <span className="text-xs text-gray-500">({testResults.executionTime})</span>
              </div>
              <pre className="text-xs text-gray-700 bg-white p-2 rounded border overflow-x-auto">
                {JSON.stringify(testResults.output, null, 2)}
              </pre>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
            No test results yet. Run a test to see the output.
          </div>
        )}
      </div>
    </div>
  );

  const renderConfig = () => {
    const nodeType = node.data.nodeType || node.type;
    
    switch (nodeType) {
      case 'trigger':
        return renderTriggerConfig();
      case 'action':
        return renderActionConfig();
      case 'condition':
        return renderConditionalConfig();
      case 'function':
        return renderFunctionConfig();
      case 'delay':
        return renderDelayConfig();
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium mb-1">No configuration available</p>
            <p className="text-sm">This step type doesn't require additional configuration.</p>
          </div>
        );
    }
  };

  const getNodeTypeLabel = () => {
    const nodeType = node.data.nodeType || node.type;
    switch (nodeType) {
      case 'trigger': return 'Trigger';
      case 'action': return 'Action';
      case 'condition': return 'Conditional';
      case 'function': return 'Function';
      case 'request': return 'Request';
      case 'response': return 'Response';
      case 'fanout': return 'Fan Out';
      case 'delay': return 'Delay';
      case 'resource': return 'Resource';
      default: return 'Step';
    }
  };

  return (
    <div className="w-96 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
              {node.data.icon || '⚙️'}
            </div>
            <h3 className="font-semibold text-gray-900 text-lg">
              Configure Step
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>{getNodeTypeLabel()}</span>
          {node.data.integration && (
            <>
              <ArrowRight className="w-3 h-3" />
              <span className="capitalize">{node.data.integration}</span>
            </>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveSection('config')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'config'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Configure
          </button>
          <button
            onClick={() => setActiveSection('test')}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeSection === 'test'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Test Step
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {activeSection === 'config' ? renderConfig() : renderTestSection()}
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default NodeConfigPanel;