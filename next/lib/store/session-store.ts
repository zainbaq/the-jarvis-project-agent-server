'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

interface SessionState {
  sessionId: string;
  isInitialized: boolean;
  isConnected: boolean;
  connectionError: string | null;

  // Actions
  initialize: () => void;
  setConnected: (connected: boolean) => void;
  setConnectionError: (error: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessionId: '',
  isInitialized: false,
  isConnected: false,
  connectionError: null,

  initialize: () => {
    if (typeof window === 'undefined') return;

    const existing = sessionStorage.getItem('jarvis_session_id');
    if (existing) {
      apiClient.setSessionId(existing);
      set({ sessionId: existing, isInitialized: true });
    } else {
      const newId = `session_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
      sessionStorage.setItem('jarvis_session_id', newId);
      apiClient.setSessionId(newId);
      set({ sessionId: newId, isInitialized: true });
    }
  },

  setConnected: (connected: boolean) => {
    set({ isConnected: connected, connectionError: connected ? null : get().connectionError });
  },

  setConnectionError: (error: string | null) => {
    set({ connectionError: error, isConnected: error === null });
  },

  clearSession: () => {
    if (typeof window === 'undefined') return;

    const newId = `session_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    sessionStorage.setItem('jarvis_session_id', newId);
    apiClient.setSessionId(newId);
    set({ sessionId: newId });
  },
}));
