// Chat Page - chat with an agent

import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAgent } from '../hooks/useAgents';
import { useAgentStore } from '../stores/agentStore';
import { ChatInterface } from '../components/chat/ChatInterface';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export function ChatPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const selectedAgentId = useAgentStore((state) => state.selectedAgentId);
  const setSelectedAgent = useAgentStore((state) => state.setSelectedAgent);

  // Use agentId from URL or from store
  const activeAgentId = agentId || selectedAgentId;

  const { data: agent, isLoading, error } = useAgent(activeAgentId);

  useEffect(() => {
    if (activeAgentId && activeAgentId !== selectedAgentId) {
      setSelectedAgent(activeAgentId);
    }
  }, [activeAgentId, selectedAgentId, setSelectedAgent]);

  // If no agent selected, redirect to agents page
  useEffect(() => {
    if (!activeAgentId && !isLoading) {
      navigate('/agents');
    }
  }, [activeAgentId, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error loading agent: {error.message}</p>
        <button
          onClick={() => navigate('/agents')}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          ← Back to agents
        </button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">No agent selected</p>
        <button
          onClick={() => navigate('/agents')}
          className="text-primary-600 hover:text-primary-700 font-medium"
        >
          Select an agent →
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => navigate('/agents')}
          className="text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          ← Back to agents
        </button>
      </div>

      <ChatInterface agentId={agent.agent_id} agentName={agent.name} />
    </div>
  );
}
