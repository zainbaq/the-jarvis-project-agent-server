/**
 * Session management hook
 *
 * - Generates session ID on first load
 * - Stores in sessionStorage (persists across refresh, isolated per tab)
 * - Provides session ID for API headers
 * - Conversation ID managed by backend (1:1 with session)
 */
import { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'jarvis_session_id';

export interface SessionState {
  sessionId: string;
  conversationId: string | null;
  isInitialized: boolean;
}

/**
 * Generate a unique session ID
 * Uses crypto.randomUUID() if available, falls back to timestamp + random
 */
function generateSessionId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `session_${crypto.randomUUID()}`;
  }
  // Fallback for older browsers
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `session_${timestamp}_${random}`;
}

export function useSession() {
  const [session, setSession] = useState<SessionState>({
    sessionId: '',
    conversationId: null,
    isInitialized: false
  });

  // Initialize session on mount
  useEffect(() => {
    let sessionId = sessionStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem(SESSION_KEY, sessionId);
      console.log('[Session] Created new session:', sessionId.substring(0, 20) + '...');
    } else {
      console.log('[Session] Restored session:', sessionId.substring(0, 20) + '...');
    }

    setSession({
      sessionId,
      conversationId: null, // Will be set by backend on first request
      isInitialized: true
    });
  }, []);

  /**
   * Set the conversation ID (received from backend)
   */
  const setConversationId = useCallback((convId: string) => {
    setSession(prev => ({ ...prev, conversationId: convId }));
  }, []);

  /**
   * Clear the current session and create a new one
   * This should be called when user wants to start fresh
   */
  const clearSession = useCallback(() => {
    const newSessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, newSessionId);
    setSession({
      sessionId: newSessionId,
      conversationId: null,
      isInitialized: true
    });
    console.log('[Session] Cleared, new session:', newSessionId.substring(0, 20) + '...');
  }, []);

  /**
   * Get headers object with session ID for API calls
   */
  const getSessionHeaders = useCallback((): Record<string, string> => {
    return session.sessionId ? { 'X-Session-ID': session.sessionId } : {};
  }, [session.sessionId]);

  return {
    ...session,
    setConversationId,
    clearSession,
    getSessionHeaders
  };
}

export default useSession;
