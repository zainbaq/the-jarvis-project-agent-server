// Chat API functions

import { apiClient } from './client';
import type { ChatRequest, ChatResponse } from '../types/chat';

// POST /api/agents/{agent_id}/chat - Send message to agent
// Python equivalent:
// response = requests.post(
//     f'{base_url}/api/agents/{agent_id}/chat',
//     json={'message': 'Hello!'}
// )
export async function sendMessage(
  agentId: string,
  request: ChatRequest
): Promise<ChatResponse> {
  const response = await apiClient.post<ChatResponse>(
    `/api/agents/${agentId}/chat`,
    request
  );
  return response.data;
}
