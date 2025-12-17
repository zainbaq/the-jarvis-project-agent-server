import React, { useState, useEffect } from 'react';
import { Agent } from '../types';
import { WorkflowPanel } from './WorkflowPanel';
import { Workflow, ChevronDown, Zap } from 'lucide-react';
import { spacing } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import { useDropdown } from '../hooks/useDropdown';

interface WorkflowsTabProps {
  agents: Agent[];
}

export function WorkflowsTab({ agents }: WorkflowsTabProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Use consolidated dropdown hook for click-outside handling
  const { isOpen: showAgentDropdown, toggle: toggleDropdown, close: closeDropdown, dropdownRef } = useDropdown();

  // Filter workflow agents (LangGraph agents or agents with workflow capability)
  const workflowAgents = agents.filter(
    agent => agent.type === 'langgraph' || agent.capabilities.includes('workflow')
  );

  useEffect(() => {
    // Select first workflow agent by default
    if (workflowAgents.length > 0 && !selectedAgent) {
      setSelectedAgent(workflowAgents[0]);
    }
  }, [workflowAgents.length, selectedAgent]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Workflow Agent Selection Header */}
      <div className={cn('border-b border-white/10', spacing.workflowHeader)}>
        <div className="w-full flex justify-center px-6">
          <div className={cn('w-full max-w-2xl flex flex-col', spacing.workflowSection)}>
            <div className={cn('flex flex-col', spacing.workflowItem)}>
              <label className="block text-sm text-gray-300 text-center">Workflow Agent</label>
              
              {/* Agent Dropdown */}
              <div className="relative w-full" ref={dropdownRef}>
                <button
                  onClick={toggleDropdown}
                  className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white hover:bg-purple-900/30 transition-all flex items-center justify-between"
                >
                  {selectedAgent ? (
                    <div className="flex items-center gap-3">
                      <Workflow className="w-4 h-4 text-purple-400" />
                      <div className="text-left">
                        <div className="text-sm">{selectedAgent.name}</div>
                        <div className="text-xs text-gray-400">{selectedAgent.type}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">Select a workflow</span>
                  )}
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showAgentDropdown && (
                  <div className="absolute top-full mt-2 w-full bg-[#1a0f2e] border border-purple-500/30 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                    <div className="p-2">
                      {workflowAgents.map((agent) => (
                        <button
                          key={agent.agent_id}
                          onClick={() => {
                            setSelectedAgent(agent);
                            closeDropdown();
                          }}
                          className={cn(
                            'w-full text-left px-4 py-3 rounded-lg transition-all',
                            selectedAgent?.agent_id === agent.agent_id
                              ? 'bg-purple-600/30 border border-purple-500/50'
                              : 'hover:bg-purple-900/30'
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <Workflow className="w-4 h-4 text-purple-400 mt-1" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm text-white mb-1">{agent.name}</div>
                              <div className="text-xs text-gray-400 mb-2 line-clamp-2">
                                {agent.description}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                                  {agent.type}
                                </span>
                                {agent.capabilities.map((cap) => (
                                  <span
                                    key={cap}
                                    className="text-xs px-2 py-0.5 rounded-full bg-purple-900/30 text-gray-300"
                                  >
                                    {cap}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            {selectedAgent && (
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-lg justify-center">
                <Zap className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-purple-300">Specialized Task Agent</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Content */}
      {!selectedAgent ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 flex items-center justify-center border border-white/10">
              <Workflow className="w-12 h-12 text-purple-400" />
            </div>
            <h2 className="text-2xl text-white mb-4">Select a Workflow Agent</h2>
            <p className="text-gray-400 leading-relaxed mb-6">
              Workflow agents are specialized for specific tasks like code generation, data analysis, and complex multi-step operations
            </p>
            {workflowAgents.length === 0 && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <p className="text-sm text-yellow-300">
                  No workflow agents available. Make sure your backend is connected and has LangGraph agents configured.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <WorkflowPanel agent={selectedAgent} />
      )}
    </div>
  );
}