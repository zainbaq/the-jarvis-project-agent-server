import React, { useState, useRef, useEffect } from "react";
import { Send, Globe, Loader, ChevronDown, Bot, Plus, Trash2, Database, X, Check } from "lucide-react";
import { Agent, UploadedFile } from "../types";
import { colors, components, spacing, typography, iconSizes } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import { FileUpload } from "./FileUpload";
import { useDropdown } from "../hooks/useDropdown";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Use consolidated dropdown hook for click-outside handling
  const { isOpen: showAgentDropdown, toggle: toggleDropdown, close: closeDropdown, dropdownRef } = useDropdown();

  const supportsWebSearch = selectedAgent?.capabilities.includes("web_search");

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      // Enforce minimum height of 56px (h-14) to match send button
      const newHeight = Math.max(56, textareaRef.current.scrollHeight);
      textareaRef.current.style.height = newHeight + "px";
    }
  }, [message]);

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
      <div className="flex justify-center" style={{ padding: '20px 32px 28px 32px' }}>
        <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '672px' }}>
          <div className="flex flex-col">
            {/* Top Row: Agent Selector (left) + Tool Icons (right) */}
            <div className="flex items-center justify-between" style={{ marginBottom: '14px' }}>
              {/* Agent Selector */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={toggleDropdown}
                  className={components.buttonVariants.agentSelector}
                >
                  <Bot className={iconSizes.md} />
                  <ChevronDown className={iconSizes.sm} />
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
                                closeDropdown();
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
                                  closeDropdown();
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
                          closeDropdown();
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

              {/* Tool Icons - Outside text box, top right */}
              <div className={cn('flex items-center', spacing.controlGroupGap)}>
                {/* Web Search Toggle */}
                {supportsWebSearch && (
                  <button
                    type="button"
                    onClick={onToggleWebSearch}
                    className={enableWebSearch
                      ? components.buttonVariants.iconButtonActive
                      : components.buttonVariants.iconButton
                    }
                    title="Web Search"
                  >
                    <Globe className={iconSizes.md} />
                  </button>
                )}
                {/* Knowledge Base Toggle */}
                <button
                  type="button"
                  onClick={onOpenKMDrawer}
                  className={cn(
                    enableKMSearch && activeKMConnectionsCount > 0
                      ? components.buttonVariants.iconButtonActive
                      : components.buttonVariants.iconButton
                  )}
                  title={
                    enableKMSearch && activeKMConnectionsCount > 0
                      ? 'Knowledge Base Active'
                      : activeKMConnectionsCount > 0
                      ? 'Knowledge Base Configured - Click to enable'
                      : 'Knowledge Base - Click to configure'
                  }
                >
                  <Database className={iconSizes.md} />
                </button>
                {/* File Upload */}
                <FileUpload
                  conversationId={conversationId}
                  uploadedFiles={uploadedFiles}
                  onFilesChange={setUploadedFiles}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Main Input Container */}
            <div className="flex flex-col bg-purple-900/40 border border-purple-500/30 rounded-xl" style={{ padding: '18px' }}>
              {/* KM Connections Indicator - Inside text box */}
              {enableKMSearch && activeKMConnections.length > 0 && (
                <div className="flex items-center flex-wrap gap-4 mb-5 pb-5 border-b border-purple-500/20">
                  <div className="flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/40 rounded-lg">
                    <Database className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-sm text-purple-300 font-medium">Knowledge</span>
                    <button
                      type="button"
                      onClick={onToggleKMSearch}
                      className="ml-0.5 p-0.5 hover:bg-purple-500/30 rounded transition-colors"
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
                        'flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm transition-colors',
                        conn.hasSelections
                          ? 'bg-green-600/20 border border-green-500/40 text-green-300 hover:bg-green-600/30'
                          : 'bg-amber-600/20 border border-amber-500/40 text-amber-300 hover:bg-amber-600/30'
                      )}
                      title={conn.hasSelections ? `${conn.name} - Ready` : `${conn.name} - No collections selected`}
                    >
                      {conn.hasSelections ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <span className="w-3.5 h-3.5 text-center">!</span>
                      )}
                      <span className="max-w-[160px] truncate">{conn.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Uploaded Files Display - Inside text box */}
              {uploadedFiles.length > 0 && (
                <div className="flex items-center flex-wrap gap-4 mb-5 pb-5 border-b border-purple-500/20">
                  {uploadedFiles.map((file) => (
                    <div key={file.file_id} className="flex items-center gap-2.5 px-4 py-2 bg-purple-600/20 border border-purple-500/40 rounded-lg">
                      <span className="text-sm">📎</span>
                      <span className="text-sm text-purple-300 max-w-[180px] truncate">{file.filename}</span>
                      <span className="text-sm text-purple-400/60">
                        {(file.file_size / 1024).toFixed(1)}KB
                      </span>
                      <button
                        onClick={() => {
                          setUploadedFiles(uploadedFiles.filter((f) => f.file_id !== file.file_id));
                        }}
                        className="p-0.5 hover:bg-purple-500/30 rounded transition-colors"
                        title="Remove file"
                        disabled={loading}
                        type="button"
                      >
                        <X className="w-3 h-3 text-purple-400 hover:text-purple-200" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input Row: Textarea and Send Button */}
              <div className="flex items-center" style={{ gap: '16px' }}>
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
                    className={cn(components.textarea, 'h-14 max-h-[200px] text-base placeholder-gray-400 focus:placeholder-gray-500')}
                  />
                </div>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!message.trim() || loading}
                  className="rounded-xl transition-all duration-200 flex-shrink-0 flex items-center justify-center hover:bg-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  style={{
                    width: '48px',
                    height: '48px',
                    padding: '12px'
                  }}
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