// apps/frontend/src/app/components/chat/MessageBlock.tsx
import { BlockType, MessageRole } from '@naty-ai/shared-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from "../../../../lib/utils";
import { Terminal, Copy } from 'lucide-react';
import { memo } from 'react';

interface MessageBlockProps {
  role: string;
  content: string;
  type?: string;
  isStreaming?: boolean;
}

export const MessageBlock = memo(({
  role,
  content,
  type = BlockType.TEXT,
  isStreaming = false
}: MessageBlockProps) => {
  const isUser = role === MessageRole.USER;

  if (!content) {
    return null;
  }

  // --- RENDU UTILISATEUR ---
  if (isUser) {
    return (
      <div className="w-full flex justify-end">
        <div className="max-w-[85%] bg-zinc-100 rounded-2xl px-4 py-2.5 text-sm">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  // --- RENDU ASSISTANT (MARKDOWN + CODE) ---
  return (
    <div className={cn(
      "w-full transition-all duration-300",
      isStreaming ? "opacity-50" : "opacity-100"
    )}>
      {type === BlockType.CODE || content.startsWith('```') ? (
        <div className="my-4 rounded-xl overflow-hidden border border-zinc-200 shadow-sm bg-zinc-50">
          <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 bg-zinc-100/80">
            <div className="flex items-center gap-2">
              <Terminal size={14} className="text-zinc-500" />
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                Source Code
              </span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(content.replace(/```[a-z]*/g, ''))}
              className="p-1 hover:bg-zinc-200 rounded transition-colors text-zinc-400 hover:text-zinc-600"
            >
              <Copy size={14} />
            </button>
          </div>

          <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono text-zinc-800 custom-scrollbar">
            <code>
              {content.replace(/```[a-z]*/g, '').trim()}
            </code>
          </pre>
        </div>
      ) : (
        <div className="prose prose-zinc max-w-none 
          prose-p:leading-7 prose-p:text-zinc-800 prose-p:mb-4 prose-p:last:mb-0
          prose-headings:text-zinc-900 prose-headings:font-bold prose-headings:mt-6 prose-headings:mb-3
          prose-strong:text-zinc-900 prose-strong:font-bold
          prose-code:text-zinc-900 prose-code:bg-zinc-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
          prose-ul:my-4 prose-li:my-1
          prose-blockquote:border-l-zinc-300 prose-blockquote:italic prose-blockquote:text-zinc-600">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
});