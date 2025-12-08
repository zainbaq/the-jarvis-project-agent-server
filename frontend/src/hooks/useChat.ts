// Custom hook for chat functionality
// This combines state management with API calls

import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { sendMessage } from '../api/chat';
import { useConversationStore } from '../stores/conversationStore';
import { generateId } from '../lib/utils';
import type { ChatRequest, Message } from '../types/chat';
import toast from 'react-hot-toast';

export function useChat(agentId: string) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationIdRef = useRef<string | null>(null);  // Use ref for immediate consistency
  const addMessage = useConversationStore((state) => state.addMessage);
  const clearConversation = useConversationStore((state) => state.clearConversation);

  // useMutation is for POST/PUT/DELETE requests (mutations)
  const mutation = useMutation({
    mutationFn: (request: ChatRequest) => {
      // Use ref for immediate consistency to prevent race conditions
      const currentConvId = conversationIdRef.current || conversationId;
      const reqWithConv = {
        ...request,
        conversation_id: currentConvId || undefined,
      };
      return sendMessage(agentId, reqWithConv);
    },
    onMutate: async (request) => {
      // Add user message immediately (optimistic update)
      const userMessage: Message = {
        id: generateId(),
        role: 'user',
        content: request.message,
        timestamp: new Date(),
      };

      let convId = conversationIdRef.current || conversationId;
      if (!convId) {
        convId = generateId();
        conversationIdRef.current = convId;
        setConversationId(convId);
      }

      addMessage(convId, agentId, userMessage);
    },
    onSuccess: (data) => {
      // Add assistant response
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: data.metadata,
        toolsUsed: data.tools_used,
      };

      const convId = data.conversation_id || conversationId!;
      if (!conversationId) {
        setConversationId(convId);
      }

      addMessage(convId, agentId, assistantMessage);
    },
    onError: (error: Error) => {
      toast.error(`Chat error: ${error.message}`);
    },
  });

  const handleClearConversation = () => {
    if (conversationId) {
      clearConversation(conversationId);
    }
  };

  const startNewConversation = () => {
    setConversationId(null);
  };

  return {
    sendMessage: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    conversationId,
    clearConversation: handleClearConversation,
    startNewConversation,
  };
}
