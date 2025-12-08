// Agent List - displays grid of agent cards

import { useAgents } from '../../hooks/useAgents';
import { AgentCard } from './AgentCard';
import { LoadingSpinner } from '../common/LoadingSpinner';

export function AgentList() {
  const { data: agents, isLoading, error } = useAgents();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error loading agents: {error.message}</p>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No agents available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard key={agent.agent_id} agent={agent} />
      ))}
    </div>
  );
}
