import React from 'react';
import { Copy, Check } from 'lucide-react';
import { colors, borderRadius, typography } from '../styles/theme';
import { cn } from '@/components/ui/utils';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Parse content for code blocks
  const parseContent = (text: string) => {
    const parts: Array<{ type: 'text' | 'code'; content: string; language?: string }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      // Add text before code block
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: text.slice(lastIndex, match.index)
        });
      }

      // Add code block
      parts.push({
        type: 'code',
        content: match[2].trim(),
        language: match[1] || 'plaintext'
      });

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex)
      });
    }

    return parts.length > 0 ? parts : [{ type: 'text' as const, content: text }];
  };

  const parts = parseContent(content);

  return (
    <div>
      {parts.map((part, index) => {
        if (part.type === 'code') {
          return (
            <div
              key={index}
              className={cn(
                'relative group mt-3 first:mt-0',
                borderRadius.sm,
                'bg-[#0d0a14] border border-purple-500/20 overflow-hidden'
              )}
            >
              {/* Language Label & Copy Button */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-purple-500/20 bg-purple-900/20">
                <span className={cn(typography.body.small, colors.text.muted)}>
                  {part.language}
                </span>
                <button
                  onClick={() => handleCopy(part.content, index)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1',
                    borderRadius.sm,
                    'hover:bg-purple-600/20 transition-all',
                    typography.body.small,
                    colors.text.secondary
                  )}
                >
                  {copiedIndex === index ? (
                    <>
                      <Check className="w-3 h-3" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              {/* Code Content */}
              <pre className="p-4 overflow-x-auto">
                <code className={cn(typography.body.small, 'text-gray-200 font-mono')}>
                  {part.content}
                </code>
              </pre>
            </div>
          );
        }

        // Regular text with inline code support
        const textWithInlineCode = part.content.split(/(`[^`]+`)/g).map((segment, i) => {
          if (segment.startsWith('`') && segment.endsWith('`')) {
            return (
              <code
                key={i}
                className={cn(
                  'px-1.5 py-0.5',
                  borderRadius.sm,
                  isUser
                    ? 'bg-white/10 text-white'
                    : 'bg-purple-600/20 text-purple-200',
                  'font-mono text-xs'
                )}
              >
                {segment.slice(1, -1)}
              </code>
            );
          }
          return segment;
        });

        return (
          <p key={index} className="whitespace-pre-wrap break-words leading-relaxed !m-0 !p-0 mt-3 first:mt-0">
            {textWithInlineCode}
          </p>
        );
      })}
    </div>
  );
}