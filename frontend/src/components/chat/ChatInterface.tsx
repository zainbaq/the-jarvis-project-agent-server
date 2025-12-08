// Chat Interface - complete chat UI with messages and input
// This is the main chat component that combines everything

import { useEffect, useRef, useState } from 'react';
import { useChat } from '../../hooks/useChat';
import { useConversationStore } from '../../stores/conversationStore';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface ChatInterfaceProps {
  agentId: string;
  agentName: string;
}

export function ChatInterface({ agentId, agentName }: ChatInterfaceProps) {
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { sendMessage, isLoading, error, conversationId, clearConversation } =
    useChat(agentId);

  const conversation = useConversationStore((state) =>
    conversationId ? state.getConversation(conversationId) : undefined
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages]);

  const handleSend = (message: string) => {
    sendMessage({
      message,
      enable_web_search: enableWebSearch,
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Chat with {agentName}
          </h2>
          {conversationId && (
            <p className="text-xs text-gray-500 mt-1">
              Conversation: {conversationId.substring(0, 8)}...
            </p>
          )}
        </div>
        <button
          onClick={clearConversation}
          className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mx-6 mt-4">
          <p className="font-semibold">Error sending message</p>
          <p className="text-sm">{error.message}</p>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!conversation || conversation.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">
              Start a conversation by typing a message below
            </p>
          </div>
        ) : (
          <>
            {conversation.messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
                  <LoadingSpinner size="sm" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        enableWebSearch={enableWebSearch}
        onToggleWebSearch={() => setEnableWebSearch(!enableWebSearch)}
      />
    </div>
  );
}
