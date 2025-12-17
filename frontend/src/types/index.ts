export interface Agent {
  agent_id: string;
  name: string;
  type: "openai" | "endpoint" | "langgraph" | "custom_endpoint";
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
  enable_km_search?: boolean;
  km_connection_ids?: string[];
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
  km_search_enabled: boolean;
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

// Knowledge Management (KM) Types

export interface KMCollection {
  name: string;
  files: string[];
  num_chunks: number;
}

export interface KMCorpus {
  id: number;
  name: string;
  display_name: string;
  description?: string;
  category?: string;
  chunk_count: number;
  file_count: number;
  is_public: boolean;
}

export type KMConnectionStatus = 'active' | 'inactive' | 'error';

export interface KMConnection {
  id: string;
  name: string;
  username: string;
  status: KMConnectionStatus;
  collections: KMCollection[];
  corpuses: KMCorpus[];
  selected_collection_names: string[];
  selected_corpus_ids: number[];
  created_at: string;
  updated_at: string;
  last_sync_at?: string;
  last_error?: string;
}

export interface KMConnectionCreate {
  name: string;
  username: string;
  password: string;
}

export interface KMConnectionUpdate {
  name?: string;
  selected_collection_names?: string[];
  selected_corpus_ids?: number[];
  is_active?: boolean;
}

export interface KMSelectionUpdate {
  selected_collection_names: string[];
  selected_corpus_ids: number[];
}

export interface KMTestResult {
  success: boolean;
  message: string;
  collections_count: number;
  corpuses_count: number;
}

export interface KMStatus {
  km_server_url: string;
  total_connections: number;
  active_connections: number;
  connections_with_selections: number;
  is_configured: boolean;
}

export interface KMSearchSettings {
  enabled: boolean;
  activeConnectionIds: string[];
}

// Session-scoped Custom Endpoints

export interface CustomEndpoint {
  id: string;
  name: string;
  url: string;
  model: string;
  created_at: string;
}

export interface CustomEndpointCreate {
  name: string;
  url: string;
  api_key: string;
  model: string;
}

// Session Info

export interface SessionInfo {
  session_id: string;
  conversation_id: string;
  created_at: string;
  last_activity: string;
  km_connections_count: number;
  custom_endpoints_count: number;
  agent_config_overrides_count: number;
}