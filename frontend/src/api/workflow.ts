// Workflow API functions

import { apiClient } from './client';
import type {
  WorkflowExecuteRequest,
  WorkflowExecuteResponse,
} from '../types/workflow';

// POST /api/agents/{agent_id}/workflow - Execute workflow
export async function executeWorkflow(
  agentId: string,
  request: WorkflowExecuteRequest
): Promise<WorkflowExecuteResponse> {
  const response = await apiClient.post<WorkflowExecuteResponse>(
    `/api/agents/${agentId}/workflow`,
    request
  );
  return response.data;
}
