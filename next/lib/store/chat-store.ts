'use client';

import { create } from 'zustand';
import type { Message, Agent, UploadedFile } from '@/lib/api/types';

interface ChatState {
  // State
  messages: Message[];
  selectedAgent: Agent | null;
  conversationId: string;
  isLoading: boolean;
  error: string | null;

  // Streaming state
  streamingMessageId: string | null;

  // Tool toggles
  webSearchEnabled: boolean;
  kmSearchEnabled: boolean;
  codeInterpreterEnabled: boolean;
  activeKMConnectionIds: string[];

  // Files
  uploadedFiles: UploadedFile[];

  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;

  setSelectedAgent: (agent: Agent | null) => void;
  setConversationId: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Streaming actions
  startStreaming: (messageId: string) => void;
  appendToMessage: (messageId: string, content: string) => void;
  finishStreaming: (messageId: string, updates?: Partial<Message>) => void;

  setWebSearchEnabled: (enabled: boolean) => void;
  setKMSearchEnabled: (enabled: boolean) => void;
  setCodeInterpreterEnabled: (enabled: boolean) => void;
  setActiveKMConnectionIds: (ids: string[]) => void;

  addUploadedFile: (file: UploadedFile) => void;
  removeUploadedFile: (fileId: string) => void;
  clearUploadedFiles: () => void;

  resetChat: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  // Initial state
  messages: [],
  selectedAgent: null,
  conversationId: '',
  isLoading: false,
  error: null,
  streamingMessageId: null,
  webSearchEnabled: false,
  kmSearchEnabled: false,
  codeInterpreterEnabled: false,
  activeKMConnectionIds: [],
  uploadedFiles: [],

  // Message actions
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, ...updates } : msg
      ),
    })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [], conversationId: '' }),

  // Agent and conversation actions
  setSelectedAgent: (agent) => set({ selectedAgent: agent }),

  setConversationId: (id) => set({ conversationId: id }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  // Streaming actions
  startStreaming: (messageId) => set({ streamingMessageId: messageId }),

  appendToMessage: (messageId, content) =>
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: msg.content + content }
          : msg
      ),
    })),

  finishStreaming: (messageId, updates) =>
    set((state) => ({
      streamingMessageId: null,
      messages: state.messages.map((msg) =>
        msg.id === messageId
          ? { ...msg, ...updates }
          : msg
      ),
    })),

  // Tool toggle actions
  setWebSearchEnabled: (enabled) => set({ webSearchEnabled: enabled }),

  setKMSearchEnabled: (enabled) => set({ kmSearchEnabled: enabled }),

  setCodeInterpreterEnabled: (enabled) => set({ codeInterpreterEnabled: enabled }),

  setActiveKMConnectionIds: (ids) => set({ activeKMConnectionIds: ids }),

  // File actions
  addUploadedFile: (file) =>
    set((state) => ({
      uploadedFiles: [...state.uploadedFiles, file],
    })),

  removeUploadedFile: (fileId) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.filter((f) => f.file_id !== fileId),
    })),

  clearUploadedFiles: () => set({ uploadedFiles: [] }),

  // Reset all chat state
  resetChat: () =>
    set({
      messages: [],
      conversationId: '',
      isLoading: false,
      error: null,
      uploadedFiles: [],
    }),
}));
