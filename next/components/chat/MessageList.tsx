'use client';

import { useEffect, useRef, useState } from 'react';
import { User, Globe, Database, FileText, Copy, Check, Sparkles, Download, ChevronDown, Code, ImageIcon, Terminal, X as XIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useChatStore } from '@/lib/store/chat-store';
import { TypingIndicator } from './TypingIndicator';
import { ActivityIndicator } from './ActivityIndicator';
import { cn } from '@/lib/utils/cn';
import type { Message, GeneratedFile, CodeExecutionResult } from '@/lib/api/types';

// Component for displaying inline images from code interpreter
function InlineImage({ file }: { file: GeneratedFile }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!file.inline_data) return null;

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
      <img
        src={`data:${file.mime_type};base64,${file.inline_data}`}
        alt={file.filename}
        className={cn(
          "w-full h-auto cursor-pointer transition-all",
          isExpanded ? "max-h-none" : "max-h-80 object-contain"
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      />
      <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{file.filename}</span>
        <a
          href={file.download_url}
          download={file.filename}
          className="flex items-center gap-1.5 text-sm text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Download</span>
        </a>
      </div>
    </div>
  );
}

// Component for displaying downloadable generated files (non-image)
function GeneratedFileChip({ file }: { file: GeneratedFile }) {
  const isImage = file.content_type === 'image';

  return (
    <a
      href={file.download_url}
      download={file.filename}
      className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-lg text-sm text-green-700 dark:text-green-400 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
    >
      {isImage ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
      <span className="max-w-[150px] truncate">{file.filename}</span>
      <Download className="w-3 h-3 opacity-60" />
    </a>
  );
}

// Component for displaying code execution results
function CodeExecutionBlock({ execution }: { execution: CodeExecutionResult }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="my-3 rounded-xl border border-purple-200 dark:border-purple-700/50 overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Code Execution</span>
          {execution.success ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <XIcon className="w-4 h-4 text-red-500" />
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-purple-400 transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="bg-gray-900 text-gray-100">
          {/* Code */}
          <div className="p-4 border-b border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Code</span>
            </div>
            <pre className="text-sm overflow-x-auto whitespace-pre-wrap text-blue-300">{execution.code}</pre>
          </div>

          {/* Output */}
          {execution.output && (
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Output</span>
              </div>
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap text-green-400">{execution.output}</pre>
            </div>
          )}

          {/* Error */}
          {execution.error && (
            <div className="p-4 bg-red-950/50">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-red-400 uppercase tracking-wider">Error</span>
              </div>
              <pre className="text-sm overflow-x-auto whitespace-pre-wrap text-red-400">{execution.error}</pre>
            </div>
          )}

          {/* Files generated in this execution */}
          {execution.generated_files && execution.generated_files.length > 0 && (
            <div className="p-4 bg-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-400 uppercase tracking-wider">Generated Files</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {execution.generated_files.map((file) => (
                  <GeneratedFileChip key={file.file_id} file={file} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, isLatest, isStreaming }: { message: Message; isLatest: boolean; isStreaming: boolean }) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      className={cn(
        'group relative',
        isUser ? 'flex justify-end' : 'flex justify-start'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div
        className={cn(
          'flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%]',
          isUser ? 'flex-row-reverse' : 'flex-row'
        )}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-gray-200 dark:bg-gradient-to-br dark:from-gray-600 dark:to-gray-700 flex items-center justify-center shadow-sm dark:shadow-md">
              <User className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 dark:text-gray-300" />
            </div>
          ) : (
            <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm dark:shadow-md">
              <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 dark:text-orange-400" />
            </div>
          )}
        </div>

        {/* Message content */}
        <div className={cn('flex flex-col gap-1 min-w-0 overflow-hidden', isUser ? 'items-end' : 'items-start')}>
          {/* Attached files */}
          {message.attachedFiles && message.attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-1">
              {message.attachedFiles.map((file) => (
                <div
                  key={file.file_id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                  <span className="max-w-[150px] truncate">{file.filename}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bubble */}
          <div
            className={cn(
              'relative px-3 py-2.5 md:px-4 md:py-3 rounded-xl md:rounded-2xl transition-all duration-200 max-w-full overflow-hidden',
              isUser
                ? 'bg-gray-100 dark:bg-gradient-to-br dark:from-gray-700 dark:to-gray-800 text-gray-900 dark:text-white shadow-sm dark:shadow-lg shadow-black/5 dark:shadow-black/20'
                : 'bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 shadow-sm dark:shadow-lg shadow-black/5 dark:shadow-black/10',
              isLatest && !isUser && 'animate-fadeIn'
            )}
          >
            {/* Subtle accent line */}
            {!isUser && (
              <div className="absolute left-0 top-2.5 bottom-2.5 md:top-3 md:bottom-3 w-0.5 bg-gradient-to-b from-orange-400/60 to-orange-300/40 dark:from-orange-400/60 dark:to-orange-500/40 rounded-full" />
            )}

            {isUser ? (
              <p className="relative text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
            ) : (
              <div className="relative prose prose-gray dark:prose-invert prose-sm max-w-none overflow-hidden break-words prose-p:my-1.5 md:prose-p:my-2 prose-headings:my-2 md:prose-headings:my-3 prose-pre:my-2 prose-pre:overflow-x-auto prose-code:text-orange-600 dark:prose-code:text-orange-300 prose-code:bg-orange-50 dark:prose-code:bg-orange-500/10 prose-code:px-1 md:prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:break-all prose-pre:bg-gray-100 dark:prose-pre:bg-black/30 prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-white/10 prose-pre:text-xs md:prose-pre:text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
                {/* Streaming cursor */}
                {isStreaming && (
                  <span className="inline-block w-2 h-4 md:h-5 ml-0.5 bg-orange-400 dark:bg-orange-500 animate-pulse rounded-sm" />
                )}
              </div>
            )}
          </div>

          {/* Tools used */}
          {message.tools_used && message.tools_used.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-1">
              {message.tools_used.map((tool, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs transition-all',
                    tool.success
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                      : 'bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                  )}
                >
                  {tool.tool === 'web_search' && <Globe className="w-3 h-3" />}
                  {tool.tool === 'km_search' && <Database className="w-3 h-3" />}
                  {tool.tool === 'file_search' && <FileText className="w-3 h-3" />}
                  {tool.tool === 'code_interpreter' && <Terminal className="w-3 h-3" />}
                  <span>{tool.tool.replace(/_/g, ' ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Code executions from code interpreter */}
          {message.codeExecutions && message.codeExecutions.length > 0 && (
            <div className="w-full mt-2">
              {message.codeExecutions.map((exec, idx) => (
                <CodeExecutionBlock key={idx} execution={exec} />
              ))}
            </div>
          )}

          {/* Generated images (displayed inline) */}
          {message.generatedFiles?.filter(f => f.content_type === 'image' && f.inline_data).map((file) => (
            <InlineImage key={file.file_id} file={file} />
          ))}

          {/* Non-image generated files (displayed as downloadable chips) */}
          {message.generatedFiles?.filter(f => f.content_type !== 'image' || !f.inline_data).length ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.generatedFiles
                .filter(f => f.content_type !== 'image' || !f.inline_data)
                .map((file) => (
                  <GeneratedFileChip key={file.file_id} file={file} />
                ))}
            </div>
          ) : null}

          {/* Metadata footer */}
          <div className={cn(
            'flex items-center gap-3 mt-1.5 text-xs transition-all duration-200',
            showActions ? 'opacity-100' : 'opacity-40'
          )}>
            {message.metadata?.model && (
              <span className="text-gray-400 dark:text-gray-500">{message.metadata.model}</span>
            )}
            {message.metadata?.tokens_used && (
              <span className="text-gray-400 dark:text-gray-600">{message.metadata.tokens_used} tokens</span>
            )}
            <span className="text-gray-400 dark:text-gray-600">{formatTime()}</span>

            {/* Copy button */}
            {!isUser && (
              <button
                onClick={copyToClipboard}
                className={cn(
                  'p-1 rounded transition-all',
                  copied
                    ? 'text-orange-500 dark:text-orange-400'
                    : 'text-gray-400 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400'
                )}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function MessageList() {
  const messages = useChatStore((state) => state.messages);
  const isLoading = useChatStore((state) => state.isLoading);
  const streamingMessageId = useChatStore((state) => state.streamingMessageId);
  const currentStatus = useChatStore((state) => state.currentStatus);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isLoading, streamingMessageId, currentStatus]);

  if (messages.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto overflow-x-hidden px-3 md:px-8 py-4 md:py-6 min-h-0"
    >
      <div className="max-w-3xl mx-auto space-y-4 md:space-y-6 overflow-hidden">
        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            isLatest={index === messages.length - 1}
            isStreaming={message.id === streamingMessageId}
          />
        ))}

        {/* Show activity indicator when there's a status (regardless of streaming state) */}
        {currentStatus && (
          <div className="flex justify-start">
            <div className="flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%]">
              <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm dark:shadow-md">
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 dark:text-orange-400 animate-pulse" />
              </div>
              <div className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/50 rounded-xl md:rounded-2xl px-3 py-2.5 md:px-4 md:py-3 shadow-sm dark:shadow-lg">
                <ActivityIndicator status={currentStatus} />
              </div>
            </div>
          </div>
        )}

        {/* Show typing indicator when loading but not streaming and no status */}
        {isLoading && !streamingMessageId && !currentStatus && (
          <div className="flex justify-start">
            <div className="flex gap-2 md:gap-3 max-w-[90%] md:max-w-[85%]">
              <div className="w-7 h-7 md:w-9 md:h-9 rounded-lg md:rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm dark:shadow-md">
                <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-500 dark:text-orange-400 animate-pulse" />
              </div>
              <div className="bg-white dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/50 rounded-xl md:rounded-2xl px-3 py-2.5 md:px-4 md:py-3 shadow-sm dark:shadow-lg">
                <TypingIndicator />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
