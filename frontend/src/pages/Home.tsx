// Home Page - landing page with quick actions

import { Link } from 'react-router-dom';
import { useAgents } from '../hooks/useAgents';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function Home() {
  const { data: agents, isLoading } = useAgents();

  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to Jarvis Agent Server
        </h1>
        <p className="text-lg text-gray-600">
          Interact with multiple AI agents for chat, code generation, and more
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-primary-600 mb-2">
            {isLoading ? '-' : agents?.length || 0}
          </div>
          <div className="text-gray-600">Agents Available</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-primary-600 mb-2">
            {isLoading ? '-' : agents?.filter((a) => a.type === 'langgraph').length || 0}
          </div>
          <div className="text-gray-600">Workflow Agents</div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-3xl font-bold text-primary-600 mb-2">
            {isLoading ? '-' : agents?.filter((a) => a.capabilities.includes('chat')).length || 0}
          </div>
          <div className="text-gray-600">Chat Agents</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/chat"
            className="flex items-center justify-center bg-primary-600 text-white px-6 py-4 rounded-lg font-medium hover:bg-primary-700 transition-colors"
          >
            Start New Chat
          </Link>
          <Link
            to="/agents"
            className="flex items-center justify-center bg-white text-primary-600 border-2 border-primary-600 px-6 py-4 rounded-lg font-medium hover:bg-primary-50 transition-colors"
          >
            Browse All Agents
          </Link>
        </div>
      </div>

      {/* Agent List Preview */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        agents && agents.length > 0 && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-semibold text-gray-900">
                Available Agents
              </h2>
              <Link
                to="/agents"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.slice(0, 4).map((agent) => (
                <Link
                  key={agent.agent_id}
                  to={`/chat/${agent.agent_id}`}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {agent.description}
                  </p>
                  <div className="mt-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                      {agent.type}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
