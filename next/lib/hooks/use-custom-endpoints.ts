'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import type { CustomEndpointCreate } from '@/lib/api/types';

export function useCustomEndpoints() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['custom-endpoints'],
    queryFn: () => apiClient.listCustomEndpoints(),
    staleTime: 30 * 1000,
  });

  const createMutation = useMutation({
    mutationFn: (data: CustomEndpointCreate) => apiClient.createCustomEndpoint(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (endpointId: string) => apiClient.deleteCustomEndpoint(endpointId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-endpoints'] });
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (endpointId: string) => apiClient.testCustomEndpoint(endpointId),
  });

  return {
    endpoints: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createEndpoint: createMutation.mutate,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    deleteEndpoint: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    testEndpoint: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
  };
}
