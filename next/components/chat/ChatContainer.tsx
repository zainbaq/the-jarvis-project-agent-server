'use client';

import { useState, useMemo } from 'react';
import { Globe, Database, Paperclip, ArrowRight, Sparkles, Zap, Code, BookOpen, Search, FileText, BarChart, Brain, Lightbulb, MessageSquare } from 'lucide-react';
import { useChatStore } from '@/lib/store/chat-store';
import { useChat } from '@/lib/hooks/use-chat';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { KMDrawer } from '@/components/km/KMDrawer';
import { cn } from '@/lib/utils/cn';
import type { LucideIcon } from 'lucide-react';

// Pool of suggestions organized by category for variety
const suggestionPool = {
  web: [
    { text: "What's trending in tech news today?", icon: Globe },
    { text: "Search for recent AI breakthroughs", icon: Search },
    { text: "Find the latest developments in renewable energy", icon: Globe },
    { text: "What are the top stories in science right now?", icon: Search },
  ],
  coding: [
    { text: "Help me write a Python data analysis script", icon: Code },
    { text: "Debug this React component for me", icon: Zap },
    { text: "Explain how async/await works in JavaScript", icon: Code },
    { text: "Write a function to sort an array efficiently", icon: Zap },
  ],
  learning: [
    { text: "Explain machine learning in simple terms", icon: Brain },
    { text: "What is blockchain and how does it work?", icon: Lightbulb },
    { text: "Teach me about REST API design principles", icon: BookOpen },
    { text: "How do neural networks learn?", icon: Sparkles },
  ],
  files: [
    { text: "Analyze this document and summarize key points", icon: FileText },
    { text: "Extract insights from my CSV data", icon: BarChart },
    { text: "Help me understand this PDF report", icon: Paperclip },
    { text: "Compare these two documents for differences", icon: FileText },
  ],
};

type Suggestion = { text: string; icon: LucideIcon };

// Get random suggestions from the pool
function getRandomSuggestions(count: number = 4): Suggestion[] {
  const allSuggestions = Object.values(suggestionPool).flat();
  const shuffled = [...allSuggestions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function EmptyState({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) {
  const selectedAgent = useChatStore((state) => state.selectedAgent);

  // Randomize suggestions on mount - useMemo with empty deps ensures it only runs once per mount
  const suggestions = useMemo(() => getRandomSuggestions(4), []);

  return (
    <div className="flex-1 flex flex-col items-center justify-start px-3 md:px-8 pt-4 md:pt-8 pb-2 md:pb-4 overflow-y-auto min-h-0">
      <div className="max-w-2xl w-full animate-fadeIn">
        {/* Greeting */}
        <div className="text-center mb-4 md:mb-6">
          <h1 className="text-xl md:text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2 md:mb-3 leading-tight">
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

          <p className="text-gray-500 dark:text-gray-500 text-xs md:text-sm">
            {selectedAgent
              ? 'Ask anything or try one of the suggestions below'
              : 'Select an agent from the dropdown to begin'}
          </p>
        </div>

        {/* Suggestions */}
        {selectedAgent && (
          <div className="space-y-1.5 md:space-y-2">
            {suggestions.map((suggestion, i) => {
              const Icon = suggestion.icon;
              return (
                <button
                  key={i}
                  onClick={() => onSuggestionClick(suggestion.text)}
                  className={cn(
                    'group w-full flex items-center gap-2 md:gap-3 px-2.5 py-2 md:px-3 md:py-2.5 rounded-lg',
                    'bg-white dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800',
                    'hover:bg-gradient-to-r hover:from-orange-50 hover:to-white dark:hover:from-orange-950/20 dark:hover:to-gray-900/80',
                    'hover:border-orange-200 dark:hover:border-orange-900/50',
                    'hover:shadow-sm',
                    'transition-all duration-200 ease-out text-left',
                    'animate-fadeIn'
                  )}
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center group-hover:border-orange-300 dark:group-hover:border-orange-800 group-hover:from-orange-50 group-hover:to-orange-100 dark:group-hover:from-orange-950/30 dark:group-hover:to-orange-900/20 transition-all duration-200 flex-shrink-0">
                    <Icon className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-400 dark:text-gray-500 group-hover:text-orange-500 dark:group-hover:text-orange-400 transition-colors duration-200" />
                  </div>
                  <span className="flex-1 text-xs md:text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors duration-200 line-clamp-2">
                    {suggestion.text}
                  </span>
                  <ArrowRight className="w-3 h-3 md:w-3.5 md:h-3.5 text-gray-300 dark:text-gray-700 group-hover:text-orange-500 dark:group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all duration-200 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {/* Capabilities hint - hidden on mobile */}
        <div className="hidden sm:flex items-center justify-center gap-6 mt-6 text-xs text-gray-400 dark:text-gray-600">
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
