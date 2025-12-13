import React, { useState, useRef, useEffect } from 'react';
import { Agent, Message } from '../types';
import { MessageList } from './MessageList';
import { WorkflowPanel } from './WorkflowPanel';
import { Menu, Trash2, Zap, Bot, Loader, Send } from 'lucide-react';
import { apiClient } from '../api/client';
import { colors, components, spacing, typography, borderRadius, iconSizes, shadows } from '../styles/theme';
import { cn } from './ui/utils';

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
      <div className={cn('flex-1 flex items-center justify-center', spacing.chatEmptyState)}>
        <div className="text-center max-w-md">
          <div className={cn('w-24 h-24 mx-auto mb-6', borderRadius.lg, 'bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border', colors.border.input)}>
            <Bot className={cn(iconSizes['4xl'], 'text-indigo-400')} />
          </div>
          <h2 className={cn(typography.heading.xl, colors.text.primary, 'mb-4')}>Welcome to The Jarvis Project</h2>
          <p className={cn(colors.text.secondary, 'mb-8 leading-relaxed')}>
            Select an agent from the sidebar to start chatting or execute workflows
          </p>
          <button
            onClick={onToggleSidebar}
            className={cn(spacing.buttonPadding.lg, 'bg-gradient-to-r from-indigo-500 to-purple-600', colors.text.primary, borderRadius.md, 'hover:from-indigo-600 hover:to-purple-700 transition-all', shadows.lg, 'flex items-center justify-center gap-2 mx-auto')}
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
      <div className={cn('glass-strong border-b', colors.border.default)}>
        <div className={cn('max-w-6xl mx-auto', spacing.containerMain, spacing.containerMainVertical)}>
          <div className="flex items-center justify-between">
            <div className={cn('flex items-center', spacing.inlineStandard)}>
              <button
                onClick={onToggleSidebar}
                className={cn(components.buttonVariants.settingsIcon, 'lg:hidden')}
              >
                <Menu className={cn(iconSizes.md, colors.text.secondary)} />
              </button>
              <div>
                <h2 className={cn(typography.heading.lg, colors.text.primary, 'mb-1')}>{agent.name}</h2>
                <p className={cn(typography.body.small, colors.text.secondary)}>{agent.description}</p>
              </div>
            </div>
            
            <div className={cn('flex items-center', spacing.inlineCompact)}>
              {agent.capabilities.includes('workflow') && (
                <button
                  onClick={() => setShowWorkflow(!showWorkflow)}
                  className={cn(
                    spacing.buttonPadding.md,
                    borderRadius.sm,
                    typography.body.base,
                    'transition-all flex items-center',
                    spacing.inlineCompact,
                    showWorkflow
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : cn('bg-white/5', colors.text.secondary, 'border', colors.border.default, 'hover:bg-white/10')
                  )}
                >
                  <Zap className={iconSizes.sm} />
                  <span className="hidden sm:inline">Workflow</span>
                </button>
              )}

              {agent.capabilities.includes('web_search') && (
                <button
                  onClick={() => setEnableWebSearch(!enableWebSearch)}
                  className={cn(
                    spacing.buttonPadding.md,
                    borderRadius.sm,
                    typography.body.base,
                    'transition-all',
                    enableWebSearch
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                      : cn('bg-white/5', colors.text.secondary, 'border', colors.border.default, 'hover:bg-white/10')
                  )}
                >
                  <span className="hidden sm:inline">Web Search</span>
                  <span className="sm:hidden">Search</span>
                </button>
              )}

              {conversationId && (
                <button
                  onClick={handleClearHistory}
                  className={cn(spacing.buttonPadding.icon, 'hover:bg-red-500/20 text-red-400', borderRadius.sm, 'transition-all')}
                  title="Clear history"
                >
                  <Trash2 className={iconSizes.sm} />
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
              <div className={cn('flex items-center justify-center h-full', spacing.chatEmptyState)}>
                <div className="text-center max-w-2xl">
                  <h3 className={cn(typography.heading.xl, colors.text.primary, 'mb-4')}>Start a conversation</h3>
                  <p className={cn(colors.text.secondary, 'mb-8 leading-relaxed')}>
                    {agent.description}
                  </p>
                  <div className={cn('flex flex-wrap justify-center', spacing.inlineCompact)}>
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className={cn(components.tag, 'font-medium')}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <MessageList messages={messages} loading={loading} />
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className={cn('border-t', colors.border.default)}>
            <div className={cn('flex justify-center', spacing.chatInputArea)}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.querySelector('textarea');
                  if (input?.value.trim()) {
                    handleSendMessage(input.value);
                    input.value = '';
                  }
                }}
                className="w-full max-w-3xl"
              >
                <div className={cn('flex items-end backdrop-blur-lg bg-purple-900/40 border border-purple-500/30', borderRadius.md, spacing.inline, spacing.inputContainer, shadows['2xl'])}>
                  <textarea
                    placeholder="Type your message..."
                    rows={1}
                    disabled={loading}
                    className={cn(components.textarea, 'flex-1 h-12 max-h-[200px] text-base placeholder-gray-400 focus:placeholder-gray-500')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className={components.buttonVariants.sendButton}
                  >
                    {loading ? (
                      <Loader className={cn(iconSizes.lg, 'animate-spin', colors.text.primary)} />
                    ) : (
                      <Send className={cn(iconSizes.lg, colors.text.primary)} />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}