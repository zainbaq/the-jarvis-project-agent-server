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
  attachedFiles?: UploadedFile[];
}

export interface UploadedFile {
  file_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface FileUploadProgress {
  file_id: string;
  filename: string;
  progress: number; // 0-100
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

// Supported file types (matching backend)
export const SUPPORTED_FILE_EXTENSIONS = [
  // Documents
  'pdf', 'docx', 'txt', 'md', 'rtf',
  // Code
  'py', 'js', 'ts', 'tsx', 'jsx', 'java', 'cpp', 'c', 'go', 'rs', 'rb',
  'php', 'swift', 'kt', 'cs', 'html', 'css', 'scss', 'sql', 'sh', 'yaml', 'yml',
  // Data
  'csv', 'json', 'xml',
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'
];

// Max file size: 256 MB
export const MAX_FILE_SIZE = 256 * 1024 * 1024;

export interface ChatRequest {
  message: string;
  conversation_id?: string;
  enable_web_search?: boolean;
  uploaded_files?: UploadedFile[];
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