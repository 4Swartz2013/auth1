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
  MarkerType,
  Position
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
  RotateCcw,
  Lock,
  Unlock
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useWorkflowStore } from '../../store/workflowStore';
import CustomNode from './CustomNode';
import NodeConfigPanel from './NodeConfigPanel';
import NodeLibrary from './NodeLibrary';
import WorkflowSidebar from './WorkflowSidebar';

const nodeTypes = {
  custom: CustomNode,
  conditional: CustomNode,
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
    updateNode,
    setSelectedNode,
    setConfigPanelOpen,
    workflows,
    deleteEdge
  } = useWorkflowStore();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [showNodeLibrary, setShowNodeLibrary] = useState(false);
  const [workflowName, setWorkflowName] = useState(currentWorkflow?.name || 'New Workflow');
  const [isEditingName, setIsEditingName] = useState(false);
  const [addNodeAfter, setAddNodeAfter] = useState<string | null>(null);
  const [addNodeBranch, setAddNodeBranch] = useState<'yes' | 'no' | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [workflowStatus, setWorkflowStatus] = useState<'draft' | 'published' | 'testing'>('draft');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [viewLocked, setViewLocked] = useState(true);
  const [nodeSpacing] = useState(150); // Vertical spacing between nodes

  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Initialize nodes and edges from current workflow
  useEffect(() => {
    if (currentWorkflow) {
      const flowNodes = currentWorkflow.nodes.map((node) => ({
        id: node.id,
        type: node.type === 'condition' ? 'conditional' : 'custom',
        position: node.position,
        data: {
          ...node.data,
          nodeType: node.type,
          onConfigClick: () => {
            setSelectedNode(node);
            setConfigPanelOpen(true);
          },
          onAddNodeBelow: (nodeId: string) => {
            setAddNodeAfter(nodeId);
            setShowNodeLibrary(true);
          },
          isConditional: node.type === 'condition'
        },
        draggable: !viewLocked
      }));
      
      // Create edges connecting nodes vertically
      const flowEdges: Edge[] = [];
      
      // Create edges based on workflow edges
      if (currentWorkflow.edges && currentWorkflow.edges.length > 0) {
        currentWorkflow.edges.forEach(edge => {
          flowEdges.push({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
            targetHandle: edge.targetHandle,
            type: 'default',
            ...edgeOptions
          });
        });
      } else {
        // Create default edges for backward compatibility
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
      }

      setNodes(flowNodes);
      setEdges(flowEdges);
      setWorkflowName(currentWorkflow.name);
      setWorkflowStatus(currentWorkflow.status as any);
      
      // Auto-position nodes if needed
      if (flowNodes.length > 0 && viewLocked) {
        setTimeout(() => {
          autoArrangeNodes();
        }, 100);
      }
    }
  }, [currentWorkflow, setNodes, setEdges, setSelectedNode, setConfigPanelOpen, viewLocked]);

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

  // Function to automatically position nodes in a perfect vertical alignment
  const autoArrangeNodes = () => {
    if (!currentWorkflow) return;
    
    // Create a map of nodes by their IDs for quick lookup
    const nodeMap = new Map<string, WorkflowNode>();
    currentWorkflow.nodes.forEach(node => nodeMap.set(node.id, node));
    
    // Find root nodes (nodes that are not targets of any edge)
    const targetNodeIds = new Set(currentWorkflow.edges.map(edge => edge.target));
    const rootNodeIds = currentWorkflow.nodes
      .filter(node => !targetNodeIds.has(node.id))
      .map(node => node.id);
    
    // If no root nodes found, use the first node
    const startNodeIds = rootNodeIds.length > 0 ? rootNodeIds : [currentWorkflow.nodes[0]?.id];
    
    // Position map to track node positions
    const positions: Record<string, { x: number; y: number }> = {};
    
    // Process each root node
    startNodeIds.forEach((startNodeId, rootIndex) => {
      const baseX = 400 + (rootIndex * 600); // Space out multiple root nodes horizontally
      let currentY = 100;
      
      // Function to recursively position nodes
      const positionNode = (nodeId: string, x: number, y: number) => {
        const node = nodeMap.get(nodeId);
        if (!node) return;
        
        // Set position for this node
        positions[nodeId] = { x, y };
        
        // Find child nodes
        const childEdges = currentWorkflow.edges.filter(edge => edge.source === nodeId);
        
        if (childEdges.length === 0) return;
        
        // Handle conditional nodes (with multiple outputs)
        if (node.type === 'condition') {
          const yesEdge = childEdges.find(edge => edge.sourceHandle === 'yes');
          const noEdge = childEdges.find(edge => edge.sourceHandle === 'no');
          
          if (yesEdge) {
            positionNode(yesEdge.target, x - 300, y + nodeSpacing);
          }
          
          if (noEdge) {
            positionNode(noEdge.target, x + 300, y + nodeSpacing);
          }
          
          // Other edges (if any)
          childEdges
            .filter(edge => edge.sourceHandle !== 'yes' && edge.sourceHandle !== 'no')
            .forEach((edge, i) => {
              positionNode(edge.target, x, y + nodeSpacing);
            });
        } else {
          // Regular node with single output
          childEdges.forEach((edge, i) => {
            positionNode(edge.target, x, y + nodeSpacing);
          });
        }
      };
      
      // Start positioning from the root node
      positionNode(startNodeId, baseX, currentY);
    });
    
    // Update node positions in the store
    Object.entries(positions).forEach(([nodeId, position]) => {
      updateNode(nodeId, { position });
    });
    
    // Update the nodes in the flow
    setNodes(nodes => 
      nodes.map(node => ({
        ...node,
        position: positions[node.id] || node.position,
        draggable: !viewLocked
      }))
    );
    
    // Center the flow
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, 100);
  };

  // Function to tidy up the workflow
  const handleTidyWorkflow = () => {
    autoArrangeNodes();
  };

  // Function to toggle view lock
  const toggleViewLock = () => {
    setViewLocked(!viewLocked);
    
    // Update node draggability
    setNodes(nodes => 
      nodes.map(node => ({
        ...node,
        draggable: viewLocked // Inverse of current viewLocked state
      }))
    );
    
    // If locking the view, auto-arrange nodes
    if (!viewLocked) {
      autoArrangeNodes();
    }
  };

  const handleAddNode = (nodeTemplate: any) => {
    if (!currentWorkflow) return;

    let newPosition = { x: 400, y: 100 };
    let sourceNode = null;
    let sourceHandle = null;
    
    if (addNodeAfter) {
      // Find the node we're adding after
      const afterNode = currentWorkflow.nodes.find(n => n.id === addNodeAfter);
      if (afterNode) {
        sourceNode = afterNode;
        
        // Check if the source node is a conditional node
        if (afterNode.type === 'condition') {
          // For conditional nodes, position depends on which branch we're adding to
          if (addNodeBranch === 'yes') {
            sourceHandle = 'yes';
            newPosition = { 
              x: afterNode.position.x - 300, 
              y: afterNode.position.y + nodeSpacing 
            };
          } else if (addNodeBranch === 'no') {
            sourceHandle = 'no';
            newPosition = { 
              x: afterNode.position.x + 300, 
              y: afterNode.position.y + nodeSpacing 
            };
          } else {
            // Default branch
            sourceHandle = 'default';
            newPosition = { 
              x: afterNode.position.x, 
              y: afterNode.position.y + nodeSpacing 
            };
          }
        } else {
          // For regular nodes, position directly below
          newPosition = { 
            x: afterNode.position.x, 
            y: afterNode.position.y + nodeSpacing 
          };
        }
      }
    } else if (currentWorkflow.nodes.length === 0) {
      // First node
      newPosition = { x: 400, y: 100 };
    } else {
      // Add at the end
      const lastNode = currentWorkflow.nodes[currentWorkflow.nodes.length - 1];
      newPosition = { x: lastNode.position.x, y: lastNode.position.y + nodeSpacing };
    }

    // Generate a unique ID for the new node
    const nodeId = `node_${uuidv4()}`;

    const newNode = {
      id: nodeId,
      type: nodeTemplate.type,
      position: newPosition,
      data: {
        label: nodeTemplate.label,
        subtitle: nodeTemplate.subtitle || nodeTemplate.description,
        description: nodeTemplate.description,
        icon: nodeTemplate.icon,
        integration: nodeTemplate.integration,
        config: nodeTemplate.config || {},
        status: 'idle',
        nodeType: nodeTemplate.type,
        isConditional: nodeTemplate.type === 'condition'
      }
    };

    // Add the node to the workflow
    const addedNode = addNode(newNode);
    
    // If we're adding after another node, create an edge
    if (sourceNode) {
      // Create the edge
      const edgeId = `edge_${sourceNode.id}_${nodeId}`;
      addWorkflowEdge({
        id: edgeId,
        source: sourceNode.id,
        target: nodeId,
        sourceHandle: sourceHandle,
        targetHandle: null
      });
    }
    
    setShowNodeLibrary(false);
    setAddNodeAfter(null);
    setAddNodeBranch(null);
    
    // Auto-arrange nodes if view is locked
    if (viewLocked) {
      setTimeout(() => {
        autoArrangeNodes();
      }, 100);
    }
  };

  const handleAddConditionalBranch = (nodeId: string, branch: 'yes' | 'no') => {
    setAddNodeAfter(nodeId);
    setAddNodeBranch(branch);
    setShowNodeLibrary(true);
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
          </div>

          <div className="flex items-center gap-3">
            {/* View Lock Toggle */}
            <button 
              onClick={toggleViewLock}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                viewLocked 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {viewLocked ? (
                <>
                  <Lock className="w-4 h-4" />
                  <span className="text-sm font-medium">View Locked</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit Mode</span>
                </>
              )}
            </button>
            
            {/* Tidy Button */}
            <button 
              onClick={handleTidyWorkflow}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Tidy Workflow
            </button>
            
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
              className={`bg-gray-50 ${viewLocked ? 'cursor-default' : 'cursor-grab'}`}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              minZoom={0.3}
              maxZoom={2}
              snapToGrid={true}
              snapGrid={[20, 20]}
              deleteKeyCode={['Backspace', 'Delete']}
              nodesDraggable={!viewLocked}
              nodesConnectable={!viewLocked} // Enable connections in edit mode
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
                      setAddNodeBranch(null);
                      setShowNodeLibrary(true);
                    }}
                    className="w-8 h-8 bg-white border-2 border-dashed border-gray-300 rounded-full flex items-center justify-center hover:border-indigo-500 hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </Panel>
              )}
              
              {/* Conditional Node Branch Buttons */}
              {currentWorkflow.nodes.filter(node => node.type === 'condition').map(node => {
                const yesEdge = currentWorkflow.edges.find(e => e.source === node.id && e.sourceHandle === 'yes');
                const noEdge = currentWorkflow.edges.find(e => e.source === node.id && e.sourceHandle === 'no');
                
                return (
                  <React.Fragment key={`branch-buttons-${node.id}`}>
                    {!yesEdge && (
                      <Panel 
                        position="top-center" 
                        className="pointer-events-none" 
                        style={{ 
                          position: 'absolute',
                          left: node.position.x - 150,
                          top: node.position.y + 120
                        }}
                      >
                        <button
                          onClick={() => handleAddConditionalBranch(node.id, 'yes')}
                          className="pointer-events-auto w-8 h-8 bg-green-100 border-2 border-dashed border-green-300 rounded-full flex items-center justify-center hover:border-green-500 hover:bg-green-50 transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4 text-green-600" />
                        </button>
                      </Panel>
                    )}
                    
                    {!noEdge && (
                      <Panel 
                        position="top-center" 
                        className="pointer-events-none" 
                        style={{ 
                          position: 'absolute',
                          left: node.position.x + 150,
                          top: node.position.y + 120
                        }}
                      >
                        <button
                          onClick={() => handleAddConditionalBranch(node.id, 'no')}
                          className="pointer-events-auto w-8 h-8 bg-red-100 border-2 border-dashed border-red-300 rounded-full flex items-center justify-center hover:border-red-500 hover:bg-red-50 transition-colors shadow-sm"
                        >
                          <Plus className="w-4 h-4 text-red-600" />
                        </button>
                      </Panel>
                    )}
                  </React.Fragment>
                );
              })}
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
            setAddNodeBranch(null);
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