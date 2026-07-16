'use client';

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gray-400 dark:text-gray-500">Thinking</span>
      <div className="flex items-center gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }} />
        <div className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }} />
      </div>
    </div>
  );
}
