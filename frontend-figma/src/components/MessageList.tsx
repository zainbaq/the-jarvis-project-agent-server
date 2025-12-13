import React from 'react';
import { Message } from '../types';
import { Bot, User, Clock, Zap, Search, CheckCircle2, XCircle } from 'lucide-react';
import { colors, components, spacing, typography, borderRadius, iconSizes } from '../styles/theme';
import { cn } from '@/components/ui/utils';
import { MessageContent } from './MessageContent';
import { TypingIndicator } from './TypingIndicator';

interface MessageListProps {
  messages: Message[];
  loading?: boolean;
}

export function MessageList({ messages, loading }: MessageListProps) {
  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className={cn('w-full flex justify-center', spacing.chatMessageList)}>
      <div className="w-full max-w-3xl space-y-10">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex',
              spacing.inlineStandard,
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            {/* Avatar - Only show for assistant */}
            {message.role === 'assistant' && (
              <div className={components.message.avatar.assistant}>
                <Bot className={cn(iconSizes.lg, 'text-purple-200')} />
              </div>
            )}

            {/* Message Content */}
            <div className={cn(
              'flex flex-col flex-1',
              message.role === 'user' ? 'items-end' : 'items-start',
              spacing.inline
            )}>
              {/* Message Bubble */}
              <div className={cn(
                'text-base leading-relaxed transition-all duration-200',
                message.role === 'user'
                  ? components.message.user
                  : components.message.assistant
              )}>
                <MessageContent
                  content={message.content}
                  isUser={message.role === 'user'}
                />
              </div>

              {/* Tools Used */}
              {message.tools_used && message.tools_used.length > 0 && (
                <div className={cn('flex flex-wrap gap-2', message.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {message.tools_used.map((tool, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1',
                        borderRadius.sm,
                        tool.success
                          ? 'bg-green-500/10 border border-green-500/30 text-green-300'
                          : 'bg-red-500/10 border border-red-500/30 text-red-300',
                        typography.body.small
                      )}
                    >
                      {tool.success ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <Search className="w-3 h-3" />
                      <span>{tool.tool}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Metadata */}
              <div className={cn('flex items-center text-sm text-gray-400', spacing.inlineStandard)}>
                {/* Timestamp */}
                <div className="flex items-center gap-1.5">
                  <Clock className={cn(iconSizes.sm, 'text-gray-500')} />
                  <span>{formatTimestamp(message.timestamp)}</span>
                </div>

                {/* Execution Time */}
                {message.metadata?.execution_time && (
                  <div className="flex items-center gap-1.5">
                    <Zap className={cn(iconSizes.sm, 'text-purple-400')} />
                    <span>{message.metadata.execution_time.toFixed(2)}s</span>
                  </div>
                )}

                {/* Tokens Used */}
                {message.metadata?.tokens_used && (
                  <span>{message.metadata.tokens_used.toLocaleString()} tokens</span>
                )}

                {/* Model */}
                {message.metadata?.model && (
                  <span className="text-gray-500">• {message.metadata.model}</span>
                )}
              </div>
            </div>

            {/* Avatar - Only show for user */}
            {message.role === 'user' && (
              <div className={components.message.avatar.user}>
                <User className={cn(iconSizes.lg, 'text-white')} />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {loading && <TypingIndicator />}
      </div>
    </div>
  );
}