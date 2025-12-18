import React, { useState, useEffect } from 'react';
import { Agent } from '../types';
import { WorkflowPanel } from './WorkflowPanel';
import { Workflow, Zap, ChevronRight } from 'lucide-react';
import { cn } from '@/components/ui/utils';

interface WorkflowsTabProps {
  agents: Agent[];
}

export function WorkflowsTab({ agents }: WorkflowsTabProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

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
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar - Workflow Agent Selection */}
      <div className="border-r border-white/10 flex flex-col bg-black/20" style={{ width: '300px' }}>
        {/* Sidebar Header */}
        <div className="border-b border-white/10" style={{ padding: '24px' }}>
          <h2 className="text-sm font-medium text-white flex items-center" style={{ gap: '10px' }}>
            <Workflow className="w-4 h-4 text-purple-400" />
            Workflow Agents
          </h2>
          <p className="text-xs text-gray-400" style={{ marginTop: '8px' }}>
            Select a workflow to execute
          </p>
        </div>

        {/* Agent List */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '16px' }}>
          {workflowAgents.length === 0 ? (
            <div className="text-center" style={{ padding: '32px' }}>
              <div className="mx-auto rounded-xl bg-purple-500/20 flex items-center justify-center" style={{ width: '56px', height: '56px', marginBottom: '20px' }}>
                <Workflow className="w-6 h-6 text-purple-400" />
              </div>
              <p className="text-sm text-gray-400">
                No workflow agents available
              </p>
              <p className="text-xs text-gray-500" style={{ marginTop: '12px' }}>
                Make sure your backend has LangGraph agents configured
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {workflowAgents.map((agent) => (
                <button
                  key={agent.agent_id}
                  onClick={() => setSelectedAgent(agent)}
                  className={cn(
                    'w-full text-left rounded-xl transition-all group',
                    selectedAgent?.agent_id === agent.agent_id
                      ? 'bg-purple-600/30 border border-purple-500/50'
                      : 'hover:bg-white/5 border border-transparent'
                  )}
                  style={{ padding: '16px 18px' }}
                >
                  <div className="flex items-start" style={{ gap: '14px' }}>
                    <div className={cn(
                      'rounded-lg flex items-center justify-center flex-shrink-0',
                      selectedAgent?.agent_id === agent.agent_id
                        ? 'bg-purple-500/30'
                        : 'bg-white/5 group-hover:bg-white/10'
                    )} style={{ width: '40px', height: '40px' }}>
                      <Workflow className={cn(
                        'w-4 h-4',
                        selectedAgent?.agent_id === agent.agent_id
                          ? 'text-purple-300'
                          : 'text-gray-400'
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center" style={{ gap: '10px' }}>
                        <span className={cn(
                          'text-sm font-medium truncate',
                          selectedAgent?.agent_id === agent.agent_id
                            ? 'text-white'
                            : 'text-gray-300'
                        )}>
                          {agent.name}
                        </span>
                        {selectedAgent?.agent_id === agent.agent_id && (
                          <ChevronRight className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2" style={{ marginTop: '6px' }}>
                        {agent.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        {selectedAgent && (
          <div className="border-t border-white/10" style={{ padding: '18px' }}>
            <div className="flex items-center bg-purple-500/10 border border-purple-500/20 rounded-lg" style={{ gap: '10px', padding: '12px 16px' }}>
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-purple-300">Specialized Task Agent</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Content - Workflow Panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedAgent ? (
          <div className="flex-1 flex items-center justify-center" style={{ padding: '40px' }}>
            <div className="text-center" style={{ maxWidth: '420px' }}>
              <div className="mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-indigo-600/20 flex items-center justify-center border border-white/10" style={{ width: '100px', height: '100px', marginBottom: '28px' }}>
                <Workflow className="text-purple-400" style={{ width: '48px', height: '48px' }} />
              </div>
              <h2 className="text-2xl text-white" style={{ marginBottom: '16px' }}>Select a Workflow Agent</h2>
              <p className="text-gray-400 leading-relaxed">
                Choose a workflow from the sidebar to start executing specialized tasks like code generation or document processing
              </p>
            </div>
          </div>
        ) : (
          <WorkflowPanel agent={selectedAgent} />
        )}
      </div>
    </div>
  );
}
