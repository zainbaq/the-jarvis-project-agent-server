import { useState, useEffect, useRef } from 'react';
import { apiClient } from '../api/client';
import { Agent, Message } from '../types';

/**
 * Custom hook to manage chat session state and logic
 * Consolidates the chat functionality from ChatTab component
 */
export function useChatSession(agent: Agent | null, enableWebSearch: boolean = false) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Clear messages when agent changes
  useEffect(() => {
    setMessages([]);
    setConversationId(null);
  }, [agent?.agent_id]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (message: string) => {
    if (!agent || !message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await apiClient.chat(agent.agent_id, {
        message,
        conversation_id: conversationId || undefined,
        enable_web_search: enableWebSearch
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
  };

  const clearHistory = async () => {
    if (conversationId && agent) {
      try {
        await apiClient.deleteConversation(agent.agent_id, conversationId);
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
    setMessages([]);
    setConversationId(null);
  };

  return {
    messages,
    loading,
    conversationId,
    messagesEndRef,
    sendMessage,
    clearHistory
  };
}
