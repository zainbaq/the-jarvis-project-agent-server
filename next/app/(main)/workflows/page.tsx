'use client';

import { Workflow, Loader2, Sparkles, Zap, Rocket, Code, FileSearch, Globe } from 'lucide-react';
import { useWorkflowAgents } from '@/lib/hooks/use-agents';
import { WorkflowCard } from '@/components/workflows/WorkflowCard';

export default function WorkflowsPage() {
  const { data: agents, isLoading, error } = useWorkflowAgents();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center animate-fadeIn">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl blur-xl opacity-30 dark:opacity-50 animate-pulse" />
            <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 animate-pulse">Loading workflows...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md animate-fadeIn">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-500/30 flex items-center justify-center mb-4">
            <Workflow className="w-10 h-10 text-red-500 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Connection Error</h2>
          <p className="text-gray-600 dark:text-gray-400">
            {error instanceof Error ? error.message : 'Failed to load workflows'}
          </p>
        </div>
      </div>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md animate-fadeIn">
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 rounded-3xl blur-2xl opacity-20 dark:opacity-30" />
            <div className="relative w-full h-full rounded-3xl bg-orange-50 dark:bg-orange-600/20 border border-orange-200 dark:border-orange-500/30 flex items-center justify-center">
              <Workflow className="w-12 h-12 text-orange-500 dark:text-orange-400" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">No Workflows Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No workflow agents are configured. Check your agent configuration to add LangGraph workflows.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 text-orange-600 dark:text-orange-300 text-sm">
            <Sparkles className="w-4 h-4" />
            Workflows enable powerful AI automation
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-auto animate-fadeIn">
      <div className="max-w-4xl mx-auto">
        {/* Animated Header */}
        <div className="mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-amber-500 rounded-2xl blur-lg opacity-30 dark:opacity-50" />
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 shadow-xl shadow-orange-500/20">
                <Rocket className="w-8 h-8 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                AI Workflows
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Powerful automation at your fingertips
              </p>
            </div>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 mt-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 text-purple-600 dark:text-purple-300 text-sm">
              <Code className="w-3.5 h-3.5" />
              Code Generation
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 text-blue-600 dark:text-blue-300 text-sm">
              <Globe className="w-3.5 h-3.5" />
              Web Research
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-300 text-sm">
              <FileSearch className="w-3.5 h-3.5" />
              Document Analysis
            </div>
          </div>
        </div>

        {/* Workflow grid */}
        <div className="grid gap-4">
          {agents.map((agent, index) => (
            <div
              key={agent.agent_id}
              className="animate-slideUp"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <WorkflowCard agent={agent} />
            </div>
          ))}
        </div>

        {/* Bottom tip */}
        <div className="mt-8 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-500/5 dark:to-amber-500/5 border border-orange-100 dark:border-white/5 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Zap className="w-4 h-4 text-yellow-500 dark:text-yellow-400" />
            <span>Tip: Workflows can generate entire projects, analyze documents, and search the web</span>
          </div>
        </div>
      </div>
    </div>
  );
}
