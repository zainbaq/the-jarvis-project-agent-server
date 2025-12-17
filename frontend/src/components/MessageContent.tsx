import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check } from 'lucide-react';
import { colors, borderRadius, typography } from '../styles/theme';
import { cn } from '@/components/ui/utils';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

export function MessageContent({ content, isUser }: MessageContentProps) {
  const [copiedBlock, setCopiedBlock] = React.useState<string | null>(null);

  const handleCopy = (text: string, blockId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedBlock(blockId);
    setTimeout(() => setCopiedBlock(null), 2000);
  };

  // Custom components for react-markdown
  const components = {
    // Code blocks
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : 'text';
      const codeContent = String(children).replace(/\n$/, '');
      const blockId = `code-${codeContent.slice(0, 20)}`;

      if (!inline) {
        return (
          <div className={cn(
            'relative group my-3',
            borderRadius.sm,
            'bg-[#0d0a14] border border-purple-500/20 overflow-hidden'
          )}>
            {/* Language Label & Copy Button */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-purple-500/20 bg-purple-900/20">
              <span className={cn(typography.body.small, colors.text.muted)}>
                {language}
              </span>
              <button
                onClick={() => handleCopy(codeContent, blockId)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1',
                  borderRadius.sm,
                  'hover:bg-purple-600/20 transition-all',
                  typography.body.small,
                  colors.text.secondary
                )}
              >
                {copiedBlock === blockId ? (
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
              <code className={cn(typography.body.small, 'text-gray-200 font-mono')} {...props}>
                {children}
              </code>
            </pre>
          </div>
        );
      }

      // Inline code
      return (
        <code
          className={cn(
            'px-1.5 py-0.5',
            borderRadius.sm,
            isUser
              ? 'bg-white/10 text-white'
              : 'bg-purple-600/20 text-purple-200',
            'font-mono text-xs'
          )}
          {...props}
        >
          {children}
        </code>
      );
    },

    // Paragraphs
    p: ({ children }: any) => (
      <p className="my-2 first:mt-0 last:mb-0 leading-relaxed">
        {children}
      </p>
    ),

    // Headings
    h1: ({ children }: any) => (
      <h1 className="text-xl font-bold mt-4 mb-2 first:mt-0 text-white">
        {children}
      </h1>
    ),
    h2: ({ children }: any) => (
      <h2 className="text-lg font-bold mt-4 mb-2 first:mt-0 text-white">
        {children}
      </h2>
    ),
    h3: ({ children }: any) => (
      <h3 className="text-base font-semibold mt-3 mb-2 first:mt-0 text-white">
        {children}
      </h3>
    ),
    h4: ({ children }: any) => (
      <h4 className="text-sm font-semibold mt-3 mb-1 first:mt-0 text-white">
        {children}
      </h4>
    ),

    // Lists
    ul: ({ children }: any) => (
      <ul className="my-2 ml-4 space-y-1 list-disc list-outside">
        {children}
      </ul>
    ),
    ol: ({ children }: any) => (
      <ol className="my-2 ml-4 space-y-1 list-decimal list-outside">
        {children}
      </ol>
    ),
    li: ({ children }: any) => (
      <li className="leading-relaxed">
        {children}
      </li>
    ),

    // Links
    a: ({ href, children }: any) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          isUser
            ? 'text-white underline hover:text-white/80'
            : 'text-purple-300 hover:text-purple-200 underline'
        )}
      >
        {children}
      </a>
    ),

    // Blockquotes
    blockquote: ({ children }: any) => (
      <blockquote className={cn(
        'my-3 pl-4 border-l-2',
        isUser
          ? 'border-white/30 text-white/80'
          : 'border-purple-500/40 text-gray-300',
        'italic'
      )}>
        {children}
      </blockquote>
    ),

    // Horizontal rule
    hr: () => (
      <hr className={cn(
        'my-4 border-t',
        isUser ? 'border-white/20' : 'border-purple-500/20'
      )} />
    ),

    // Strong/Bold
    strong: ({ children }: any) => (
      <strong className="font-semibold">
        {children}
      </strong>
    ),

    // Emphasis/Italic
    em: ({ children }: any) => (
      <em className="italic">
        {children}
      </em>
    ),

    // Tables (GFM)
    table: ({ children }: any) => (
      <div className="my-3 overflow-x-auto">
        <table className={cn(
          'min-w-full border-collapse',
          isUser ? 'border-white/20' : 'border-purple-500/20'
        )}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className={cn(
        isUser ? 'bg-white/10' : 'bg-purple-900/30'
      )}>
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody>{children}</tbody>
    ),
    tr: ({ children }: any) => (
      <tr className={cn(
        'border-b',
        isUser ? 'border-white/10' : 'border-purple-500/10'
      )}>
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th className={cn(
        'px-3 py-2 text-left text-sm font-semibold',
        isUser ? 'text-white' : 'text-purple-200'
      )}>
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className="px-3 py-2 text-sm">
        {children}
      </td>
    ),

    // Task lists (GFM)
    input: ({ checked }: any) => (
      <input
        type="checkbox"
        checked={checked}
        disabled
        className="mr-2 accent-purple-500"
      />
    ),
  };

  return (
    <div className={cn(
      'prose prose-sm max-w-none',
      isUser ? 'prose-invert' : ''
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
