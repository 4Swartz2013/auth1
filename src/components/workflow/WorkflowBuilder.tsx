import React, { useCallback, useState, useRef, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  ChevronLeft, 
  Play, 
  Save, 
  MoreHorizontal, 
  TestTube, 
  Share, 
  Plus,
  Clock,
  Zap,
  Settings,
  GitBranch,
  Calendar,
  Globe,
  Code,
  Database,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Pause,
  RotateCcw
} from 'lucide-react';
import { useWorkflowStore } from '../../store/workflowStore';
import CustomNode from './CustomNode';
import NodeConfigPanel from './NodeConfigPanel';
import NodeLibrary from './NodeLibrary';
import WorkflowSidebar from './WorkflowSidebar';

const nodeTypes = {
  custom: CustomNode,
};

const edgeOptions = {
  animated: false,
  style: {
    stroke: '#6366f1',
    strokeWidth: 2,
  },
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: '#6366f1',
  },
};

interface WorkflowBuilderProps {
  onBack: () => void;
}

const WorkflowBuilderContent: React.FC<WorkflowBuilderProps> = ({ onBack }) => {
  const { 
    currentWorkflow, 
    selectedNode, 
    isConfigPanelOpen,
    updateWorkflow,
    addNode,
    addEdge: addWorkflowEdge,
    setSelectedNode,
    setConfigPanelOpen,
    workflows
  } = useWorkflowStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showNodeLibrary, setShowNodeLibrary] = useState(false);
  const [workflowName, setWorkflowName] = useState(currentWorkflow?.name || 'New Workflow');
  const [isEditingName, setIsEditingName] = useState(false);
  const [addNodeAfter, setAddNodeAfter] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [workflowStatus, setWorkflowStatus] = useState<'draft' | 'published' | 'testing'>('draft');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Initialize nodes and edges from current workflow
  useEffect(() => {
    if (currentWorkflow) {
      const flowNodes = currentWorkflow.nodes.map((node, index) => ({
        id: node.id,
        type: 'custom',
        position: node.position,
        data: {
          ...node.data,
          onConfigClick: () => {
            setSelectedNode(node);
            setConfigPanelOpen(true);
          },
          onAddNodeBelow: (nodeId: string) => {
            setAddNodeAfter(nodeId);
            setShowNodeLibrary(true);
          }
        },
        draggable: true
      }));
      
      // Create edges connecting nodes vertically
      const flowEdges: Edge[] = [];
      for (let i = 0; i < flowNodes.length - 1; i++) {
        const sourceNode = flowNodes[i];
        const targetNode = flowNodes[i + 1];
        
        flowEdges.push({
          id: `edge-${sourceNode.id}-${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
          type: 'default',
          ...edgeOptions
        });
      }

      setNodes(flowNodes);
      setEdges(flowEdges);
      setWorkflowName(currentWorkflow.name);
      setWorkflowStatus(currentWorkflow.status as any);
    }
  }, [currentWorkflow, setNodes, setEdges, setSelectedNode, setConfigPanelOpen]);

  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge = {
        ...params,
        ...edgeOptions
      };
      setEdges((eds) => addEdge(newEdge, eds));
      
      if (params.source && params.target) {
        addWorkflowEdge({
          source: params.source,
          target: params.target,
          type: 'default',
          sourceHandle: params.sourceHandle,
          targetHandle: params.targetHandle
        });
      }
    },
    [setEdges, addWorkflowEdge]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    const workflowNode = currentWorkflow?.nodes.find(n => n.id === node.id);
    if (workflowNode) {
      setSelectedNode(workflowNode);
      setConfigPanelOpen(true);
    }
  }, [currentWorkflow, setSelectedNode, setConfigPanelOpen]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setConfigPanelOpen(false);
  }, [setSelectedNode, setConfigPanelOpen]);

  const handleAddNode = (nodeTemplate: any) => {
    if (!currentWorkflow) return;

    let newPosition = { x: 400, y: 100 };
    
    if (addNodeAfter) {
      // Find the node we're adding after
      const afterNode = currentWorkflow.nodes.find(n => n.id === addNodeAfter);
      if (afterNode) {
        // Position the new node below the selected node
        newPosition = { 
          x: afterNode.position.x, 
          y: afterNode.position.y + 150 
        };
        
        // Shift all nodes below this position down
        const nodesToShift = currentWorkflow.nodes.filter(n => 
          n.position.y > afterNode.position.y && n.position.x === afterNode.position.x
        );
        
        nodesToShift.forEach(node => {
          const updatedNode = {
            ...node,
            position: { ...node.position, y: node.position.y + 150 }
          };
          // Update the node position in the store
          // This would need to be implemented in the store
        });
      }
    } else if (currentWorkflow.nodes.length === 0) {
      // First node
      newPosition = { x: 400, y: 100 };
    } else {
      // Add at the end
      const lastNode = currentWorkflow.nodes[currentWorkflow.nodes.length - 1];
      newPosition = { x: lastNode.position.x, y: lastNode.position.y + 150 };
    }

    const newNode = {
      type: nodeTemplate.type,
      position: newPosition,
      data: {
        label: nodeTemplate.label,
        subtitle: nodeTemplate.subtitle || nodeTemplate.description,
        description: nodeTemplate.description,
        icon: nodeTemplate.icon,
        integration: nodeTemplate.integration,
        config: nodeTemplate.config || {},
        status: 'idle' as const,
        nodeType: nodeTemplate.type
      }
    };

    addNode(newNode);
    setShowNodeLibrary(false);
    setAddNodeAfter(null);
  };

  const handleSave = () => {
    if (currentWorkflow) {
      updateWorkflow(currentWorkflow.id, {
        name: workflowName,
        status: workflowStatus
      });
      setLastSaved(new Date());
    }
  };

  const handleTest = () => {
    setWorkflowStatus('testing');
    // Simulate test execution
    setTimeout(() => {
      setWorkflowStatus('draft');
    }, 3000);
  };

  const handleDeploy = () => {
    if (currentWorkflow) {
      updateWorkflow(currentWorkflow.id, {
        status: 'published'
      });
      setWorkflowStatus('published');
      setLastSaved(new Date());
    }
  };

  const handleNameEdit = () => {
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    setIsEditingName(false);
    if (currentWorkflow) {
      updateWorkflow(currentWorkflow.id, { name: workflowName });
    }
  };

  const getStatusColor = () => {
    switch (workflowStatus) {
      case 'published':
        return 'text-green-600';
      case 'testing':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = () => {
    switch (workflowStatus) {
      case 'published':
        return <CheckCircle className="w-4 h-4" />;
      case 'testing':
        return <Clock className="w-4 h-4 animate-spin" />;
      default:
        return <Pause className="w-4 h-4" />;
    }
  };

  if (!currentWorkflow) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No workflow selected</h2>
          <button
            onClick={onBack}
            className="text-indigo-600 hover:text-indigo-700"
          >
            Go back to integrations
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar - Workflows List */}
      {showSidebar && (
        <WorkflowSidebar 
          workflows={workflows}
          currentWorkflow={currentWorkflow}
          onWorkflowSelect={(workflow) => {
            // Handle workflow selection
          }}
          onCreateWorkflow={() => setShowNodeLibrary(true)}
          onToggleSidebar={() => setShowSidebar(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {!showSidebar && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <GitBranch className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm">Integrations</span>
            </button>
            <ArrowRight className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600 capitalize">{currentWorkflow.integration || 'Mailchimp'}</span>
          </div>

          <div className="flex items-center gap-4">
            {isEditingName ? (
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSave()}
                className="text-lg font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-indigo-500 focus:outline-none px-2 py-1"
                autoFocus
              />
            ) : (
              <h1 
                className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-indigo-600 px-2 py-1 rounded"
                onClick={handleNameEdit}
              >
                {workflowName}
              </h1>
            )}

            <div className={`flex items-center gap-2 text-sm ${getStatusColor()}`}>
              {getStatusIcon()}
              <span className="capitalize">{workflowStatus}</span>
            </div>

            {lastSaved && (
              <span className="text-xs text-gray-500">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleTest}
              disabled={workflowStatus === 'testing'}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
            >
              <TestTube className="w-4 h-4" />
              {workflowStatus === 'testing' ? 'Testing...' : 'Test Workflow'}
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button 
              onClick={handleDeploy}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
            >
              {workflowStatus === 'published' ? 'Published' : 'Publish'}
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 flex">
          <div className="flex-1 relative" ref={reactFlowWrapper}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              className="bg-gray-50"
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              minZoom={0.3}
              maxZoom={2}
              snapToGrid={true}
              snapGrid={[20, 20]}
              deleteKeyCode={['Backspace', 'Delete']}
              nodesDraggable={true}
              nodesConnectable={false} // Disable manual connections since we use vertical flow
              elementsSelectable={true}
            >
              <Background 
                color="#e5e7eb" 
                gap={20} 
                size={1}
                variant="dots"
              />
              <Controls 
                className="bg-white border border-gray-200 rounded-lg shadow-sm"
                showInteractive={false}
              />
              <MiniMap 
                className="bg-white border border-gray-200 rounded-lg"
                nodeColor="#6366f1"
                maskColor="rgba(0, 0, 0, 0.1)"
                pannable
                zoomable
                position="bottom-left"
              />
              
              {/* Empty State */}
              {nodes.length === 0 && (
                <Panel position="top-center" className="mt-20">
                  <div className="text-center bg-white rounded-lg border border-gray-200 p-8 shadow-sm max-w-md">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Start building your workflow</h3>
                    <p className="text-gray-600 text-sm mb-6">
                      Add your first trigger to get started. Triggers define when your workflow should run.
                    </p>
                    <button
                      onClick={() => setShowNodeLibrary(true)}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                    >
                      Choose a Trigger
                    </button>
                  </div>
                </Panel>
              )}

              {/* Add Node Button at Bottom */}
              {nodes.length > 0 && (
                <Panel position="bottom-center" className="mb-20">
                  <button
                    onClick={() => {
                      setAddNodeAfter(null);
                      setShowNodeLibrary(true);
                    }}
                    className="w-8 h-8 bg-white border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </Panel>
              )}
            </ReactFlow>
          </div>

          {/* Right Panel - Node Configuration */}
          {isConfigPanelOpen && selectedNode && (
            <NodeConfigPanel 
              node={selectedNode}
              onClose={() => setConfigPanelOpen(false)}
            />
          )}
        </div>
      </div>

      {/* Node Library Modal */}
      {showNodeLibrary && (
        <NodeLibrary
          onSelectNode={(template) => handleAddNode(template)}
          onClose={() => {
            setShowNodeLibrary(false);
            setAddNodeAfter(null);
          }}
          integration={currentWorkflow.integration}
        />
      )}
    </div>
  );
};

const WorkflowBuilder: React.FC<WorkflowBuilderProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderContent {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowBuilder;