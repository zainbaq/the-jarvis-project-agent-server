import React, { useEffect, useState } from 'react';
import { Agent } from '../types';
import { apiClient } from '../api/client';
import { Bot, X, Menu, Zap, Code, Globe, Sparkles } from 'lucide-react';
import { ConnectionStatus } from './ConnectionStatus';
import { BackendConfig } from './BackendConfig';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  selectedAgent: Agent | null;
  onSelectAgent: (agent: Agent) => void;
}

export function Sidebar({ isOpen, onToggle, selectedAgent, onSelectAgent }: SidebarProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
    
    // Listen for storage changes (when demo mode is toggled)
    const handleStorageChange = () => {
      loadAgents();
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.listAgents();
      setAgents(data);
      
      // Select first agent by default
      if (data.length > 0 && !selectedAgent) {
        onSelectAgent(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
    } finally {
      setLoading(false);
    }
  };

  const getAgentIcon = (type: string) => {
    switch (type) {
      case 'langgraph':
        return <Code className="w-5 h-5" />;
      case 'endpoint':
        return <Globe className="w-5 h-5" />;
      default:
        return <Bot className="w-5 h-5" />;
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-6 left-6 z-50 p-3 glass-strong rounded-xl hover:bg-white/10 transition-all shadow-lg flex items-center justify-center"
      >
        <Menu className="w-6 h-6 text-white" />
      </button>
    );
  }

  return (
    <div className="w-80 glass-strong flex flex-col border-r border-white/10 shadow-2xl">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg gradient-text">Jarvis AI</h1>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>
        <p className="text-xs text-gray-400 ml-11">Your AI Agent Platform</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          <ConnectionStatus />
          
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3 px-2">
              <h2 className="text-xs text-gray-400 uppercase tracking-wider">Agents</h2>
              <button
                onClick={loadAgents}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Refresh
              </button>
            </div>

            {loading && (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-white/5 rounded w-1/2" />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="card p-4 border-red-500/30 bg-red-500/10">
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {!loading && !error && agents.length === 0 && (
              <div className="card p-8 text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 text-gray-500" />
                <p className="text-sm text-gray-400">No agents available</p>
              </div>
            )}

            <div className="space-y-2">
              {agents.map((agent) => (
                <button
                  key={agent.agent_id}
                  onClick={() => onSelectAgent(agent)}
                  className={`w-full text-left card p-4 transition-all ${
                    selectedAgent?.agent_id === agent.agent_id
                      ? 'bg-gradient-to-br from-indigo-600/30 to-purple-600/30 border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                      : 'hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 ${
                      selectedAgent?.agent_id === agent.agent_id
                        ? 'bg-indigo-500/30 text-indigo-300'
                        : 'bg-white/5 text-gray-400'
                    }`}>
                      {getAgentIcon(agent.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm text-white mb-1 truncate">{agent.name}</h3>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-2">
                        {agent.description}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-gray-300">
                          {agent.type}
                        </span>
                        {agent.capabilities.includes('workflow') && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                            workflow
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      {selectedAgent && (
        <div className="p-4 border-t border-white/10 glass">
          <h3 className="text-xs text-gray-400 uppercase tracking-wider mb-3 px-2">Current Agent</h3>
          <div className="space-y-2 text-xs px-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Type:</span>
              <span className="text-white">{selectedAgent.type}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Model:</span>
              <span className="text-white truncate ml-2">{selectedAgent.config?.model || 'N/A'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Status:</span>
              <span className="text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                {selectedAgent.status}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-white/10">
        <BackendConfig onUrlChange={() => {}} />
      </div>
    </div>
  );
}