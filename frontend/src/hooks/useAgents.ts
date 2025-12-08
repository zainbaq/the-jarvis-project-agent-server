// Custom hook for fetching agents
// Think of React Query like automatic caching for your API calls
// Similar to @lru_cache in Python but for async API calls

import { useQuery } from '@tanstack/react-query';
import { listAgents, getAgent } from '../api/agents';

// Hook to fetch all agents
export function useAgents(filters?: { agent_type?: string; capability?: string }) {
  return useQuery({
    queryKey: ['agents', filters],
    queryFn: () => listAgents(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
    gcTime: 10 * 60 * 1000, // 10 minutes - cache time
  });
}

// Hook to fetch single agent
export function useAgent(agentId: string | null) {
  return useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => getAgent(agentId!),
    enabled: !!agentId, // Only run if agentId exists
    staleTime: 5 * 60 * 1000,
  });
}
