// Custom hook for KM connections
// Combines React Query for API calls with Zustand store for state

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useKMConnectionStore } from '../stores/kmConnectionStore';
import * as kmApi from '../api/km';
import type { KMConnectionCreate, KMConnectionUpdate, KMSelectionUpdate } from '../types/km';

// Main hook for KM connections
export function useKMConnections() {
  const queryClient = useQueryClient();
  const store = useKMConnectionStore();

  // Fetch connections from backend
  const { data: connections, isLoading, error, refetch } = useQuery({
    queryKey: ['km-connections'],
    queryFn: kmApi.listConnections,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update store when connections change
  if (connections && connections !== store.connections) {
    store.setConnections(connections);
  }

  // Create connection mutation
  const createMutation = useMutation({
    mutationFn: kmApi.createConnection,
    onSuccess: (newConnection) => {
      store.addConnection(newConnection);
      queryClient.invalidateQueries({ queryKey: ['km-connections'] });
    },
  });

  // Update connection mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: KMConnectionUpdate }) =>
      kmApi.updateConnection(id, data),
    onSuccess: (updatedConnection) => {
      store.updateConnection(updatedConnection.id, updatedConnection);
      queryClient.invalidateQueries({ queryKey: ['km-connections'] });
    },
  });

  // Delete connection mutation
  const deleteMutation = useMutation({
    mutationFn: kmApi.deleteConnection,
    onSuccess: (_, connectionId) => {
      store.removeConnection(connectionId);
      queryClient.invalidateQueries({ queryKey: ['km-connections'] });
    },
  });

  // Sync connection mutation
  const syncMutation = useMutation({
    mutationFn: kmApi.syncConnection,
    onSuccess: (updatedConnection) => {
      store.updateConnection(updatedConnection.id, updatedConnection);
      queryClient.invalidateQueries({ queryKey: ['km-connections'] });
    },
  });

  // Test connection mutation
  const testMutation = useMutation({
    mutationFn: kmApi.testConnection,
  });

  // Update selections mutation
  const updateSelectionsMutation = useMutation({
    mutationFn: ({ id, selections }: { id: string; selections: KMSelectionUpdate }) =>
      kmApi.updateSelections(id, selections),
    onSuccess: (updatedConnection) => {
      store.updateConnection(updatedConnection.id, updatedConnection);
      queryClient.invalidateQueries({ queryKey: ['km-connections'] });
    },
  });

  return {
    // Connection data
    connections: store.connections,
    isLoading,
    error: error?.message || store.error,
    refetch,

    // Search settings
    searchSettings: store.searchSettings,
    isKMEnabled: store.searchSettings.enabled,
    activeConnectionIds: store.searchSettings.activeConnectionIds,

    // Search settings actions
    setKMEnabled: store.setKMEnabled,
    toggleConnectionActive: store.toggleConnectionActive,
    setActiveConnections: store.setActiveConnections,

    // Connection mutations
    createConnection: createMutation.mutateAsync,
    updateConnection: (id: string, data: KMConnectionUpdate) =>
      updateMutation.mutateAsync({ id, data }),
    deleteConnection: deleteMutation.mutateAsync,
    syncConnection: syncMutation.mutateAsync,
    testConnection: testMutation.mutateAsync,
    updateSelections: (id: string, selections: KMSelectionUpdate) =>
      updateSelectionsMutation.mutateAsync({ id, selections }),

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSyncing: syncMutation.isPending,
    isTesting: testMutation.isPending,

    // Helpers
    getActiveConnections: store.getActiveConnections,
    hasActiveConnectionsWithSelections: store.hasActiveConnectionsWithSelections,

    // Get connection IDs for chat request
    getEnabledConnectionIds: () => {
      if (!store.searchSettings.enabled) return undefined;
      const activeIds = store.searchSettings.activeConnectionIds;
      if (activeIds.length === 0) return undefined;
      return activeIds;
    },
  };
}

// Hook for KM status
export function useKMStatus() {
  return useQuery({
    queryKey: ['km-status'],
    queryFn: kmApi.getStatus,
    staleTime: 30 * 1000,
  });
}
