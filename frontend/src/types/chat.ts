// Chat request/response types
// Similar to Pydantic models in backend/models/requests.py

import { UploadedFile } from './files';

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
  tools_used: ToolResult[];
  web_search_enabled: boolean;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  data: any;
  timestamp: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
  toolsUsed?: ToolResult[];
  attachedFiles?: UploadedFile[];
}

export interface Conversation {
  id: string;
  agentId: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}
