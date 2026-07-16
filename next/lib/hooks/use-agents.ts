'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { Agent } from '@/lib/api/types';

export function useAgents(filters?: {
  agent_type?: string;
  capability?: string;
  include_custom?: boolean;
}) {
  return useQuery({
    queryKey: ['agents', filters],
    queryFn: () => apiClient.listAgents(filters),
    staleTime: 60 * 1000, // 1 minute
  });
}

export function useAgent(agentId: string | null) {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => apiClient.getAgent(agentId!),
    enabled: !!agentId,
    staleTime: 60 * 1000,
  });
}

export function useChatAgents() {
  return useAgents({ capability: 'chat', include_custom: true });
}

export function useWorkflowAgents() {
  return useAgents({ capability: 'workflow' });
}

export function useAgentTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agentId: string) => apiClient.testAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });
}
