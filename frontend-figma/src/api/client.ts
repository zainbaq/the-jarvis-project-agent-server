import { Agent, ChatRequest, ChatResponse, WorkflowRequest, WorkflowResponse, DetailedStatus, AgentTestResult, ToolsStatus, ToolsTestResult, KMConnection, KMConnectionCreate, KMConnectionUpdate, KMSelectionUpdate, KMTestResult, KMStatus } from '../types';
import { mockAgents, getMockChatResponse, getMockWorkflowResponse } from './mockData';

// Try 127.0.0.1 instead of localhost (better for browser security policies)
const DEFAULT_BASE_URL = 'http://127.0.0.1:8000';

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jarvis_backend_url') || DEFAULT_BASE_URL;
  }
  return DEFAULT_BASE_URL;
}

function isDemoMode(): boolean {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('jarvis_demo_mode') === 'true';
  }
  return false;
}

export class JarvisAPIClient {
  get baseURL(): string {
    return getBaseUrl();
  }

  async listAgents(filters?: { agent_type?: string; capability?: string }): Promise<Agent[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
      let agents = mockAgents;
      if (filters?.agent_type) {
        agents = agents.filter(a => a.type === filters.agent_type);
      }
      if (filters?.capability) {
        agents = agents.filter(a => a.capabilities.includes(filters.capability));
      }
      return agents;
    }

    const params = new URLSearchParams(filters as any);
    try {
      const response = await fetch(`${this.baseURL}/api/agents${params.toString() ? '?' + params : ''}`);
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
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const agent = mockAgents.find(a => a.agent_id === agentId);
      if (!agent) throw new Error('Agent not found');
      return agent;
    }

    const response = await fetch(`${this.baseURL}/api/agents/${agentId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch agent: ${response.statusText}`);
    }
    return response.json();
  }

  async chat(agentId: string, request: ChatRequest): Promise<ChatResponse> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate AI thinking
      return getMockChatResponse(request.message, agentId);
    }

    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || 'Chat request failed');
    }
    
    return response.json();
  }

  async executeWorkflow(agentId: string, request: WorkflowRequest): Promise<WorkflowResponse> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate workflow execution
      return getMockWorkflowResponse(request.task);
    }

    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || 'Workflow execution failed');
    }
    
    return response.json();
  }

  async deleteConversation(agentId: string, conversationId: string): Promise<void> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return;
    }

    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete conversation');
    }
  }

  async healthCheck(): Promise<{ status: string; version: string; agents_loaded: number; uptime: number }> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        status: 'demo',
        version: '1.0.0-demo',
        agents_loaded: mockAgents.length,
        uptime: 3600
      };
    }

    const response = await fetch(`${this.baseURL}/api/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }

  async getStatus(): Promise<DetailedStatus> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        status: 'demo',
        version: '1.0.0-demo',
        uptime: 3600,
        registry: { initialized: true },
        agents: mockAgents.map(a => ({
          agent_id: a.agent_id,
          name: a.name,
          type: a.type,
          status: a.status
        }))
      };
    }

    const response = await fetch(`${this.baseURL}/api/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch status');
    }
    return response.json();
  }

  async testAgent(agentId: string): Promise<AgentTestResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const agent = mockAgents.find(a => a.agent_id === agentId);
      return {
        success: true,
        message: 'Test successful (demo mode)',
        response_preview: 'Hello! This is a demo connection test.',
        agent_type: agent?.type || 'unknown'
      };
    }

    const response = await fetch(`${this.baseURL}/api/agents/${agentId}/test`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || 'Agent test failed');
    }

    return response.json();
  }

  async getToolsStatus(): Promise<ToolsStatus> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        tools: {
          web_search: true,
          code_generation: true
        },
        web_search_configured: true
      };
    }

    const response = await fetch(`${this.baseURL}/api/agents/tools/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch tools status');
    }
    return response.json();
  }

  async testTools(): Promise<ToolsTestResult> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        success: true,
        results: {
          web_search: { success: true, message: 'Web search functional' }
        }
      };
    }

    const response = await fetch(`${this.baseURL}/api/agents/tools/test`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.detail || 'Tools test failed');
    }

    return response.json();
  }

  // Knowledge Management (KM) API Methods

  async listKMConnections(): Promise<KMConnection[]> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return [];
    }

    const response = await fetch(`${this.baseURL}/api/km/connections`);
    if (!response.ok) {
      throw new Error('Failed to fetch KM connections');
    }
    return response.json();
  }

  async createKMConnection(data: KMConnectionCreate): Promise<KMConnection> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 500));
      throw new Error('KM connections not available in demo mode');
    }

    const response = await fetch(`${this.baseURL}/api/km/connections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to create KM connection');
    }

    return response.json();
  }

  async getKMConnection(connectionId: string): Promise<KMConnection> {
    if (isDemoMode()) {
      throw new Error('KM connections not available in demo mode');
    }

    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch KM connection');
    }
    return response.json();
  }

  async updateKMConnection(connectionId: string, data: KMConnectionUpdate): Promise<KMConnection> {
    if (isDemoMode()) {
      throw new Error('KM connections not available in demo mode');
    }

    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update KM connection');
    }

    return response.json();
  }

  async deleteKMConnection(connectionId: string): Promise<void> {
    if (isDemoMode()) {
      throw new Error('KM connections not available in demo mode');
    }

    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      throw new Error('Failed to delete KM connection');
    }
  }

  async syncKMConnection(connectionId: string): Promise<KMConnection> {
    if (isDemoMode()) {
      throw new Error('KM connections not available in demo mode');
    }

    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}/sync`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to sync KM connection');
    }

    return response.json();
  }

  async testKMConnection(connectionId: string): Promise<KMTestResult> {
    if (isDemoMode()) {
      throw new Error('KM connections not available in demo mode');
    }

    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}/test`, {
      method: 'POST'
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to test KM connection');
    }

    return response.json();
  }

  async updateKMSelections(connectionId: string, selections: KMSelectionUpdate): Promise<KMConnection> {
    if (isDemoMode()) {
      throw new Error('KM connections not available in demo mode');
    }

    const response = await fetch(`${this.baseURL}/api/km/connections/${connectionId}/selections`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selections)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || 'Failed to update KM selections');
    }

    return response.json();
  }

  async getKMStatus(): Promise<KMStatus> {
    if (isDemoMode()) {
      await new Promise(resolve => setTimeout(resolve, 300));
      return {
        km_server_url: 'http://localhost:11000',
        total_connections: 0,
        active_connections: 0,
        connections_with_selections: 0,
        is_configured: false
      };
    }

    const response = await fetch(`${this.baseURL}/api/km/status`);
    if (!response.ok) {
      throw new Error('Failed to fetch KM status');
    }
    return response.json();
  }
}

export const apiClient = new JarvisAPIClient();