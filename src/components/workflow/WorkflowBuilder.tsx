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
import { hierarchy, tree, HierarchyNode } from 'd3-hierarchy';
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
  const [editMode, setEditMode] = useState(false);
  const [nodeSpacing] = useState(200); // Vertical spacing between nodes

  // Layout configuration
  const [autoLayout, setAutoLayout] = useState(true);

  // Animation settings for node transitions
  const [nodeTransitionDuration, setNodeTransitionDuration] = useState(300);

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
        draggable: editMode
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
      if (flowNodes.length > 0 && !editMode) {
        setTimeout(() => {
          autoArrangeNodes();
        }, 100);
      }
    }
  }, [currentWorkflow, setNodes, setEdges, setSelectedNode, setConfigPanelOpen, editMode]);

  // Function to automatically layout nodes using d3-hierarchy
  const applyHierarchicalLayout = useCallback(() => {
    if (!currentWorkflow || !currentWorkflow.nodes.length) return;

    // Create a map of nodes by their IDs for quick lookup
    const nodeMap = new Map<string, any>();
    currentWorkflow.nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Find root nodes (nodes that are not targets of any edge)
    const targetNodeIds = new Set(currentWorkflow.edges.map(edge => edge.target));
    const rootNodeIds = currentWorkflow.nodes
      .filter(node => !targetNodeIds.has(node.id))
      .map(node => node.id);

    // If no root nodes found, use the first node
    const startNodeIds = rootNodeIds.length > 0 ? rootNodeIds : [currentWorkflow.nodes[0]?.id];

    // Build the hierarchy by connecting children
    currentWorkflow.edges.forEach(edge => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (sourceNode && targetNode) {
        // For conditional nodes, store the handle information
        if (edge.sourceHandle) {
          targetNode.sourceHandle = edge.sourceHandle;
        }

        sourceNode.children.push(targetNode);
      }
    });

    // Process each root node to create a separate tree
    startNodeIds.forEach((rootId, rootIndex) => {
      const rootNode = nodeMap.get(rootId);
      if (!rootNode) return;

      // Create a d3 hierarchy from our tree
      const hierarchyRoot: HierarchyNode<any> = hierarchy(rootNode);

      // Use d3's tree layout
      const treeLayout = tree<typeof rootNode>()
        .nodeSize([350, nodeSpacing]) // [horizontal, vertical] spacing
        .separation((a, b) => {
          // Increase separation for nodes with different parents or conditional branches
          if (a.parent !== b.parent) return 2.5;
          
          // If parent is a conditional node, increase separation between yes/no branches
          if (a.parent?.data.type === 'condition') {
            const aIsYes = a.data.sourceHandle === 'yes';
            const bIsYes = b.data.sourceHandle === 'yes';
            // If they're on different branches, increase separation
            if (aIsYes !== bIsYes) return 3;
          }
          
          return 1.5;
        });

      // Apply the layout
      const layoutedTree = treeLayout(hierarchyRoot);

      // Base position for this tree (to separate multiple trees)
      const baseX = 400 + (rootIndex * 800);
      const baseY = 100;

      // Update node positions based on the layout
      layoutedTree.descendants().forEach(node => {
        const originalNode = nodeMap.get(node.data.id);
        if (originalNode) {
          // For conditional nodes, adjust child positions based on the branch
          if (node.data.type === 'condition' && node.children) {
            node.children.forEach(child => {
              // Adjust x position based on which branch (yes/no) the child belongs to
              if (child.data.sourceHandle === 'yes') {
                child.x -= 200; // Move "yes" branch to the left
              } else if (child.data.sourceHandle === 'no') {
                child.x += 200; // Move "no" branch to the right
              }
            });
          }

          // Update the node position
          updateNode(originalNode.id, {
            position: {
              x: baseX + node.x, // x is horizontal position
              y: baseY + node.y  // y is vertical position
            }
          });
        }
      });
    });

    // Update the nodes in the flow
    setNodes(nodes => {
      // Get the current positions for animation
      const currentPositions = new Map(nodes.map(node => [node.id, { ...node.position }]));
      
      // Create updated nodes with new positions
      return nodes.map(node => ({
        ...node,
        position: currentWorkflow.nodes.find(n => n.id === node.id)?.position || node.position,
        draggable: editMode,
        // Add transition style for smooth animation
        style: {
          ...node.style,
          transition: `transform ${nodeTransitionDuration}ms ease-in-out`
        }
      }));
    });

    // Center the flow
    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.2 });
    }, nodeTransitionDuration + 50);
  }, [currentWorkflow, updateNode, setNodes, reactFlowInstance, editMode, nodeSpacing, nodeTransitionDuration]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (!editMode) return; // Only allow connections in edit mode
      
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
    [setEdges, addWorkflowEdge, editMode]
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
    // Use the d3-hierarchy based layout
    applyHierarchicalLayout();
  };

  // Function to tidy up the workflow
  const handleTidyWorkflow = () => {
    autoArrangeNodes();
  };

  // Function to toggle edit mode
  const toggleEditMode = () => {
    setEditMode(!editMode);
    
    // Update node draggability
    setNodes(nodes => 
      nodes.map(node => ({
        ...node,
        draggable: !editMode // Inverse of current editMode state
      }))
    );
    
    // If exiting edit mode, auto-arrange nodes
    if (editMode) {
      autoArrangeNodes();
    } else {
      // When entering edit mode, make nodes draggable
      setNodes(nodes => 
        nodes.map(node => ({
          ...node,
          draggable: !editMode // Inverse of current editMode state
        }))
      );
    }
  };

  const handleAddNode = (nodeTemplate: any) => {
    if (!currentWorkflow) return;

    // Default position for new nodes
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
    if (sourceNode && addedNode) {
      // Create the edge
      const edgeId = `edge_${uuidv4()}`;
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
    if (autoLayout || !editMode) {
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

            {lastSaved && (
              <span className="text-xs text-gray-500">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Edit Mode Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Edit Mode</span>
              <button 
                onClick={toggleEditMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  editMode ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    editMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Tidy Button */}
            <button 
              onClick={handleTidyWorkflow}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
              title="Reorganize nodes using automatic layout"
            >
              <RotateCcw className="w-4 h-4" />
              Tidy Workflow
            </button>
            
            <button 
              onClick={handleTest}
              disabled={workflowStatus === 'testing'}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium disabled:opacity-50" 
              title="Test the entire workflow"
            >
              <TestTube className="w-4 h-4" />
              {workflowStatus === 'testing' ? 'Testing...' : 'Test Workflow'}
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium"
              title="Save workflow changes"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
            <button 
              onClick={handleDeploy}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
              title="Publish workflow to make it live"
            >
              {workflowStatus === 'published' ? 'Published' : 'Publish'}
            </button>
            
            {/* Auto Layout Toggle */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
              <span className="text-sm font-medium text-gray-700">Auto Layout</span>
              <button 
                onClick={() => {
                  setAutoLayout(!autoLayout);
                  if (!autoLayout) {
                    // Apply layout immediately when turning on
                    setTimeout(applyHierarchicalLayout, 50);
                  }
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                  autoLayout ? 'bg-green-600' : 'bg-gray-200'
                }`}
                title="Toggle automatic node layout"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoLayout ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
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
              onNodesChange={(changes) => {
                onNodesChange(changes);
                
                // If a node was moved manually and auto layout is on, reapply layout
                const positionChanges = changes.filter(change => 
                  change.type === 'position' && change.dragging === false
                );
                
                if (positionChanges.length > 0 && autoLayout && !editMode) {
                  setTimeout(applyHierarchicalLayout, 50);
                }
              }}
              onEdgesChange={(changes) => {
                onEdgesChange(changes);
                
                // If an edge was removed and auto layout is on, reapply layout
                const edgeRemovals = changes.filter(change => change.type === 'remove');
                if (edgeRemovals.length > 0 && autoLayout) {
                  setTimeout(applyHierarchicalLayout, 50);
                }
              }}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              connectionMode={ConnectionMode.Loose}
              fitView
              className={`bg-gray-50 ${editMode ? 'cursor-grab' : 'cursor-default'}`}
              defaultViewport={{ x: 0, y: 0, zoom: 1 }}
              minZoom={0.3}
              maxZoom={2}
              snapToGrid={true}
              fitView
              snapGrid={[20, 20]}
              deleteKeyCode={['Backspace', 'Delete']}
              nodesDraggable={editMode}
              nodesConnectable={editMode} // Enable connections in edit mode
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
          onSelectNode={handleAddNode}
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