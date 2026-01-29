'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAgent } from '@/lib/hooks/use-agents';
import { WorkflowPanel } from '@/components/workflows/WorkflowPanel';

export default function WorkflowDetailPage({
  params,
}: {
  params: { agentId: string };
}) {
  const { agentId } = params;
  const { data: agent, isLoading, error } = useAgent(agentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading workflow...</span>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-center">
          <div className="text-red-500 dark:text-red-400 mb-2">Workflow not found</div>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            The requested workflow agent does not exist.
          </p>
        </div>
        <Link
          href="/workflows"
          className="flex items-center gap-2 text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workflows
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Workflow panel */}
      <WorkflowPanel agent={agent} />
    </div>
  );
}
