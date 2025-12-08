// Custom hook for workflow execution

import { useMutation } from '@tanstack/react-query';
import { executeWorkflow } from '../api/workflow';
import type { WorkflowExecuteRequest } from '../types/workflow';
import toast from 'react-hot-toast';

export function useWorkflow(agentId: string) {
  const mutation = useMutation({
    mutationFn: (request: WorkflowExecuteRequest) =>
      executeWorkflow(agentId, request),
    onSuccess: (data) => {
      if (data.status === 'completed') {
        toast.success('Workflow completed successfully!');
      } else {
        toast.error(`Workflow failed: ${data.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`Workflow error: ${error.message}`);
    },
  });

  return {
    executeWorkflow: mutation.mutate,
    isExecuting: mutation.isPending,
    result: mutation.data,
    error: mutation.error,
    reset: mutation.reset,
  };
}
