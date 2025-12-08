// Agent Card - displays a single agent
// Similar to a component in a list view

import { Link } from 'react-router-dom';
import type { AgentInfo } from '../../types/agent';
import { cn } from '../../lib/utils';

interface AgentCardProps {
  agent: AgentInfo;
  onClick?: () => void;
}

export function AgentCard({ agent, onClick }: AgentCardProps) {
  const typeColors = {
    openai: 'bg-blue-100 text-blue-800',
    endpoint: 'bg-purple-100 text-purple-800',
    langgraph: 'bg-green-100 text-green-800',
  };

  const statusColors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-400',
  };

  const hasWorkflowCapability = agent.capabilities.includes('workflow');
  const chatLink = `/chat/${agent.agent_id}`;

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {agent.name}
          </h3>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-xs font-medium px-2 py-1 rounded',
                typeColors[agent.type]
              )}
            >
              {agent.type}
            </span>
            <div className="flex items-center gap-1">
              <div
                className={cn('w-2 h-2 rounded-full', statusColors[agent.status])}
              />
              <span className="text-xs text-gray-500">{agent.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {agent.description}
      </p>

      {/* Capabilities */}
      <div className="flex flex-wrap gap-1 mb-4">
        {agent.capabilities.slice(0, 3).map((cap) => (
          <span
            key={cap}
            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded"
          >
            {cap}
          </span>
        ))}
        {agent.capabilities.length > 3 && (
          <span className="text-xs text-gray-500">
            +{agent.capabilities.length - 3} more
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Link
          to={chatLink}
          className="flex-1 text-center bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 transition-colors"
          onClick={(e) => e.stopPropagation()}
        >
          {hasWorkflowCapability ? 'Execute' : 'Chat'}
        </Link>
      </div>
    </div>
  );
}
