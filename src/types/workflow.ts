export interface WorkflowNode {
  id: string;
  type: 'trigger' | 'action' | 'condition' | 'function' | 'request' | 'response' | 'fanout' | 'delay' | 'resource' | string;
  position: { x: number; y: number };
  data: {
    label: string;
    subtitle?: string;
    description?: string;
    icon?: string;
    integration?: string;
    config?: Record<string, any>;
    status?: 'idle' | 'running' | 'success' | 'error' | string;
    nodeType?: string;
    isConditional?: boolean;
    onAddNodeBelow?: (nodeId: string) => void;
    onConfigClick?: () => void;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'conditional' | string;
  label?: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  updatedAt: string;
  integration?: string;
}

export interface NodeTemplate {
  type: string;
  label: string;
  description: string;
  icon: string;
  category: 'trigger' | 'action' | 'logic' | 'utility';
  integration?: string;
  config?: Record<string, any>;
}