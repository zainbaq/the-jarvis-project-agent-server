import React, { useState } from 'react';
import { Agent, WorkflowResponse } from '../types';
import { apiClient } from '../api/client';
import { Play, Loader, CheckCircle, XCircle, FileCode, ChevronRight, ChevronDown } from 'lucide-react';
import { spacing, components } from '../styles/theme';
import { cn } from '@/components/ui/utils';

interface WorkflowPanelProps {
  agent: Agent;
}

export function WorkflowPanel({ agent }: WorkflowPanelProps) {
  const [task, setTask] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WorkflowResponse | null>(null);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const handleExecute = async () => {
    if (!task.trim() || loading) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await apiClient.executeWorkflow(agent.agent_id, {
        task,
        parameters: {
          recursion_limit: 100,
          temperature: 0.0
        }
      });
      setResult(response);
    } catch (error) {
      setResult({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Workflow execution failed'
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleFile = (filename: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(filename)) {
      newExpanded.delete(filename);
    } else {
      newExpanded.add(filename);
    }
    setExpandedFiles(newExpanded);
  };

  const renderCodebase = (codebase: Record<string, string>) => {
    return (
      <div className="space-y-2">
        {Object.entries(codebase).map(([filename, content]) => (
          <div key={filename} className="card overflow-hidden">
            <button
              onClick={() => toggleFile(filename)}
              className="w-full flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-left transition-all"
            >
              {expandedFiles.has(filename) ? (
                <ChevronDown className="w-4 h-4 text-indigo-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
              <FileCode className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-white">{filename}</span>
            </button>
            {expandedFiles.has(filename) && (
              <div className="p-4 bg-black/40 border-t border-white/10">
                <pre className="text-xs text-gray-300 overflow-x-auto">
                  <code>{content}</code>
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Input Section */}
      <div className={cn('border-b border-white/10', spacing.workflowHeader)}>
        <div className="w-full flex justify-center px-6">
          <div className={cn('w-full max-w-2xl flex flex-col', spacing.workflowSection)}>
            <h3 className="text-xl text-white text-center">Execute Workflow</h3>
            <div className={cn('flex flex-col', spacing.workflowGroup)}>
              <div className={cn('flex flex-col', spacing.workflowCompact)}>
                <label className="block text-sm text-gray-300 text-center">
                  Task Description
                </label>
                <textarea
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  placeholder="Describe the workflow task (e.g., 'Create a FastAPI todo app with CRUD operations')"
                  rows={4}
                  disabled={loading}
                  className="w-full px-4 py-3 bg-purple-900/20 border border-purple-500/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 resize-none transition-all"
                />
              </div>
              <button
                onClick={handleExecute}
                disabled={!task.trim() || loading}
                className="w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Executing Workflow...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Execute Workflow</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="flex-1 overflow-y-auto py-12">
        <div className="w-full flex justify-center px-6">
          <div className="w-full max-w-2xl">
            {result && (
              <div className="space-y-6">
                {/* Status */}
                <div className={cn(
                  'p-4 rounded-xl border',
                  result.status === 'completed'
                    ? components.workflowStatus.completed
                    : result.status === 'failed'
                    ? components.workflowStatus.failed
                    : components.workflowStatus.running
                )}>
                  <div className="flex items-center gap-3">
                    {result.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : result.status === 'failed' ? (
                      <XCircle className="w-5 h-5 text-red-400" />
                    ) : (
                      <Loader className="w-5 h-5 text-blue-400 animate-spin" />
                    )}
                    <span className="text-sm">
                      Status: {result.status}
                    </span>
                    {result.execution_time && (
                      <span className="ml-auto text-sm text-gray-400">
                        {result.execution_time.toFixed(2)}s
                      </span>
                    )}
                  </div>
                </div>

                {/* Error */}
                {result.error && (
                  <div className="card p-4 border-red-500/30 bg-red-500/10">
                    <p className="text-sm text-red-300">{result.error}</p>
                  </div>
                )}

                {/* Results */}
                {result.result && (
                  <div className="space-y-4">
                    {result.result.codebase && (
                      <div>
                        <h4 className="text-white mb-3 flex items-center gap-2">
                          <FileCode className="w-5 h-5 text-purple-400" />
                          Generated Codebase
                        </h4>
                        {renderCodebase(result.result.codebase)}
                      </div>
                    )}

                    {result.result.documentation && (
                      <div>
                        <h4 className="text-white mb-3 flex items-center gap-2">
                          <FileCode className="w-5 h-5 text-blue-400" />
                          Documentation
                        </h4>
                        {renderCodebase(result.result.documentation)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}