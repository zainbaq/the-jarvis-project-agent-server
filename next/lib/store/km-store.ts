'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { KMConnection } from '@/lib/api/types';

interface KMState {
  // State
  connections: KMConnection[];
  isLoading: boolean;
  error: string | null;
  isDrawerOpen: boolean;

  // Actions
  setConnections: (connections: KMConnection[]) => void;
  addConnection: (connection: KMConnection) => void;
  updateConnection: (id: string, updates: Partial<KMConnection>) => void;
  removeConnection: (id: string) => void;

  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDrawerOpen: (open: boolean) => void;

  // Helpers
  getActiveConnections: () => KMConnection[];
  getConnectionsWithSelections: () => KMConnection[];
}

export const useKMStore = create<KMState>()(
  persist(
    (set, get) => ({
      // Initial state
      connections: [],
      isLoading: false,
      error: null,
      isDrawerOpen: false,

      // Actions
      setConnections: (connections) => set({ connections }),

      addConnection: (connection) =>
        set((state) => ({
          connections: [...state.connections, connection],
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
        })),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error }),

      setDrawerOpen: (open) => set({ isDrawerOpen: open }),

      // Helpers
      getActiveConnections: () => {
        return get().connections.filter((conn) => conn.status === 'active');
      },

      getConnectionsWithSelections: () => {
        return get().connections.filter(
          (conn) =>
            conn.selected_collection_names.length > 0 ||
            conn.selected_corpus_ids.length > 0
        );
      },
    }),
    {
      name: 'jarvis-km-settings',
      partialize: (state) => ({
        // Only persist drawer state, not actual connections (those come from API)
        isDrawerOpen: state.isDrawerOpen,
      }),
    }
  )
);
