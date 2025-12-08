// Agents Page - browse all agents

import { AgentList } from '../components/agents/AgentList';

export function AgentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Agents</h1>
        <p className="text-gray-600">
          Browse and interact with all available AI agents
        </p>
      </div>

      <AgentList />
    </div>
  );
}
