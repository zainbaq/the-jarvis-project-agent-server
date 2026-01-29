'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import { useKMStore } from '@/lib/store/km-store';
import type { KMConnectionCreate } from '@/lib/api/types';

export function useKMConnections() {
  const queryClient = useQueryClient();
  const { setConnections, setLoading, setError } = useKMStore();

  const query = useQuery({
    queryKey: ['km-connections'],
    queryFn: async () => {
      const connections = await apiClient.listKMConnections();
      setConnections(connections);
      return connections;
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const createMutation = useMutation({
    mutationFn: (data: KMConnectionCreate) => apiClient.createKMConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['km-connections'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (connectionId: string) => apiClient.deleteKMConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['km-connections'] });
    },
  });

  const syncMutation = useMutation({
    mutationFn: (connectionId: string) => apiClient.syncKMConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['km-connections'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (connectionId: string) => apiClient.testKMConnection(connectionId),
  });

  return {
    connections: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    createConnection: createMutation.mutate,
    isCreating: createMutation.isPending,
    deleteConnection: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
    syncConnection: syncMutation.mutate,
    isSyncing: syncMutation.isPending,
    testConnection: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
  };
}
