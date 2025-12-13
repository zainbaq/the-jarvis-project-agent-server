export interface Agent {
  agent_id: string;
  name: string;
  type: "openai" | "endpoint" | "langgraph";
  description: string;
  capabilities: string[];
  status: "active" | "inactive";
  config: Record<string, any>;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  metadata?: {
    tokens_used?: number;
    model?: string;
    execution_time?: number;
  };
  tools_used?: Array<{
    tool: string;
    success: boolean;
    data: any;
    timestamp: string;
  }>;
}

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  enable_web_search?: boolean;
  parameters?: {
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    system_message?: string;
  };
}

export interface ChatResponse {
  response: string;
  conversation_id: string;
  agent_id: string;
  metadata: {
    tokens_used?: number;
    model?: string;
    execution_time?: number;
  };
  tools_used: Array<{
    tool: string;
    success: boolean;
    data: any;
    timestamp: string;
  }>;
  web_search_enabled: boolean;
}

export interface WorkflowRequest {
  task: string;
  parameters?: {
    recursion_limit?: number;
    temperature?: number;
    provider?: string;
    model_name?: string;
    max_tokens?: number;
  };
}

export interface WorkflowResponse {
  status: "completed" | "failed";
  result?: any;
  error?: string;
  execution_time?: number;
}

export interface DetailedStatus {
  status: string;
  version: string;
  uptime: number;
  registry: {
    initialized: boolean;
    [key: string]: any;
  };
  agents: Array<{
    agent_id: string;
    name: string;
    type: string;
    status: string;
  }>;
}

export interface AgentTestResult {
  success: boolean;
  message: string;
  response_preview?: string;
  agent_type: string;
  error?: string;
}

export interface ToolsStatus {
  tools: Record<string, boolean>;
  web_search_configured: boolean;
}

export interface ToolsTestResult {
  success: boolean;
  results?: Record<string, {
    success: boolean;
    message: string;
    error?: string;
  }>;
  error?: string;
}