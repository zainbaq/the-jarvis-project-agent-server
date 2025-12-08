// Agent API functions
// Similar to how you'd make API calls with requests in Python

import { apiClient } from './client';
import type { AgentInfo } from '../types/agent';
import type { HealthResponse } from '../types/common';

// GET /api/agents/ - List all agents (note trailing slash for FastAPI)
// Python equivalent: response = requests.get(f'{base_url}/api/agents/')
export async function listAgents(filters?: {
  agent_type?: string;
  capability?: string;
}): Promise<AgentInfo[]> {
  const params = new URLSearchParams();
  if (filters?.agent_type) params.append('agent_type', filters.agent_type);
  if (filters?.capability) params.append('capability', filters.capability);

  const response = await apiClient.get<AgentInfo[]>('/api/agents/', { params });
  return response.data;
}

// GET /api/agents/{agent_id} - Get single agent
export async function getAgent(agentId: string): Promise<AgentInfo> {
  const response = await apiClient.get<AgentInfo>(`/api/agents/${agentId}`);
  return response.data;
}

// DELETE /api/agents/{agent_id}/conversations/{conversation_id}
export async function deleteConversation(
  agentId: string,
  conversationId: string
): Promise<void> {
  await apiClient.delete(`/api/agents/${agentId}/conversations/${conversationId}`);
}

// POST /api/agents/{agent_id}/test - Test agent connection
export async function testAgent(agentId: string): Promise<{
  success: boolean;
  message: string;
  response_preview?: string;
  agent_type?: string;
}> {
  const response = await apiClient.post(`/api/agents/${agentId}/test`);
  return response.data;
}

// GET /api/health - Health check
export async function healthCheck(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/api/health');
  return response.data;
}

// GET /api/status - Detailed status
export async function getStatus(): Promise<any> {
  const response = await apiClient.get('/api/status');
  return response.data;
}
