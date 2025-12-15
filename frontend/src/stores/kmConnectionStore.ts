// KM Connection Store - Store KM connection settings
// Persists search settings locally, connections fetched from backend

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KMConnection, KMSearchSettings } from '../types/km';

interface KMConnectionStore {
  // Connections (cached from backend, not persisted locally)
  connections: KMConnection[];
  isLoading: boolean;
  error: string | null;

  // Search settings (persisted locally)
  searchSettings: KMSearchSettings;

  // Connection actions
  setConnections: (connections: KMConnection[]) => void;
  addConnection: (connection: KMConnection) => void;
  updateConnection: (id: string, updates: Partial<KMConnection>) => void;
  removeConnection: (id: string) => void;

  // Search settings actions
  setKMEnabled: (enabled: boolean) => void;
  toggleConnectionActive: (connectionId: string) => void;
  setActiveConnections: (connectionIds: string[]) => void;

  // Loading states
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Helpers
  getActiveConnections: () => KMConnection[];
  hasActiveConnectionsWithSelections: () => boolean;
}

export const useKMConnectionStore = create<KMConnectionStore>()(
  persist(
    (set, get) => ({
      // Initial state
      connections: [],
      isLoading: false,
      error: null,
      searchSettings: {
        enabled: false,
        activeConnectionIds: [],
      },

      // Connection actions (from backend)
      setConnections: (connections) =>
        set({ connections, error: null }),

      addConnection: (connection) =>
        set((state) => ({
          connections: [...state.connections, connection],
          // Auto-activate new connection
          searchSettings: {
            ...state.searchSettings,
            activeConnectionIds: [
              ...state.searchSettings.activeConnectionIds,
              connection.id,
            ],
          },
        })),

      updateConnection: (id, updates) =>
        set((state) => ({
          connections: state.connections.map((conn) =>
            conn.id === id ? { ...conn, ...updates } : conn
          ),
        })),

      removeConnection: (id) =>
        set((state) => ({
          connections: state.connections.filter((conn) => conn.id !== id),
          searchSettings: {
            ...state.searchSettings,
            activeConnectionIds: state.searchSettings.activeConnectionIds.filter(
              (cid) => cid !== id
            ),
          },
        })),

      // Search settings actions
      setKMEnabled: (enabled) =>
        set((state) => ({
          searchSettings: {
            ...state.searchSettings,
            enabled,
          },
        })),

      toggleConnectionActive: (connectionId) =>
        set((state) => {
          const isActive = state.searchSettings.activeConnectionIds.includes(connectionId);
          return {
            searchSettings: {
              ...state.searchSettings,
              activeConnectionIds: isActive
                ? state.searchSettings.activeConnectionIds.filter((id) => id !== connectionId)
                : [...state.searchSettings.activeConnectionIds, connectionId],
            },
          };
        }),

      setActiveConnections: (connectionIds) =>
        set((state) => ({
          searchSettings: {
            ...state.searchSettings,
            activeConnectionIds: connectionIds,
          },
        })),

      // Loading states
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Helpers
      getActiveConnections: () => {
        const state = get();
        return state.connections.filter(
          (conn) =>
            conn.status === 'active' &&
            state.searchSettings.activeConnectionIds.includes(conn.id)
        );
      },

      hasActiveConnectionsWithSelections: () => {
        const activeConnections = get().getActiveConnections();
        return activeConnections.some(
          (conn) =>
            conn.selected_collection_names.length > 0 ||
            conn.selected_corpus_ids.length > 0
        );
      },
    }),
    {
      name: 'km-connections-storage',
      // Only persist search settings, not connections (fetched from backend)
      partialize: (state) => ({
        searchSettings: state.searchSettings,
      }),
    }
  )
);
