'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  Send,
  ChevronDown,
  Globe,
  Database,
  Paperclip,
  X,
  FileText,
  Loader2,
  Check,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { useChatStore } from '@/lib/store/chat-store';
import { useChatAgents } from '@/lib/hooks/use-agents';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils/cn';
import type { Agent } from '@/lib/api/types';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  onOpenKMDrawer: () => void;
  initialValue?: string;
  onInitialValueUsed?: () => void;
}

export function ChatInput({
  onSend,
  disabled,
  onOpenKMDrawer,
  initialValue,
  onInitialValueUsed,
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: agents, isLoading: agentsLoading } = useChatAgents();

  const {
    selectedAgent,
    setSelectedAgent,
    webSearchEnabled,
    setWebSearchEnabled,
    kmSearchEnabled,
    codeInterpreterEnabled,
    setCodeInterpreterEnabled,
    uploadedFiles,
    addUploadedFile,
    removeUploadedFile,
    conversationId,
  } = useChatStore();

  useEffect(() => {
    if (initialValue) {
      setInput(initialValue);
      textareaRef.current?.focus();
      onInitialValueUsed?.();
    }
  }, [initialValue, onInitialValueUsed]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setAgentDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (agents && agents.length > 0 && !selectedAgent) {
      setSelectedAgent(agents[0]);
    }
  }, [agents, selectedAgent, setSelectedAgent]);

  const handleSubmit = () => {
    if (!input.trim() || disabled || !selectedAgent) return;
    onSend(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const convId = conversationId || `conv_${Date.now()}`;

      for (const file of Array.from(files)) {
        const uploaded = await apiClient.uploadFile(convId, file);
        addUploadedFile(uploaded);
      }

      if (!conversationId) {
        useChatStore.getState().setConversationId(convId);
      }
    } catch (error) {
      console.error('File upload failed:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const selectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setAgentDropdownOpen(false);
  };

  const canSend = input.trim().length > 0 && selectedAgent && !disabled;

  return (
    <div className="px-4 md:px-8 py-4 bg-gradient-to-t from-white dark:from-gray-950 via-white/90 dark:via-gray-950/90 to-transparent">
      <div className="max-w-3xl mx-auto">
        {/* Uploaded files */}
        {uploadedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {uploadedFiles.map((file) => (
              <div
                key={file.file_id}
                className="group flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
              >
                <FileText className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{file.filename}</span>
                <button
                  onClick={() => removeUploadedFile(file.file_id)}
                  className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Main input area */}
        <div
          className={cn(
            'relative rounded-2xl transition-all duration-200',
            'bg-white dark:bg-gray-900',
            'border',
            isFocused
              ? 'border-gray-300 dark:border-gray-600 shadow-lg shadow-black/5 dark:shadow-black/30'
              : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
          )}
        >
          {/* Top row - agent selector and tools */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800">
            {/* Agent selector */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setAgentDropdownOpen(!agentDropdownOpen)}
                disabled={agentsLoading}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all',
                  'hover:bg-gray-100 dark:hover:bg-gray-800',
                  agentDropdownOpen && 'bg-gray-100 dark:bg-gray-800'
                )}
              >
                {agentsLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400 dark:text-gray-500" />
                ) : (
                  <>
                    <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                      <Sparkles className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-200 font-medium">
                      {selectedAgent?.name || 'Select Agent'}
                    </span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform',
                        agentDropdownOpen && 'rotate-180'
                      )}
                    />
                  </>
                )}
              </button>

              {/* Dropdown */}
              {agentDropdownOpen && agents && (
                <div className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl dark:shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden z-50 animate-fadeIn">
                  <div className="p-1.5">
                    <div className="text-xs text-gray-400 dark:text-gray-500 px-3 py-2 uppercase tracking-wider">Models</div>
                    {agents.map((agent) => (
                      <button
                        key={agent.agent_id}
                        onClick={() => selectAgent(agent)}
                        className={cn(
                          'w-full text-left px-3 py-2.5 rounded-lg transition-all flex items-center gap-3',
                          'hover:bg-gray-100 dark:hover:bg-gray-800',
                          selectedAgent?.agent_id === agent.agent_id && 'bg-gray-100 dark:bg-gray-800'
                        )}
                      >
                        <div
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center border',
                            selectedAgent?.agent_id === agent.agent_id
                              ? 'bg-orange-50 dark:bg-gray-700 border-orange-200 dark:border-orange-500/50'
                              : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          )}
                        >
                          <Sparkles
                            className={cn(
                              'w-4 h-4',
                              selectedAgent?.agent_id === agent.agent_id
                                ? 'text-orange-500 dark:text-orange-400'
                                : 'text-gray-400 dark:text-gray-500'
                            )}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-gray-700 dark:text-gray-200 font-medium">{agent.name}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500 capitalize">{agent.type}</div>
                        </div>
                        {selectedAgent?.agent_id === agent.agent_id && (
                          <Check className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tool toggles */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  webSearchEnabled
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Web</span>
              </button>

              <button
                onClick={onOpenKMDrawer}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  kmSearchEnabled
                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Database className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Knowledge</span>
              </button>

              <button
                onClick={() => setCodeInterpreterEnabled(!codeInterpreterEnabled)}
                title="Code Interpreter - Execute Python, analyze data, generate charts"
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  codeInterpreterEnabled
                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-500/50'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Code</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all',
                  uploadedFiles.length > 0
                    ? 'bg-orange-50 dark:bg-gray-800 text-orange-500 dark:text-orange-400 border border-orange-200 dark:border-gray-600'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                )}
              >
                {isUploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Paperclip className="w-3.5 h-3.5" />
                )}
                <span className="hidden sm:inline">Files</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>
          </div>

          {/* Textarea and send button */}
          <div className="flex items-end gap-3 p-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={
                selectedAgent
                  ? `Message ${selectedAgent.name}...`
                  : 'Select an agent to start...'
              }
              disabled={disabled || !selectedAgent}
              rows={1}
              className="flex-1 bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none resize-none py-2 text-[15px] leading-relaxed"
            />

            <button
              onClick={handleSubmit}
              disabled={!canSend}
              className={cn(
                'p-3 rounded-xl transition-all duration-200 flex-shrink-0',
                canSend
                  ? 'bg-gray-900 dark:bg-gray-700 text-white hover:bg-gray-800 dark:hover:bg-gray-600 active:scale-95'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
              )}
            >
              {disabled ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400 dark:text-gray-600">
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded text-gray-500 font-mono text-[10px]">
              ↵
            </kbd>
            <span>send</span>
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded text-gray-500 font-mono text-[10px]">
              ⇧↵
            </kbd>
            <span>new line</span>
          </span>
        </div>
      </div>
    </div>
  );
}
