import React from 'react';
import { Message } from '../types';
import { Clock, Zap, CheckCircle2, XCircle } from 'lucide-react';
import { spacing } from '../styles/theme';
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
      <div className="w-full max-w-2xl space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              'flex flex-col',
              message.role === 'user' ? 'items-end' : 'items-start'
            )}
          >
            {/* User Message - Simple bubble, no avatar */}
            {message.role === 'user' && (
              <>
                <div className="px-4 py-2.5 rounded-2xl rounded-br-md bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-md max-w-[80%]">
                  <MessageContent content={message.content} isUser={true} />
                </div>
                <span className="text-xs text-gray-500 mt-1 mr-1">
                  {formatTimestamp(message.timestamp)}
                </span>
              </>
            )}

            {/* Assistant Message - No avatar */}
            {message.role === 'assistant' && (
              <>
                <div className="px-4 py-2.5 rounded-2xl rounded-tl-md bg-purple-900/40 border border-purple-500/20 text-white max-w-[90%]">
                  <MessageContent content={message.content} isUser={false} />
                </div>

                {/* Tools Used */}
                {message.tools_used && message.tools_used.length > 0 && (
                  <div className="flex flex-wrap" style={{ gap: '8px', marginTop: '10px' }}>
                    {message.tools_used.map((tool, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center rounded text-xs',
                          tool.success
                            ? 'bg-green-500/10 text-green-400'
                            : 'bg-red-500/10 text-red-400'
                        )}
                        style={{ gap: '6px', padding: '4px 10px' }}
                      >
                        {tool.success ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        <span>{tool.tool}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1.5">
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {message.metadata?.execution_time && (
                    <>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        <Zap className="w-3 h-3 text-purple-400" />
                        {message.metadata.execution_time.toFixed(2)}s
                      </span>
                    </>
                  )}
                  {message.metadata?.tokens_used && (
                    <>
                      <span>·</span>
                      <span>{message.metadata.tokens_used} tokens</span>
                    </>
                  )}
                  {message.metadata?.model && (
                    <>
                      <span>·</span>
                      <span className="text-gray-600">{message.metadata.model}</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {loading && <TypingIndicator />}
      </div>
    </div>
  );
}
