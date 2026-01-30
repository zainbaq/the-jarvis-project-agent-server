'use client';

import { create } from 'zustand';
import {
  signOut,
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
  type AuthUser,
} from 'aws-amplify/auth';
import { configureAmplify } from './amplify';
import { apiClient } from '@/lib/api/client';

export interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  accessToken: string | null;

  // Actions
  initialize: () => Promise<void>;
  loginWithHostedUI: () => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => Promise<string | null>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  accessToken: null,

  initialize: async () => {
    try {
      configureAmplify();
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString() || null;

      // Sync token with API client
      apiClient.setAuthToken(token);

      set({
        user,
        isAuthenticated: true,
        isLoading: false,
        accessToken: token,
      });
    } catch (error) {
      // User not authenticated
      apiClient.setAuthToken(null);
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        accessToken: null,
      });
    }
  },

  loginWithHostedUI: async () => {
    try {
      configureAmplify();
      // This will redirect to Cognito Hosted UI
      await signInWithRedirect();
    } catch (error: any) {
      console.error('Login redirect error:', error);
      set({
        error: error.message || 'Failed to redirect to login',
      });
    }
  },

  logout: async () => {
    try {
      await signOut({ global: true });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear token from API client
      apiClient.setAuthToken(null);
      set({
        user: null,
        isAuthenticated: false,
        accessToken: null,
      });
    }
  },

  getToken: async () => {
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString() || null;
      // Sync token with API client
      apiClient.setAuthToken(token);
      set({ accessToken: token });
      return token;
    } catch (error) {
      return null;
    }
  },

  clearError: () => set({ error: null }),
}));
