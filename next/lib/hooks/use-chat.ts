'use client';

import { useMutation } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { apiClient } from '@/lib/api/client';
import { useChatStore } from '@/lib/store/chat-store';
import type { Message, ChatRequest, ToolUsage, ChatStreamDoneData, GeneratedFile, CodeExecutionResult } from '@/lib/api/types';

export function useChat() {
  const {
    messages,
    selectedAgent,
    conversationId,
    isLoading,
    webSearchEnabled,
    kmSearchEnabled,
    codeInterpreterEnabled,
    activeKMConnectionIds,
    uploadedFiles,
    addMessage,
    setConversationId,
    setLoading,
    setError,
    clearUploadedFiles,
    startStreaming,
    appendToMessage,
    finishStreaming,
    updateMessage,
  } = useChatStore();

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessageStreaming = useCallback(async (content: string) => {
    if (!selectedAgent) {
      setError('No agent selected');
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    // Create user message
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
      attachedFiles: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
    };
    addMessage(userMessage);

    // Create placeholder assistant message for streaming
    const assistantMessageId = `msg_${Date.now()}_response`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };
    addMessage(assistantMessage);
    startStreaming(assistantMessageId);

    // Build request
    const request: ChatRequest = {
      message: content,
      conversation_id: conversationId || undefined,
      enable_web_search: webSearchEnabled,
      enable_km_search: kmSearchEnabled,
      enable_code_interpreter: codeInterpreterEnabled,
      km_connection_ids: kmSearchEnabled ? activeKMConnectionIds : undefined,
      uploaded_files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
    };

    try {
      const toolsUsed: ToolUsage[] = [];
      const generatedFiles: GeneratedFile[] = [];
      const codeExecutions: CodeExecutionResult[] = [];

      for await (const chunk of apiClient.chatStream(
        selectedAgent.agent_id,
        request,
        abortControllerRef.current.signal
      )) {
        switch (chunk.type) {
          case 'token':
            appendToMessage(assistantMessageId, chunk.data as string);
            break;
          case 'tool':
            toolsUsed.push(chunk.data as ToolUsage);
            break;
          case 'file':
            // Generated file from code interpreter
            generatedFiles.push(chunk.data as GeneratedFile);
            // Update message with the new file immediately
            updateMessage(assistantMessageId, {
              generatedFiles: [...generatedFiles],
            });
            break;
          case 'code_execution':
            // Code execution result
            codeExecutions.push(chunk.data as CodeExecutionResult);
            // Update message with the new execution immediately
            updateMessage(assistantMessageId, {
              codeExecutions: [...codeExecutions],
            });
            break;
          case 'done':
            const doneData = chunk.data as ChatStreamDoneData;
            if (doneData.conversation_id && doneData.conversation_id !== conversationId) {
              setConversationId(doneData.conversation_id);
            }
            finishStreaming(assistantMessageId, {
              metadata: doneData.metadata,
              tools_used: toolsUsed.length > 0 ? toolsUsed : undefined,
              generatedFiles: doneData.generated_files || (generatedFiles.length > 0 ? generatedFiles : undefined),
              codeExecutions: doneData.code_executions || (codeExecutions.length > 0 ? codeExecutions : undefined),
            });
            break;
          case 'error':
            throw new Error(chunk.data as string);
        }
      }

      clearUploadedFiles();
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        // Request was cancelled, don't treat as error
        finishStreaming(assistantMessageId);
        return;
      }
      finishStreaming(assistantMessageId);
      setError(error instanceof Error ? error.message : 'Streaming failed');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [
    selectedAgent,
    conversationId,
    webSearchEnabled,
    kmSearchEnabled,
    codeInterpreterEnabled,
    activeKMConnectionIds,
    uploadedFiles,
    addMessage,
    setConversationId,
    setLoading,
    setError,
    clearUploadedFiles,
    startStreaming,
    appendToMessage,
    finishStreaming,
    updateMessage,
  ]);

  // Legacy non-streaming mutation (kept for fallback if needed)
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedAgent) {
        throw new Error('No agent selected');
      }

      // Create user message
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content,
        timestamp: new Date(),
        attachedFiles: uploadedFiles.length > 0 ? [...uploadedFiles] : undefined,
      };

      // Add user message to store
      addMessage(userMessage);

      // Build request
      const request: ChatRequest = {
        message: content,
        conversation_id: conversationId || undefined,
        enable_web_search: webSearchEnabled,
        enable_km_search: kmSearchEnabled,
        enable_code_interpreter: codeInterpreterEnabled,
        km_connection_ids: kmSearchEnabled ? activeKMConnectionIds : undefined,
        uploaded_files: uploadedFiles.length > 0 ? uploadedFiles : undefined,
      };

      // Send to API
      const response = await apiClient.chat(selectedAgent.agent_id, request);

      // Update conversation ID if new
      if (response.conversation_id && response.conversation_id !== conversationId) {
        setConversationId(response.conversation_id);
      }

      // Create assistant message
      const assistantMessage: Message = {
        id: `msg_${Date.now()}_response`,
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
        metadata: response.metadata,
        tools_used: response.tools_used,
        generatedFiles: response.generated_files,
        codeExecutions: response.code_executions,
      };

      // Add assistant message
      addMessage(assistantMessage);

      // Clear uploaded files after sending
      clearUploadedFiles();

      return response;
    },
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onError: (error) => {
      setError(error instanceof Error ? error.message : 'Failed to send message');
    },
    onSettled: () => {
      setLoading(false);
    },
  });

  const clearConversation = useMutation({
    mutationFn: async () => {
      if (selectedAgent && conversationId) {
        await apiClient.deleteConversation(selectedAgent.agent_id, conversationId);
      }
    },
    onSuccess: () => {
      useChatStore.getState().resetChat();
    },
  });

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    messages,
    selectedAgent,
    conversationId,
    isLoading,
    sendMessage: sendMessageStreaming, // Use streaming by default
    sendMessageNonStreaming: sendMessageMutation.mutate, // Fallback if needed
    clearConversation: clearConversation.mutate,
    cancelStream,
    isSending: sendMessageMutation.isPending,
    isClearing: clearConversation.isPending,
  };
}
