import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Workflow, WorkflowNode, WorkflowEdge } from '../types/workflow';

interface WorkflowState {
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  selectedNode: WorkflowNode | null;
  isConfigPanelOpen: boolean;
  
  // Actions
  createWorkflow: (name: string, integration?: string) => Workflow;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  
  // Node actions
  addNode: (node: Omit<WorkflowNode, 'id'>) => void;
  updateNode: (id: string, updates: Partial<WorkflowNode>) => void;
  deleteNode: (id: string) => void;
  setSelectedNode: (node: WorkflowNode | null) => void;
  
  // Edge actions
  addEdge: (edge: Omit<WorkflowEdge, 'id'>) => void;
  deleteEdge: (id: string) => void;
  
  // UI actions
  setConfigPanelOpen: (open: boolean) => void;
}

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      workflows: [],
      currentWorkflow: null,
      selectedNode: null,
      isConfigPanelOpen: false,
      
      createWorkflow: (name: string, integration?: string) => {
        const workflow: Workflow = {
          id: `workflow_${Date.now()}`,
          name,
          nodes: [],
          edges: [],
          status: 'draft',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          integration
        };
        
        set((state) => ({
          workflows: [...state.workflows, workflow],
          currentWorkflow: workflow
        }));
        
        return workflow;
      },
      
      updateWorkflow: (id: string, updates: Partial<Workflow>) => {
        set((state) => ({
          workflows: state.workflows.map(w => 
            w.id === id ? { ...w, ...updates, updatedAt: new Date().toISOString() } : w
          ),
          currentWorkflow: state.currentWorkflow?.id === id 
            ? { ...state.currentWorkflow, ...updates, updatedAt: new Date().toISOString() }
            : state.currentWorkflow
        }));
      },
      
      deleteWorkflow: (id: string) => {
        set((state) => ({
          workflows: state.workflows.filter(w => w.id !== id),
          currentWorkflow: state.currentWorkflow?.id === id ? null : state.currentWorkflow
        }));
      },
      
      setCurrentWorkflow: (workflow: Workflow | null) => {
        set({ currentWorkflow: workflow });
      },
      
      addNode: (node: Omit<WorkflowNode, 'id'>) => {
        const newNode: WorkflowNode = {
          ...node,
          id: `node_${Date.now()}`
        };
        
        set((state) => {
          if (!state.currentWorkflow) return state;
          
          const updatedWorkflow = {
            ...state.currentWorkflow,
            nodes: [...state.currentWorkflow.nodes, newNode],
            updatedAt: new Date().toISOString()
          };
          
          return {
            currentWorkflow: updatedWorkflow,
            workflows: state.workflows.map(w => 
              w.id === updatedWorkflow.id ? updatedWorkflow : w
            )
          };
        });
      },
      
      updateNode: (id: string, updates: Partial<WorkflowNode>) => {
        set((state) => {
          if (!state.currentWorkflow) return state;
          
          const updatedWorkflow = {
            ...state.currentWorkflow,
            nodes: state.currentWorkflow.nodes.map(n => 
              n.id === id ? { ...n, ...updates } : n
            ),
            updatedAt: new Date().toISOString()
          };
          
          return {
            currentWorkflow: updatedWorkflow,
            workflows: state.workflows.map(w => 
              w.id === updatedWorkflow.id ? updatedWorkflow : w
            ),
            selectedNode: state.selectedNode?.id === id 
              ? { ...state.selectedNode, ...updates }
              : state.selectedNode
          };
        });
      },
      
      deleteNode: (id: string) => {
        set((state) => {
          if (!state.currentWorkflow) return state;
          
          const updatedWorkflow = {
            ...state.currentWorkflow,
            nodes: state.currentWorkflow.nodes.filter(n => n.id !== id),
            edges: state.currentWorkflow.edges.filter(e => e.source !== id && e.target !== id),
            updatedAt: new Date().toISOString()
          };
          
          return {
            currentWorkflow: updatedWorkflow,
            workflows: state.workflows.map(w => 
              w.id === updatedWorkflow.id ? updatedWorkflow : w
            ),
            selectedNode: state.selectedNode?.id === id ? null : state.selectedNode
          };
        });
      },
      
      setSelectedNode: (node: WorkflowNode | null) => {
        set({ 
          selectedNode: node,
          isConfigPanelOpen: !!node
        });
      },
      
      addEdge: (edge: Omit<WorkflowEdge, 'id'>) => {
        const newEdge: WorkflowEdge = {
          ...edge,
          id: `edge_${Date.now()}`
        };
        
        set((state) => {
          if (!state.currentWorkflow) return state;
          
          const updatedWorkflow = {
            ...state.currentWorkflow,
            edges: [...state.currentWorkflow.edges, newEdge],
            updatedAt: new Date().toISOString()
          };
          
          return {
            currentWorkflow: updatedWorkflow,
            workflows: state.workflows.map(w => 
              w.id === updatedWorkflow.id ? updatedWorkflow : w
            )
          };
        });
      },
      
      deleteEdge: (id: string) => {
        set((state) => {
          if (!state.currentWorkflow) return state;
          
          const updatedWorkflow = {
            ...state.currentWorkflow,
            edges: state.currentWorkflow.edges.filter(e => e.id !== id),
            updatedAt: new Date().toISOString()
          };
          
          return {
            currentWorkflow: updatedWorkflow,
            workflows: state.workflows.map(w => 
              w.id === updatedWorkflow.id ? updatedWorkflow : w
            )
          };
        });
      },
      
      setConfigPanelOpen: (open: boolean) => {
        set({ isConfigPanelOpen: open });
      }
    }),
    {
      name: 'workflow-storage'
    }
  )
);