'use client';

import { create } from 'zustand';
import { apiClient } from '@/lib/api/client';

// Generate a random ID that works in both secure and non-secure contexts
function generateId(): string {
  // crypto.randomUUID() only works in secure contexts (HTTPS or localhost)
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
  }
  // Fallback for non-secure contexts (HTTP on public IP)
  return Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

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
      const newId = `session_${generateId()}`;
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

    const newId = `session_${generateId()}`;
    sessionStorage.setItem('jarvis_session_id', newId);
    apiClient.setSessionId(newId);
    set({ sessionId: newId });
  },
}));
