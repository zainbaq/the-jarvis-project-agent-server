import { useState, useRef, useEffect } from 'react';
import { Agent, Message, UploadedFile } from '../types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { KMDrawer } from './KMDrawer';
import { apiClient } from '../api/client';
import { useKMConnections } from '../hooks/useKMConnections';
import { colors, spacing } from '../styles/theme';
import { cn } from '@/components/ui/utils';

interface ChatTabProps {
  agents: Agent[];
  onAddEndpoint: () => void;
  onAgentChange?: (agent: Agent | null) => void;
  onDeleteEndpoint: (agent: Agent) => void;
}

export function ChatTab({ agents, onAddEndpoint, onAgentChange, onDeleteEndpoint }: ChatTabProps) {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Notify parent when agent changes
  useEffect(() => {
    onAgentChange?.(selectedAgent);
  }, [selectedAgent, onAgentChange]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  // Generate conversation ID immediately on mount (needed for file uploads)
  const [conversationId, setConversationId] = useState<string>(() => {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  });
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [showAgentDropdown, setShowAgentDropdown] = useState(false);
  const [showKMDrawer, setShowKMDrawer] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // KM Connections hook
  const {
    isKMEnabled,
    activeConnectionIds,
    getEnabledConnectionIds,
    getActiveConnections,
    setKMEnabled,
  } = useKMConnections();

  // Build active connections list with details for display
  const activeKMConnections = getActiveConnections().map(conn => ({
    id: conn.id,
    name: conn.name,
    hasSelections: conn.selected_collection_names.length > 0 || conn.selected_corpus_ids.length > 0
  }));

  // Debug logging for KM state in ChatTab
  useEffect(() => {
    console.log('[KM DEBUG ChatTab] KM State:');
    console.log('[KM DEBUG ChatTab]   - isKMEnabled:', isKMEnabled);
    console.log('[KM DEBUG ChatTab]   - activeConnectionIds:', activeConnectionIds);
    console.log('[KM DEBUG ChatTab]   - activeKMConnections:', activeKMConnections);
  }, [isKMEnabled, activeConnectionIds, activeKMConnections]);

  // Filter chat agents (OpenAI and Endpoint types, excluding workflow-only agents)
  const chatAgents = agents.filter(
    agent => agent.type === 'openai' || agent.type === 'endpoint'
  );

  useEffect(() => {
    // Select first chat agent by default
    if (chatAgents.length > 0 && !selectedAgent) {
      setSelectedAgent(chatAgents[0]);
    }
  }, [chatAgents.length, selectedAgent]);

  useEffect(() => {
    // Clear messages and start new conversation when agent changes
    setMessages([]);
    setConversationId(`conv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`);
  }, [selectedAgent?.agent_id]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAgentDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSendMessage = async (message: string, files: UploadedFile[]) => {
    if (!selectedAgent || !message.trim()) return;

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
      const kmConnectionIds = getEnabledConnectionIds();

      // Debug logging for KM parameters being sent
      console.log('[KM DEBUG ChatTab] Sending message with KM params:');
      console.log('[KM DEBUG ChatTab]   - isKMEnabled:', isKMEnabled);
      console.log('[KM DEBUG ChatTab]   - kmConnectionIds:', kmConnectionIds);
      console.log('[KM DEBUG ChatTab]   - enable_km_search:', isKMEnabled && !!kmConnectionIds);

      const response = await apiClient.chat(selectedAgent.agent_id, {
        message,
        conversation_id: conversationId || undefined,
        enable_web_search: enableWebSearch,
        enable_km_search: isKMEnabled && !!kmConnectionIds,
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
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {!selectedAgent || messages.length === 0 ? (
          <div
            className={cn(
              'flex items-center justify-center h-full',
              spacing.chatEmptyState,
              'pb-32' // 👈 ADD THIS
            )}
          >
            <div className="text-center max-w-3xl">
              {/* Title */}
              <h3 className={cn('text-3xl font-semibold', colors.text.primary, 'mb-6')}>Start a conversation</h3>

              {/* Description */}
              <p className={cn(colors.text.secondary, 'mb-10 leading-relaxed text-base')}>
                {selectedAgent ? selectedAgent.description : 'Select an agent from the dropdown below to begin chatting'}
              </p>
              
              {/* Capability Tags
              {selectedAgent && (
                <div className="flex flex-wrap gap-3 justify-center">
                  {selectedAgent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className={cn(components.tag, 'font-medium')}
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              )} */}
            </div>
          </div>
        ) : (
          <MessageList messages={messages} loading={loading} />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        conversationId={conversationId}
        loading={loading}
        enableWebSearch={enableWebSearch}
        onToggleWebSearch={() => setEnableWebSearch(!enableWebSearch)}
        enableKMSearch={isKMEnabled}
        activeKMConnectionsCount={activeConnectionIds.length}
        activeKMConnections={activeKMConnections}
        onOpenKMDrawer={() => setShowKMDrawer(true)}
        onToggleKMSearch={() => setKMEnabled(!isKMEnabled)}
        selectedAgent={selectedAgent}
        agents={chatAgents}
        onAgentChange={setSelectedAgent}
        onAddEndpoint={onAddEndpoint}
        onDeleteEndpoint={onDeleteEndpoint}
      />

      {/* KM Drawer */}
      <KMDrawer
        isOpen={showKMDrawer}
        onClose={() => setShowKMDrawer(false)}
      />
    </div>
  );
}