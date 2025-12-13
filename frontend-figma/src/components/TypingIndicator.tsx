import React from 'react';
import { Bot } from 'lucide-react';
import { colors, borderRadius } from '../styles/theme';
import { cn } from '@/components/ui/utils';

export function TypingIndicator() {
  return (
    <div className="flex gap-4 justify-start">
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-10 h-10',
        borderRadius.md,
        'bg-purple-600/20 border',
        colors.border.input,
        'flex items-center justify-center'
      )}>
        <Bot className={cn('w-5 h-5', colors.text.accent)} />
      </div>

      {/* Typing Animation */}
      <div className={cn(
        'flex items-center px-4 py-3',
        borderRadius.md,
        'bg-purple-900/20 border',
        colors.border.input
      )}>
        <div className="flex gap-1.5">
          <div 
            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '0ms' }}
          />
          <div 
            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '150ms' }}
          />
          <div 
            className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
            style={{ animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
