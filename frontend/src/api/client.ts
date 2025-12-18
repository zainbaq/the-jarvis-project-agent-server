import { Agent, ChatRequest, ChatResponse, WorkflowRequest, WorkflowResponse, WorkflowProgress, DetailedStatus, AgentTestResult, ToolsStatus, ToolsTestResult, KMConnection, KMConnectionCreate, KMConnectionUpdate, KMSelectionUpdate, KMTestResult, KMStatus, CustomEndpoint, CustomEndpointCreate, SessionInfo } from '../types';

const BASE_URL = 'http://127.0.0.1:8000';

export class JarvisAPIClient {
  private sessionId: string = '';

  get baseURL(): string {
    return BASE_URL;
  }

  /**
   * Set the session ID for all subsequent requests
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    console.log('[API Client] Session ID set:', sessionId.substring(0, 20) + '...');
  }

  /**
   * Get headers including session ID and content type
   */
  private getHeaders(includeContentType: boolean = true): Record<string, string> {
    const headers: Record<string, string> = {};

    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.sessionId) {
      headers['X-Session-ID'] = this.sessionId;
    }

    return headers;
  }

  async listAgents(filters?: { agent_type?: string; capability?: string }): Promise<Agent[]> {
    const params = new URLSearchParams(filters as any);
    try {
      const response = await fetch(`${this.baseURL}/api/agents${params.toString() ? '?' + params : ''}`, {
        headers: this.getHeaders(false)
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }
      return response.json();
    } catch (error) {
      console.error('Error fetching agents:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Cannot connect to backend. Make sure your backend is running on http://localhost:8000 and CORS is enabled.');
      }
      throw error;
    }
  }

  async getAgent(agentId: string): Promise<Agent> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch agent: ${response.statusText}`);
    }
    return response.json();
  }

  async chat(agentId: string, request: ChatRequest): Promise<ChatResponse> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/chat`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || 'Chat request failed');
    }

    return response.json();
  }

  async executeWorkflow(agentId: string, request: WorkflowRequest): Promise<WorkflowResponse> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/workflow`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || 'Workflow execution failed');
    }

    return response.json();
  }

  async getWorkflowProgress(taskId: string): Promise<WorkflowProgress> {
    const response = await fetch(`${this.baseURL}/api/agents/progress/${taskId}`, {
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      throw new Error('Failed to fetch workflow progress');
    }

    return response.json();
  }

  async deleteConversation(agentId: string, conversationId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/conversations/${conversationId}`, {
      method: 'DELETE',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  }

  async healthCheck(): Promise<{ status: string; version: string; agents_loaded: number; uptime: number }> {
    const response = await fetch(`${this.baseURL}/api/health`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }

  async getStatus(): Promise<DetailedStatus> {
    const response = await fetch(`${this.baseURL}/api/status`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }
    return response.json();
  }

  async testAgent(agentId: string): Promise<AgentTestResult> {
    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/test`, {
      method: 'POST',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || 'Agent test failed');
    }

    return response.json();
  }

  async getToolsStatus(): Promise<ToolsStatus> {
    const response = await fetch(`${this.baseURL}/api/agents/tools/status`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch tools status');
    }
    return response.json();
  }

  async testTools(): Promise<ToolsTestResult> {
    const response = await fetch(`${this.baseURL}/api/agents/tools/test`, {
      method: 'POST',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || 'Tools test failed');
    }

    return response.json();
  }

  // Knowledge Management (KM) API Methods (Global - for backward compatibility)

  async listKMConnections(): Promise<KMConnection[]> {
    const response = await fetch(`${this.baseURL}/api/km/connections`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch KM connections');
    }
    return response.json();
  }

  async createKMConnection(data: KMConnectionCreate): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/km/connections`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to create KM connection');
    }

    return response.json();
  }

  async getKMConnection(connectionId: string): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch KM connection');
    }
    return response.json();
  }

  async updateKMConnection(connectionId: string, data: KMConnectionUpdate): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update KM connection');
    }

    return response.json();
  }

  async deleteKMConnection(connectionId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      throw new Error('Failed to delete KM connection');
    }
  }

  async syncKMConnection(connectionId: string): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}/sync`, {
      method: 'POST',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to sync KM connection');
    }

    return response.json();
  }

  async testKMConnection(connectionId: string): Promise<KMTestResult> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}/test`, {
      method: 'POST',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to test KM connection');
    }

    return response.json();
  }

  async updateKMSelections(connectionId: string, selections: KMSelectionUpdate): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}/selections`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(selections)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update KM selections');
    }

    return response.json();
  }

  async getKMStatus(): Promise<KMStatus> {
    const response = await fetch(`${this.baseURL}/api/km/status`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch KM status');
    }
    return response.json();
  }

  // ==================== Session-Scoped KM Connections ====================

  async listSessionKMConnections(): Promise<KMConnection[]> {
    const response = await fetch(`${this.baseURL}/api/session/km/connections`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch session KM connections');
    }
    return response.json();
  }

  async createSessionKMConnection(data: KMConnectionCreate): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/session/km/connections`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to create session KM connection');
    }

    return response.json();
  }

  async deleteSessionKMConnection(connectionId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/session/km/connections/${connectionId}`, {
      method: 'DELETE',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      throw new Error('Failed to delete session KM connection');
    }
  }

  async syncSessionKMConnection(connectionId: string): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/session/km/connections/${connectionId}/sync`, {
      method: 'POST',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to sync session KM connection');
    }

    return response.json();
  }

  async testSessionKMConnection(connectionId: string): Promise<KMTestResult> {
    const response = await fetch(`${this.baseURL}/api/session/km/connections/${connectionId}/test`, {
      method: 'POST',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to test session KM connection');
    }

    return response.json();
  }

  async updateSessionKMSelections(connectionId: string, selections: KMSelectionUpdate): Promise<KMConnection> {
    const response = await fetch(`${this.baseURL}/api/session/km/connections/${connectionId}/selections`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(selections)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update session KM selections');
    }

    return response.json();
  }

  async getSessionKMStatus(): Promise<KMStatus & { session_id?: string }> {
    const response = await fetch(`${this.baseURL}/api/session/km/status`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch session KM status');
    }
    return response.json();
  }

  // ==================== Session-Scoped Custom Endpoints ====================

  async listCustomEndpoints(): Promise<CustomEndpoint[]> {
    const response = await fetch(`${this.baseURL}/api/session/endpoints`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch custom endpoints');
    }
    return response.json();
  }

  async createCustomEndpoint(data: CustomEndpointCreate): Promise<CustomEndpoint> {
    const response = await fetch(`${this.baseURL}/api/session/endpoints`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to create custom endpoint');
    }

    return response.json();
  }

  async deleteCustomEndpoint(endpointId: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/api/session/endpoints/${endpointId}`, {
      method: 'DELETE',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      throw new Error('Failed to delete custom endpoint');
    }
  }

  async testCustomEndpoint(endpointId: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${this.baseURL}/api/session/endpoints/${endpointId}/test`, {
      method: 'POST',
      headers: this.getHeaders(false)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to test custom endpoint');
    }

    return response.json();
  }

  // ==================== Session Info ====================

  async getSessionInfo(): Promise<SessionInfo> {
    const response = await fetch(`${this.baseURL}/api/session/info`, {
      headers: this.getHeaders(false)
    });
    if (!response.ok) {
      throw new Error('Failed to fetch session info');
    }
    return response.json();
  }
}

export const apiClient = new JarvisAPIClient();