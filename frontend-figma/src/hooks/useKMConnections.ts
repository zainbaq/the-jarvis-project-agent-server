// Custom hook for KM connections management
// Uses React state with localStorage persistence for settings

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type {
  KMConnection,
  KMConnectionCreate,
  KMConnectionUpdate,
  KMSelectionUpdate,
  KMSearchSettings
} from '../types';

const KM_SETTINGS_KEY = 'jarvis_km_settings';

function loadSettings(): KMSearchSettings {
  if (typeof window === 'undefined') {
    return { enabled: false, activeConnectionIds: [] };
  }
  try {
    const stored = localStorage.getItem(KM_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load KM settings:', e);
  }
  return { enabled: false, activeConnectionIds: [] };
}

function saveSettings(settings: KMSearchSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(KM_SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save KM settings:', e);
  }
}

export function useKMConnections() {
  const [connections, setConnections] = useState<KMConnection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchSettings, setSearchSettings] = useState<KMSearchSettings>(loadSettings);
  const [kmServerUrl, setKmServerUrl] = useState<string | null>(null);

  // Mutation loading states
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Fetch connections and status on mount
  const fetchConnections = useCallback(async () => {
    console.log('[KM DEBUG] Fetching connections...');
    setIsLoading(true);
    setError(null);
    try {
      const [data, status] = await Promise.all([
        apiClient.listKMConnections(),
        apiClient.getKMStatus()
      ]);
      console.log('[KM DEBUG] Connections fetched:', data);
      console.log('[KM DEBUG] KM Status:', status);
      setConnections(data);
      setKmServerUrl(status.km_server_url);
    } catch (e) {
      console.error('[KM DEBUG] Error fetching connections:', e);
      setError(e instanceof Error ? e.message : 'Failed to fetch connections');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  // Persist settings when they change
  useEffect(() => {
    console.log('[KM DEBUG] Saving settings:', searchSettings);
    saveSettings(searchSettings);
  }, [searchSettings]);

  // Debug logging for state changes
  useEffect(() => {
    console.log('[KM DEBUG] Current state:');
    console.log('[KM DEBUG]   - connections:', connections.length);
    console.log('[KM DEBUG]   - isKMEnabled:', searchSettings.enabled);
    console.log('[KM DEBUG]   - activeConnectionIds:', searchSettings.activeConnectionIds);
  }, [connections, searchSettings]);

  // Create connection
  const createConnection = useCallback(async (data: KMConnectionCreate): Promise<KMConnection> => {
    setIsCreating(true);
    try {
      const newConnection = await apiClient.createKMConnection(data);
      setConnections(prev => [...prev, newConnection]);
      return newConnection;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Update connection
  const updateConnection = useCallback(async (id: string, data: KMConnectionUpdate): Promise<KMConnection> => {
    setIsUpdating(true);
    try {
      const updated = await apiClient.updateKMConnection(id, data);
      setConnections(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Delete connection
  const deleteConnection = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    try {
      await apiClient.deleteKMConnection(id);
      setConnections(prev => prev.filter(c => c.id !== id));
      // Remove from active connections if it was active
      setSearchSettings(prev => ({
        ...prev,
        activeConnectionIds: prev.activeConnectionIds.filter(cid => cid !== id)
      }));
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Sync connection
  const syncConnection = useCallback(async (id: string): Promise<KMConnection> => {
    setIsSyncing(true);
    try {
      const updated = await apiClient.syncKMConnection(id);
      setConnections(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Test connection
  const testConnection = useCallback(async (id: string) => {
    setIsTesting(true);
    try {
      return await apiClient.testKMConnection(id);
    } finally {
      setIsTesting(false);
    }
  }, []);

  // Update selections
  const updateSelections = useCallback(async (id: string, selections: KMSelectionUpdate): Promise<KMConnection> => {
    setIsUpdating(true);
    try {
      const updated = await apiClient.updateKMSelections(id, selections);
      setConnections(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } finally {
      setIsUpdating(false);
    }
  }, []);

  // Toggle KM search enabled
  const setKMEnabled = useCallback((enabled: boolean) => {
    setSearchSettings(prev => ({ ...prev, enabled }));
  }, []);

  // Toggle a connection active/inactive
  const toggleConnectionActive = useCallback((connectionId: string) => {
    setSearchSettings(prev => {
      const isActive = prev.activeConnectionIds.includes(connectionId);
      return {
        ...prev,
        activeConnectionIds: isActive
          ? prev.activeConnectionIds.filter(id => id !== connectionId)
          : [...prev.activeConnectionIds, connectionId]
      };
    });
  }, []);

  // Set active connections directly
  const setActiveConnections = useCallback((connectionIds: string[]) => {
    setSearchSettings(prev => ({ ...prev, activeConnectionIds: connectionIds }));
  }, []);

  // Get active connections with their details
  const getActiveConnections = useCallback(() => {
    return connections.filter(c => searchSettings.activeConnectionIds.includes(c.id));
  }, [connections, searchSettings.activeConnectionIds]);

  // Check if any active connections have selections
  const hasActiveConnectionsWithSelections = useCallback(() => {
    const activeConns = getActiveConnections();
    return activeConns.some(c =>
      c.selected_collection_names.length > 0 || c.selected_corpus_ids.length > 0
    );
  }, [getActiveConnections]);

  // Get enabled connection IDs for chat request (returns undefined if KM is disabled or no active connections)
  const getEnabledConnectionIds = useCallback((): string[] | undefined => {
    if (!searchSettings.enabled) return undefined;
    const activeIds = searchSettings.activeConnectionIds;
    if (activeIds.length === 0) return undefined;
    return activeIds;
  }, [searchSettings]);

  return {
    // Connection data
    connections,
    isLoading,
    error,
    refetch: fetchConnections,
    kmServerUrl,

    // Search settings
    searchSettings,
    isKMEnabled: searchSettings.enabled,
    activeConnectionIds: searchSettings.activeConnectionIds,

    // Search settings actions
    setKMEnabled,
    toggleConnectionActive,
    setActiveConnections,

    // Connection mutations
    createConnection,
    updateConnection,
    deleteConnection,
    syncConnection,
    testConnection,
    updateSelections,

    // Mutation states
    isCreating,
    isUpdating,
    isDeleting,
    isSyncing,
    isTesting,

    // Helpers
    getActiveConnections,
    hasActiveConnectionsWithSelections,
    getEnabledConnectionIds,
  };
}
