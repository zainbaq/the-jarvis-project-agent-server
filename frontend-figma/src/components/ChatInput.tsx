import React, { useState, useRef, useEffect } from "react";
import { Send, Globe, Loader, ChevronDown, Bot, Plus } from "lucide-react";
import { Agent } from "../types";
import { colors, components, spacing, typography, borderRadius } from '../styles/theme';
import { cn } from '@/components/ui/utils';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading: boolean;
  enableWebSearch: boolean;
  onToggleWebSearch: () => void;
  selectedAgent: Agent | null;
  agents: Agent[];
  onAgentChange: (agent: Agent) => void;
  onAddEndpoint: () => void;
}

export function ChatInput({
  onSend,
  loading,
  enableWebSearch,
  onToggleWebSearch,
  selectedAgent,
  agents,
  onAgentChange,
  onAddEndpoint,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supportsWebSearch = selectedAgent?.capabilities.includes("web_search");

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        textareaRef.current.scrollHeight + "px";
    }
  }, [message]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !loading) {
      onSend(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn('border-t', colors.border.default)}>
      <div className={cn('flex justify-center', spacing.chatInputArea)}>
        <form onSubmit={handleSubmit} className={cn('w-full', 'max-w-3xl')}>
          <div className={spacing.compact}>
            {/* Top Row: Web Search and Agent Selector */}
            <div className={cn('flex items-center', spacing.inline)}>
              {/* Web Search Toggle */}
              {supportsWebSearch && (
                <button
                  type="button"
                  onClick={onToggleWebSearch}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium',
                    'transition-all duration-200 active:scale-95',
                    enableWebSearch
                      ? 'bg-purple-600/40 text-purple-200 shadow-md'
                      : 'bg-purple-900/20 text-gray-400 hover:bg-purple-900/40 hover:text-purple-200'
                  )}
                  title="Web Search"
                >
                  <Globe className="w-4 h-4" />
                  <span>Web Search</span>
                </button>
              )}

              {/* Agent Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-purple-900/30 hover:bg-purple-900/40 text-white text-sm font-medium transition-all duration-200 active:scale-95"
                >
                  <Bot className="w-4 h-4" />
                  <span>{selectedAgent?.name || 'Select Agent'}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {showAgentDropdown && (
                  <div className={components.dropdown.container}>
                    <div className="max-h-64 overflow-y-auto">
                      {agents.map((agent) => (
                        <button
                          key={agent.agent_id}
                          type="button"
                          onClick={() => {
                            onAgentChange(agent);
                            setShowAgentDropdown(false);
                          }}
                          className={
                            selectedAgent?.agent_id === agent.agent_id
                              ? components.dropdown.itemActive
                              : cn(components.dropdown.item, colors.text.secondary)
                          }
                        >
                          <div className={typography.body.base}>{agent.name}</div>
                          <div className={cn(typography.body.small, colors.text.muted)}>{agent.type}</div>
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          onAddEndpoint();
                          setShowAgentDropdown(false);
                        }}
                        className={cn(
                          components.dropdown.item,
                          colors.text.accent,
                          components.dropdown.divider
                        )}
                      >
                        <div className={cn(typography.body.base, 'flex items-center', spacing.inlineCompact)}>
                          <Plus className="w-4 h-4" />
                          Add Custom Endpoint
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Text Input and Send Button */}
            <div className="flex gap-3 items-end backdrop-blur-lg bg-purple-900/40 border border-purple-500/30 rounded-xl p-5 shadow-2xl">
              {/* Message Input */}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  rows={1}
                  disabled={loading}
                  className={cn(components.textarea, 'max-h-[200px] text-base placeholder-gray-400 focus:placeholder-gray-500')}
                />
              </div>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!message.trim() || loading}
                className="p-3.5 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:from-purple-700 active:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all duration-200 flex-shrink-0 h-12 w-12 flex items-center justify-center shadow-lg shadow-purple-900/50 hover:shadow-xl hover:shadow-purple-900/60 active:scale-95"
              >
                {loading ? (
                  <Loader className={cn('w-6 h-6', 'animate-spin', colors.text.primary)} />
                ) : (
                  <Send className={cn('w-6 h-6', colors.text.primary)} />
                )}
              </button>
            </div>
          </div>

          {/* Helper Text */}
          <p className="text-xs text-gray-500 text-center mt-4">
            Press <kbd className="px-1.5 py-0.5 bg-purple-900/30 border border-purple-500/20 rounded text-purple-300 text-xs">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-purple-900/30 border border-purple-500/20 rounded text-purple-300 text-xs">Shift + Enter</kbd> for new line
          </p>
        </form>
      </div>
    </div>
  );
}