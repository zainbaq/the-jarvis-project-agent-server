import { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../api/client';
import { Agent, Message, UploadedFile } from '../types';

interface SendMessageOptions {
  enableWebSearch?: boolean;
  enableKMSearch?: boolean;
  kmConnectionIds?: string[];
  files?: UploadedFile[];
}

/**
 * Custom hook to manage chat session state and logic
 * Consolidates the chat functionality from ChatTab component
 */
export function useChatSession(agent: Agent | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  // Generate conversation ID immediately on mount (needed for file uploads before first message)
  const [conversationId, setConversationId] = useState<string>(() =>
    `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clear messages and regenerate conversation ID when agent changes
  useEffect(() => {
    setMessages([]);
    setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
  }, [agent?.agent_id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (message: string, options: SendMessageOptions = {}) => {
    if (!agent || !message.trim()) return;

    const { enableWebSearch = false, enableKMSearch = false, kmConnectionIds, files = [] } = options;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      attachedFiles: files.length > 0 ? files : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await apiClient.chat(agent.agent_id, {
        message,
        conversation_id: conversationId || undefined,
        enable_web_search: enableWebSearch,
        enable_km_search: enableKMSearch && !!kmConnectionIds,
        km_connection_ids: kmConnectionIds,
        uploaded_files: files.length > 0 ? files : undefined
      });

      if (!conversationId) {
        setConversationId(response.conversation_id);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: response.metadata,
        tools_used: response.tools_used
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [agent, conversationId]);

  const clearHistory = useCallback(async () => {
    if (conversationId && agent) {
      try {
        await apiClient.deleteConversation(agent.agent_id, conversationId);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
    setMessages([]);
    setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
  }, [conversationId, agent]);

  return {
    messages,
    loading,
    conversationId,
    messagesEndRef,
    sendMessage,
    clearHistory
  };
}
