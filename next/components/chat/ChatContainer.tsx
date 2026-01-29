'use client';

import { useState } from 'react';
import { Globe, Database, Paperclip, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { useChatStore } from '@/lib/store/chat-store';
import { useChat } from '@/lib/hooks/use-chat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { KMDrawer } from '@/components/km/KMDrawer';
import { cn } from '@/lib/utils/cn';

const suggestions = [
  { text: "What's the latest news about AI?", icon: Globe },
  { text: 'Help me write a Python script', icon: Zap },
  { text: 'Explain quantum computing', icon: Sparkles },
  { text: 'Analyze this document', icon: Paperclip },
];

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const selectedAgent = useChatStore((state) => state.selectedAgent);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-8 overflow-y-auto min-h-0">
      <div className="max-w-3xl w-full animate-fadeIn">
        {/* Greeting */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-gray-100 mb-4 leading-tight">
            {selectedAgent ? (
              <>
                How can{' '}
                <span className="text-orange-500 dark:text-orange-400">
                  {selectedAgent.name}
                </span>
                {' '}help you?
              </>
            ) : (
              <>
                Welcome to{' '}
                <span className="text-orange-500 dark:text-orange-400">
                  Promethean AI
                </span>
              </>
            )}
          </h1>

          <p className="text-gray-500 dark:text-gray-500 text-base">
            {selectedAgent
              ? 'Ask anything or try one of the suggestions below'
              : 'Select an agent from the dropdown to begin'}
          </p>
        </div>

        {/* Suggestions */}
        {selectedAgent && (
          <div className="space-y-2">
            {suggestions.map((suggestion, i) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={i}
                  onClick={() => onSuggestionClick(suggestion.text)}
                  className={cn(
                    'group w-full flex items-center gap-4 p-4 rounded-xl',
                    'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800',
                    'hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700',
                    'transition-all duration-200 text-left'
                  )}
                >
                  <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-gray-300 dark:group-hover:border-gray-600 transition-colors">
                    <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors" />
                  </div>
                  <span className="flex-1 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">
                    {suggestion.text}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-gray-500 dark:group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                </button>
              );
            })}
          </div>
        )}

        {/* Capabilities hint */}
        <div className="flex items-center justify-center gap-6 mt-10 text-xs text-gray-400 dark:text-gray-600">
          <div className="flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Web Search</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>Knowledge Base</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            <span>File Analysis</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatContainer() {
  const [kmDrawerOpen, setKMDrawerOpen] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const messages = useChatStore((state) => state.messages);
  const { sendMessage, isSending } = useChat();

  const hasMessages = messages.length > 0;

  const handleSuggestionClick = (text: string) => {
    setSuggestionText(text);
  };

  return (
    <>
      <div className="flex flex-col h-full">
        {hasMessages ? (
          <MessageList />
        ) : (
          <EmptyState onSuggestionClick={handleSuggestionClick} />
        )}
        <div className="flex-shrink-0">
          <ChatInput
            onSend={sendMessage}
            disabled={isSending}
            onOpenKMDrawer={() => setKMDrawerOpen(true)}
            initialValue={suggestionText}
            onInitialValueUsed={() => setSuggestionText('')}
          />
        </div>
      </div>
      <KMDrawer isOpen={kmDrawerOpen} onClose={() => setKMDrawerOpen(false)} />
    </>
  );
}
