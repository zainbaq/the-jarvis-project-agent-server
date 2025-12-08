// Chat Message - displays a single message
// Shows user or assistant message with formatting

import { formatDate } from '../../lib/utils';
import type { Message } from '../../types/chat';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[70%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-primary-600 text-white'
            : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">{message.content}</div>

        {/* Timestamp */}
        <div
          className={`text-xs mt-2 ${
            isUser ? 'text-primary-100' : 'text-gray-500'
          }`}
        >
          {formatDate(message.timestamp)}
        </div>

        {/* Tool results */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600 mb-1">Tools used:</p>
            {message.toolsUsed.map((tool, idx) => (
              <div key={idx} className="text-xs text-gray-500">
                • {tool.tool}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
