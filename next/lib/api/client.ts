import type {
  Agent,
  ChatRequest,
  ChatResponse,
  ChatStreamChunk,
  WorkflowRequest,
  WorkflowResponse,
  WorkflowProgress,
  HealthResponse,
  DetailedStatus,
  AgentTestResult,
  ToolsStatus,
  ToolsTestResult,
  KMConnection,
  KMConnectionCreate,
  KMConnectionUpdate,
  KMSelectionUpdate,
  KMTestResult,
  KMStatus,
  CustomEndpoint,
  CustomEndpointCreate,
  SessionInfo,
  UploadedFile,
} from './types';

class JarvisAPIClient {
  private baseURL: string;
  private sessionId: string = '';

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }

  // Session management
  setSessionId(id: string) {
    this.sessionId = id;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (this.sessionId) {
      headers['X-Session-ID'] = this.sessionId;
    }
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || `HTTP ${response.status}`);
    }
    return response.json();
  }

  // ============================================
  // Health & Status
  // ============================================

  async healthCheck(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseURL}/api/health`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<HealthResponse>(response);
  }

  async getStatus(): Promise<DetailedStatus> {
    const response = await fetch(`${this.baseURL}/api/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<DetailedStatus>(response);
  }

  // ============================================
  // Agents
  // ============================================

  async listAgents(filters?: {
    agent_type?: string;
    capability?: string;
    include_custom?: boolean;
  }): Promise<Agent[]> {
    const params = new URLSearchParams();
    if (filters?.agent_type) params.set('agent_type', filters.agent_type);
    if (filters?.capability) params.set('capability', filters.capability);
    if (filters?.include_custom !== undefined) {
      params.set('include_custom', String(filters.include_custom));
    }

    const url = `${this.baseURL}/api/agents${params.toString() ? `?${params}` : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<Agent[]>(response);
  }

  async getAgent(agentId: string): Promise<Agent> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<Agent>(response);
  }

  async testAgent(agentId: string): Promise<AgentTestResult> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/test`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<AgentTestResult>(response);
  }

  // ============================================
  // Chat
  // ============================================

  async chat(agentId: string, request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<ChatResponse>(response);
  }

  async *chatStream(
    agentId: string,
    request: ChatRequest,
    signal?: AbortSignal
  ): AsyncGenerator<ChatStreamChunk> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/chat/stream`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Stream failed' }));
      throw new Error(error.error || error.detail || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              yield JSON.parse(line.slice(6)) as ChatStreamChunk;
            } catch (e) {
              console.warn('Failed to parse SSE data:', line);
            }
          }
        }
      }

      // Process any remaining data in buffer
      if (buffer.startsWith('data: ')) {
        try {
          yield JSON.parse(buffer.slice(6)) as ChatStreamChunk;
        } catch (e) {
          console.warn('Failed to parse final SSE data:', buffer);
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async deleteConversation(agentId: string, conversationId: string): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/api/agents/${agentId}/conversations/${conversationId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  }

  // ============================================
  // Workflows
  // ============================================

  async executeWorkflow(agentId: string, request: WorkflowRequest): Promise<WorkflowResponse> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/workflow`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });
    return this.handleResponse<WorkflowResponse>(response);
  }

  async getWorkflowProgress(taskId: string): Promise<WorkflowProgress> {
    const response = await fetch(`${this.baseURL}/api/agents/progress/${taskId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<WorkflowProgress>(response);
  }

  // ============================================
  // Tools
  // ============================================

  async getToolsStatus(): Promise<ToolsStatus> {
    const response = await fetch(`${this.baseURL}/api/agents/tools/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<ToolsStatus>(response);
  }

  async testTools(): Promise<ToolsTestResult> {
    const response = await fetch(`${this.baseURL}/api/agents/tools/test`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<ToolsTestResult>(response);
  }

  // ============================================
  // Files
  // ============================================

  async uploadFile(conversationId: string, file: File): Promise<UploadedFile> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {};
    if (this.sessionId) {
      headers['X-Session-ID'] = this.sessionId;
    }

    const response = await fetch(`${this.baseURL}/api/files/${conversationId}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse<UploadedFile>(response);
  }

  async listFiles(conversationId: string): Promise<UploadedFile[]> {
    const response = await fetch(`${this.baseURL}/api/files/${conversationId}/files`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<UploadedFile[]>(response);
  }

  async deleteFile(conversationId: string, fileId: string): Promise<void> {
    const response = await fetch(
      `${this.baseURL}/api/files/${conversationId}/files/${fileId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );
    if (!response.ok) {
      throw new Error('Failed to delete file');
    }
  }

  getFileDownloadUrl(conversationId: string, fileId: string): string {
    return `${this.baseURL}/api/files/${conversationId}/files/${fileId}/download`;
  }

  // ============================================
  // Knowledge Management (Global)
  // ============================================

  async listKMConnections(): Promise<KMConnection[]> {
    const response = await fetch(`${this.baseURL}/api/km/connections`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<KMConnection[]>(response);
  }

  async createKMConnection(data: KMConnectionCreate): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/km/connections`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<KMConnection>(response);
  }

  async getKMConnection(connectionId: string): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<KMConnection>(response);
  }

  async updateKMConnection(connectionId: string, data: KMConnectionUpdate): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<KMConnection>(response);
  }

  async deleteKMConnection(connectionId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete KM connection');
    }
  }

  async syncKMConnection(connectionId: string): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}/sync`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<KMConnection>(response);
  }

  async testKMConnection(connectionId: string): Promise<KMTestResult> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}/test`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse<KMTestResult>(response);
  }

  async updateKMSelections(connectionId: string, data: KMSelectionUpdate): Promise<KMConnection> {
    const response = await fetch(
      `${this.baseURL}/api/km/connections/${connectionId}/selections`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      }
    );
    return this.handleResponse<KMConnection>(response);
  }

  async getKMStatus(): Promise<KMStatus> {
    const response = await fetch(`${this.baseURL}/api/km/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<KMStatus>(response);
  }

  // ============================================
  // Session Endpoints
  // ============================================

  async listCustomEndpoints(): Promise<CustomEndpoint[]> {
    const response = await fetch(`${this.baseURL}/api/session/endpoints`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<CustomEndpoint[]>(response);
  }

  async createCustomEndpoint(data: CustomEndpointCreate): Promise<CustomEndpoint> {
    const response = await fetch(`${this.baseURL}/api/session/endpoints`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<CustomEndpoint>(response);
  }

  async deleteCustomEndpoint(endpointId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/session/endpoints/${endpointId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) {
      throw new Error('Failed to delete custom endpoint');
    }
  }

  async testCustomEndpoint(endpointId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseURL}/api/session/endpoints/${endpointId}/test`, {
      method: 'POST',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSessionInfo(): Promise<SessionInfo> {
    const response = await fetch(`${this.baseURL}/api/session/info`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<SessionInfo>(response);
  }
}

// Export singleton instance
export const apiClient = new JarvisAPIClient();
export default apiClient;
