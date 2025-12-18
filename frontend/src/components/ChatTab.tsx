import { useState, useEffect } from 'react';
import { Agent, UploadedFile } from '../types';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { KMDrawer } from './KMDrawer';
import { useKMConnectionsContext } from '../contexts/KMConnectionsContext';
import { useChatSession } from '../hooks/useChatSession';
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
  const [enableWebSearch, setEnableWebSearch] = useState(false);
  const [showKMDrawer, setShowKMDrawer] = useState(false);

  // Use consolidated chat session hook
  const { messages, loading, conversationId, messagesEndRef, sendMessage } = useChatSession(selectedAgent);

  // KM Connections from shared context
  const {
    isKMEnabled,
    activeConnectionIds,
    getEnabledConnectionIds,
    getActiveConnections,
    setKMEnabled,
  } = useKMConnectionsContext();

  // Build active connections list with details for display
  const activeKMConnections = getActiveConnections().map(conn => ({
    id: conn.id,
    name: conn.name,
    hasSelections: conn.selected_collection_names.length > 0 || conn.selected_corpus_ids.length > 0
  }));

  // Notify parent when agent changes
  useEffect(() => {
    onAgentChange?.(selectedAgent);
  }, [selectedAgent, onAgentChange]);

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

  // Select first chat agent by default
  useEffect(() => {
    if (chatAgents.length > 0 && !selectedAgent) {
      setSelectedAgent(chatAgents[0]);
    }
  }, [chatAgents.length, selectedAgent]);

  const handleSendMessage = (message: string, files: UploadedFile[]) => {
    const kmConnectionIds = getEnabledConnectionIds();

    // Debug logging for KM parameters being sent
    console.log('[KM DEBUG ChatTab] Sending message with KM params:');
    console.log('[KM DEBUG ChatTab]   - isKMEnabled:', isKMEnabled);
    console.log('[KM DEBUG ChatTab]   - kmConnectionIds:', kmConnectionIds);
    console.log('[KM DEBUG ChatTab]   - enable_km_search:', isKMEnabled && !!kmConnectionIds);

    sendMessage(message, {
      enableWebSearch,
      enableKMSearch: isKMEnabled,
      kmConnectionIds,
      files
    });
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
              'pb-32'
            )}
          >
            <div className="text-center max-w-2xl">
              {/* Title */}
              <h3 className={cn('text-3xl font-semibold', colors.text.primary, 'mb-6')}>Start a conversation</h3>

              {/* Description */}
              <p className={cn(colors.text.secondary, 'mb-10 leading-relaxed text-base')}>
                {selectedAgent ? selectedAgent.description : 'Select an agent from the dropdown below to begin chatting'}
              </p>
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
