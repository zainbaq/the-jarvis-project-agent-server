// Conversation Store - Store chat history
// Like a dictionary of conversations in memory + localStorage

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Message, Conversation } from '../types/chat';
import { generateId } from '../lib/utils';

interface ConversationStore {
  conversations: Record<string, Conversation>;

  addMessage: (conversationId: string, agentId: string, message: Message) => void;
  createConversation: (agentId: string) => string;
  getConversation: (conversationId: string) => Conversation | undefined;
  clearConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  getConversationsByAgent: (agentId: string) => Conversation[];
}

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: {},

      addMessage: (conversationId, agentId, message) =>
        set((state) => {
          const conversation = state.conversations[conversationId];

          if (!conversation) {
            // Create new conversation if it doesn't exist
            return {
              conversations: {
                ...state.conversations,
                [conversationId]: {
                  id: conversationId,
                  agentId,
                  messages: [message],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
            };
          }

          // Add message to existing conversation
          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                messages: [...conversation.messages, message],
                updatedAt: new Date(),
              },
            },
          };
        }),

      createConversation: (agentId) => {
        const id = generateId();
        set((state) => ({
          conversations: {
            ...state.conversations,
            [id]: {
              id,
              agentId,
              messages: [],
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
        }));
        return id;
      },

      getConversation: (conversationId) => {
        return get().conversations[conversationId];
      },

      clearConversation: (conversationId) =>
        set((state) => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                messages: [],
                updatedAt: new Date(),
              },
            },
          };
        }),

      deleteConversation: (conversationId) =>
        set((state) => {
          const { [conversationId]: _, ...rest } = state.conversations;
          return { conversations: rest };
        }),

      getConversationsByAgent: (agentId) => {
        const conversations = get().conversations;
        return Object.values(conversations)
          .filter((conv) => conv.agentId === agentId)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      },
    }),
    {
      name: 'conversations-storage',
    }
  )
);
