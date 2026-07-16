'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { WorkflowRequest, WorkflowResponse, WorkflowProgress } from '@/lib/api/types';

export function useWorkflow(agentId: string) {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  // Execute workflow mutation
  const executeMutation = useMutation({
    mutationFn: async (request: Omit<WorkflowRequest, 'task_id'>) => {
      const newTaskId = `task_${Date.now()}`;
      setTaskId(newTaskId);
      setIsPolling(true);

      const response = await apiClient.executeWorkflow(agentId, {
        ...request,
        task_id: newTaskId,
      });

      return response;
    },
    onSettled: () => {
      setIsPolling(false);
    },
  });

  // Progress polling
  const { data: progress, refetch: refetchProgress } = useQuery({
    queryKey: ['workflow-progress', taskId],
    queryFn: () => apiClient.getWorkflowProgress(taskId!),
    enabled: !!taskId && isPolling,
    refetchInterval: isPolling ? 2000 : false,
  });

  // Stop polling when workflow completes
  useEffect(() => {
    if (progress?.status === 'completed' || progress?.status === 'failed') {
      setIsPolling(false);
    }
  }, [progress?.status]);

  const reset = useCallback(() => {
    setTaskId(null);
    setIsPolling(false);
    executeMutation.reset();
  }, [executeMutation]);

  return {
    execute: executeMutation.mutate,
    isExecuting: executeMutation.isPending || isPolling,
    result: executeMutation.data,
    error: executeMutation.error,
    progress,
    taskId,
    reset,
  };
}
