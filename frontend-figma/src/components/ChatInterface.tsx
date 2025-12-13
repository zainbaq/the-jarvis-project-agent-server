import React, { useState, useRef, useEffect } from 'react';
import { Agent, Message } from '../types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { WorkflowPanel } from './WorkflowPanel';
import { Menu, Trash2, Zap, Bot } from 'lucide-react';
import { apiClient } from '../api/client';

interface ChatInterfaceProps {
  agent: Agent | null;
  onToggleSidebar: () => void;
}

export function ChatInterface({ agent, onToggleSidebar }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Clear messages when agent changes
    setMessages([]);
    setConversationId(null);
  }, [agent?.agent_id]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (message: string) => {
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

  const handleClearHistory = async () => {
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

  const isWorkflowAgent = agent?.capabilities.includes('workflow') || agent?.type === 'langgraph';

  if (!agent) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border border-white/10">
            <Bot className="w-12 h-12 text-indigo-400" />
          </div>
          <h2 className="text-2xl text-white mb-4">Welcome to Jarvis AI</h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Select an agent from the sidebar to start chatting or execute workflows
          </p>
          <button
            onClick={onToggleSidebar}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg flex items-center justify-center gap-2 mx-auto"
          >
            Open Sidebar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="glass-strong border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onToggleSidebar}
                className="p-2 hover:bg-white/10 rounded-lg transition-all lg:hidden"
              >
                <Menu className="w-5 h-5 text-gray-300" />
              </button>
              <div>
                <h2 className="text-lg text-white mb-1">{agent.name}</h2>
                <p className="text-xs text-gray-400">{agent.description}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {agent.capabilities.includes('workflow') && (
                <button
                  onClick={() => setShowWorkflow(!showWorkflow)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all flex items-center gap-2 ${
                    showWorkflow
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Workflow</span>
                </button>
              )}
              
              {agent.capabilities.includes('web_search') && (
                <button
                  onClick={() => setEnableWebSearch(!enableWebSearch)}
                  className={`px-4 py-2 rounded-lg text-sm transition-all ${
                    enableWebSearch
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                      : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  <span className="hidden sm:inline">Web Search</span>
                  <span className="sm:hidden">Search</span>
                </button>
              )}
              
              {conversationId && (
                <button
                  onClick={handleClearHistory}
                  className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"
                  title="Clear history"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {showWorkflow && isWorkflowAgent ? (
        <WorkflowPanel agent={agent} />
      ) : (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center max-w-2xl">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border border-white/10">
                    <Bot className="w-10 h-10 text-indigo-400" />
                  </div>
                  <h3 className="text-2xl text-white mb-4">Start a conversation</h3>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                    {agent.description}
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="px-4 py-2 bg-indigo-500/20 text-indigo-300 rounded-full text-sm border border-indigo-500/30"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <MessageList messages={messages} />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <ChatInput
            onSend={handleSendMessage}
            loading={loading}
            enableWebSearch={enableWebSearch}
            onToggleWebSearch={() => setEnableWebSearch(!enableWebSearch)}
            agentCapabilities={agent.capabilities}
          />
        </>
      )}
    </div>
  );
}