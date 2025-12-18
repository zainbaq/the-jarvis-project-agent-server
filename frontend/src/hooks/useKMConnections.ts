/**
 * Custom hook for KM connections management
 *
 * Now uses SESSION-SCOPED API endpoints:
 * - KM connections are stored per-session (browser tab)
 * - Fresh login required for each session
 * - Connections lost on server restart
 *
 * UI preferences (enabled state) still persist in localStorage
 */
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../api/client';
import type {
  KMConnection,
  KMConnectionCreate,
  KMSelectionUpdate,
  KMSearchSettings
} from '../types';

const KM_SETTINGS_KEY = 'jarvis_km_settings';

/**
 * Load UI preferences from localStorage
 * Note: Only loads enabled state, not connection IDs (those come from session API)
 */
function loadSettings(): KMSearchSettings {
  if (typeof window === 'undefined') {
    return { enabled: false, activeConnectionIds: [] };
  }
  try {
    const stored = localStorage.getItem(KM_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Only restore enabled state, not connection IDs (session-scoped)
      return { enabled: parsed.enabled || false, activeConnectionIds: [] };
    }
  } catch (e) {
    console.error('Failed to load KM settings:', e);
  }
  return { enabled: false, activeConnectionIds: [] };
}

/**
 * Save UI preferences to localStorage
 * Only saves enabled state (connection IDs are session-scoped)
 */
function saveSettings(settings: KMSearchSettings): void {
  if (typeof window === 'undefined') return;
  try {
    // Only persist enabled state, not connection IDs
    localStorage.setItem(KM_SETTINGS_KEY, JSON.stringify({
      enabled: settings.enabled
    }));
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

  // Fetch connections and status on mount (SESSION-SCOPED)
  const fetchConnections = useCallback(async () => {
    console.log('[KM] Fetching session connections...');
    setIsLoading(true);
    setError(null);
    try {
      const [data, status] = await Promise.all([
        apiClient.listSessionKMConnections(),
        apiClient.getSessionKMStatus()
      ]);
      console.log('[KM] Session connections fetched:', data.length);
      setConnections(data);
      setKmServerUrl(status.km_server_url);

      // Auto-activate all session connections (since they're session-scoped)
      if (data.length > 0) {
        setSearchSettings(prev => ({
          ...prev,
          activeConnectionIds: data.map(c => c.id)
        }));
      }
    } catch (e) {
      console.error('[KM] Error fetching session connections:', e);
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

  // Create connection (SESSION-SCOPED - requires login)
  const createConnection = useCallback(async (data: KMConnectionCreate): Promise<KMConnection> => {
    setIsCreating(true);
    try {
      const newConnection = await apiClient.createSessionKMConnection(data);
      setConnections(prev => [...prev, newConnection]);
      // Auto-activate new connection
      setSearchSettings(prev => ({
        ...prev,
        activeConnectionIds: [...prev.activeConnectionIds, newConnection.id]
      }));
      return newConnection;
    } finally {
      setIsCreating(false);
    }
  }, []);

  // Delete connection (SESSION-SCOPED)
  const deleteConnection = useCallback(async (id: string): Promise<void> => {
    setIsDeleting(true);
    try {
      await apiClient.deleteSessionKMConnection(id);
      setConnections(prev => prev.filter(c => c.id !== id));
      // Remove from active connections
      setSearchSettings(prev => ({
        ...prev,
        activeConnectionIds: prev.activeConnectionIds.filter(cid => cid !== id)
      }));
    } finally {
      setIsDeleting(false);
    }
  }, []);

  // Sync connection (SESSION-SCOPED)
  const syncConnection = useCallback(async (id: string): Promise<KMConnection> => {
    setIsSyncing(true);
    try {
      const updated = await apiClient.syncSessionKMConnection(id);
      setConnections(prev => prev.map(c => c.id === id ? updated : c));
      return updated;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Test connection (SESSION-SCOPED)
  const testConnection = useCallback(async (id: string) => {
    setIsTesting(true);
    try {
      return await apiClient.testSessionKMConnection(id);
    } finally {
      setIsTesting(false);
    }
  }, []);

  // Update selections (SESSION-SCOPED)
  const updateSelections = useCallback(async (id: string, selections: KMSelectionUpdate): Promise<KMConnection> => {
    setIsUpdating(true);
    try {
      const updated = await apiClient.updateSessionKMSelections(id, selections);
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

    // Connection mutations (session-scoped)
    createConnection,
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
