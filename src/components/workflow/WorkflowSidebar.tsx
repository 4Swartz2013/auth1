import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  ChevronLeft, 
  Clock, 
  CheckCircle, 
  Pause,
  Play,
  Edit,
  Trash2,
  Copy,
  GitBranch
} from 'lucide-react';
import { Workflow } from '../../types/workflow';

interface WorkflowSidebarProps {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  onWorkflowSelect: (workflow: Workflow) => void;
  onCreateWorkflow: () => void;
  onToggleSidebar: () => void;
}

const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({
  workflows,
  currentWorkflow,
  onWorkflowSelect,
  onCreateWorkflow,
  onToggleSidebar
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMenu, setShowMenu] = useState<string | null>(null);

  const filteredWorkflows = workflows.filter(workflow =>
    workflow.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'draft':
        return <Pause className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published':
        return 'Published';
      case 'draft':
        return 'Draft';
      default:
        return 'Testing';
    }
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Workflows</h2>
          </div>
          <button
            onClick={onToggleSidebar}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

        {/* Create Button */}
        <button
          onClick={onCreateWorkflow}
          className="w-full flex items-center gap-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Create Workflow
        </button>
      </div>

      {/* Workflows List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          {filteredWorkflows.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <GitBranch className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium mb-1">No workflows found</p>
              <p className="text-xs">Create your first workflow to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredWorkflows.map((workflow) => (
                <div
                  key={workflow.id}
                  className={`group relative p-3 rounded-lg cursor-pointer transition-colors ${
                    currentWorkflow?.id === workflow.id
                      ? 'bg-indigo-50 border border-indigo-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onWorkflowSelect(workflow)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {workflow.name}
                        </h3>
                        {getStatusIcon(workflow.status)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{getStatusText(workflow.status)}</span>
                        <span>•</span>
                        <span>{workflow.nodes.length} steps</span>
                        <span>•</span>
                        <span>{new Date(workflow.updatedAt).toLocaleDateString()}</span>
                      </div>
                      {workflow.integration && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                            {workflow.integration}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(showMenu === workflow.id ? null : workflow.id);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {showMenu === workflow.id && (
                        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[140px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(null);
                              // Handle edit
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg"
                          >
                            <Edit className="w-3 h-3" />
                            Rename
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(null);
                              // Handle duplicate
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            <Copy className="w-3 h-3" />
                            Duplicate
                          </button>
                          {workflow.status === 'published' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(null);
                                // Handle unpublish
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pause className="w-3 h-3" />
                              Unpublish
                            </button>
                          )}
                          {workflow.status === 'draft' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowMenu(null);
                                // Handle publish
                              }}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Play className="w-3 h-3" />
                              Publish
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(null);
                              // Handle delete
                            }}
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
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 text-center">
          {workflows.length} workflow{workflows.length !== 1 ? 's' : ''} total
        </div>
      </div>
    </div>
  );
};

export default WorkflowSidebar;