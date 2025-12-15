import React, { useState, useRef, useEffect } from "react";
import { Send, Globe, Loader, ChevronDown, Bot, Plus, Trash2, Database, X, Check } from "lucide-react";
import { Agent, UploadedFile } from "../types";
import { colors, components, spacing, typography, borderRadius, iconSizes, shadows } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import { FileUpload } from "./FileUpload";

interface ActiveKMConnection {
  id: string;
  name: string;
  hasSelections: boolean;
}

interface ChatInputProps {
  onSend: (message: string, files: UploadedFile[]) => void;
  conversationId: string;
  loading: boolean;
  enableWebSearch: boolean;
  onToggleWebSearch: () => void;
  enableKMSearch: boolean;
  activeKMConnectionsCount: number;
  activeKMConnections: ActiveKMConnection[];
  onOpenKMDrawer: () => void;
  onToggleKMSearch: () => void;
  selectedAgent: Agent | null;
  agents: Agent[];
  onAgentChange: (agent: Agent) => void;
  onAddEndpoint: () => void;
  onDeleteEndpoint: (agent: Agent) => void;
}

export function ChatInput({
  onSend,
  conversationId,
  loading,
  enableWebSearch,
  onToggleWebSearch,
  enableKMSearch,
  activeKMConnectionsCount,
  activeKMConnections,
  onOpenKMDrawer,
  onToggleKMSearch,
  selectedAgent,
  agents,
  onAgentChange,
  onAddEndpoint,
  onDeleteEndpoint,
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const supportsWebSearch = selectedAgent?.capabilities.includes("web_search");

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // Enforce minimum height of 48px (h-12) to match send button
      const newHeight = Math.max(48, textareaRef.current.scrollHeight);
      textareaRef.current.style.height = newHeight + "px";
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
      onSend(message, uploadedFiles);
      setMessage("");
      setUploadedFiles([]);
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
      <div className={cn('flex justify-center', spacing.chatInputArea, 'mt-8 mb-8')}>
        <form onSubmit={handleSubmit} className={cn('w-full', 'max-w-3xl')}>
          <div className="flex flex-col">
            {/* Top Row: Web Search and Agent Selector */}
            <div className={cn('flex items-center gap-2')}>
              {/* Agent Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowAgentDropdown(!showAgentDropdown)}
                  className={components.buttonVariants.agentSelector}
                >
                  <Bot className={iconSizes.sm} />
                  {/* <span>{selectedAgent?.name || 'Select Agent'}</span> */}
                  <ChevronDown className={iconSizes.xs} />
                </button>

                {showAgentDropdown && (
                  <div className={components.dropdown.container}>
                    <div className="max-h-128 overflow-y-auto">
                      {agents.map((agent) => {
                        const isCustomEndpoint = agent.agent_id.startsWith('endpoint_');
                        const isActive = selectedAgent?.agent_id === agent.agent_id;

                        return (
                          <div key={agent.agent_id} className="flex items-center group">
                            <button
                              type="button"
                              onClick={() => {
                                onAgentChange(agent);
                                setShowAgentDropdown(false);
                              }}
                              className={cn(
                                isActive
                                  ? components.dropdown.itemActive
                                  : cn(components.dropdown.item, colors.text.secondary),
                                'flex-1 text-left'
                              )}
                            >
                              <div className={typography.body.base}>{agent.name}</div>
                              <div className={cn(typography.body.small, colors.text.muted)}>{agent.type}</div>
                            </button>
                            {isCustomEndpoint && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteEndpoint(agent);
                                  setShowAgentDropdown(false);
                                }}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                title="Delete endpoint"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            )}
                          </div>
                        );
                      })}
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
              {/* Web Search Toggle */}
              {supportsWebSearch && (
                <button
                  type="button"
                  onClick={onToggleWebSearch}
                  className={cn(
                    components.buttonVariants.webSearchBase,
                    enableWebSearch
                      ? components.buttonVariants.webSearchActive
                      : components.buttonVariants.webSearchInactive
                  )}
                  title="Web Search"
                >
                  <Globe className={iconSizes.sm} />
                </button>
              )}
              {/* Knowledge Base Toggle */}
              <button
                type="button"
                onClick={onOpenKMDrawer}
                className={cn(
                  components.buttonVariants.webSearchBase,
                  enableKMSearch && activeKMConnectionsCount > 0
                    ? components.buttonVariants.webSearchActive
                    : components.buttonVariants.webSearchInactive,
                  'relative'
                )}
                title={
                  enableKMSearch && activeKMConnectionsCount > 0
                    ? `Knowledge Base Active (${activeKMConnectionsCount} connection${activeKMConnectionsCount > 1 ? 's' : ''})`
                    : activeKMConnectionsCount > 0
                    ? `Knowledge Base Configured (${activeKMConnectionsCount} connection${activeKMConnectionsCount > 1 ? 's' : ''}) - Click to enable`
                    : 'Knowledge Base - Click to configure'
                }
              >
                <Database className={iconSizes.sm} />
                {activeKMConnectionsCount > 0 && (
                  <span className={cn(
                    "absolute -top-1 -right-1 w-4 h-4 text-white text-xs rounded-full flex items-center justify-center",
                    enableKMSearch ? "bg-green-500" : "bg-gray-500"
                  )}>
                    {activeKMConnectionsCount}
                  </span>
                )}
              </button>
              {/* File Upload */}
              <FileUpload
                conversationId={conversationId}
                uploadedFiles={uploadedFiles}
                onFilesChange={setUploadedFiles}
                disabled={loading}
              />
            </div>

            {/* Active KM Connections Indicator */}
            {enableKMSearch && activeKMConnections.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-600/20 border border-purple-500/40 rounded-lg">
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-xs text-purple-300 font-medium">Knowledge Base Active</span>
                  <button
                    type="button"
                    onClick={onToggleKMSearch}
                    className="ml-1 p-0.5 hover:bg-purple-500/30 rounded transition-colors"
                    title="Disable Knowledge Base"
                  >
                    <X className="w-3 h-3 text-purple-400 hover:text-purple-200" />
                  </button>
                </div>
                {activeKMConnections.map((conn) => (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={onOpenKMDrawer}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors',
                      conn.hasSelections
                        ? 'bg-green-600/20 border border-green-500/40 text-green-300 hover:bg-green-600/30'
                        : 'bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30'
                    )}
                    title={conn.hasSelections ? `${conn.name} - Ready` : `${conn.name} - No collections selected`}
                  >
                    {conn.hasSelections ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      <span className="w-3 h-3 text-center">!</span>
                    )}
                    <span className="max-w-[120px] truncate">{conn.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Bottom Row: Text Input and Send Button */}
            <div className={cn('flex flex-col hover:backdrop-blur-lg bg-purple-900/40 border border-purple-500/30 rounded-xl', spacing.inputContainer, 'mt-4')}>
              {/* Uploaded Files Display */}
              {uploadedFiles.length > 0 && (
                <div className="uploaded-files-inline">
                  {uploadedFiles.map((file) => (
                    <div key={file.file_id} className="uploaded-file-item-inline">
                      <div className="file-info-inline">
                        <span className="file-icon">📎</span>
                        <span className="file-name-inline">{file.filename}</span>
                        <span className="file-size-inline">
                          {(file.file_size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFiles(uploadedFiles.filter((f) => f.file_id !== file.file_id));
                        }}
                        className="delete-file-button-inline"
                        title="Remove file"
                        disabled={loading}
                        type="button"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Row: Textarea and Send Button */}
              <div className={cn('flex items-end', spacing.inline)}>
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
                    className={cn(components.textarea, 'h-12 max-h-[200px] text-base placeholder-gray-400 focus:placeholder-gray-500')}
                  />
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!message.trim() || loading}
                  className={components.buttonVariants.sendButton}
                >
                  {loading ? (
                    <Loader className={cn(iconSizes.lg, 'animate-spin', colors.text.primary)} />
                  ) : (
                    <Send className={cn(iconSizes.lg, colors.text.primary)} />
                  )}
                </button>
              </div>
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