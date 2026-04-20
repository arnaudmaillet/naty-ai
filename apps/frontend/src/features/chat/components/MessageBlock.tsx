// apps/frontend/src/app/components/chat/ChatBlock.tsx
import { BlockType, MessageRole } from '@naty-ai/shared-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBlockProps {
  role: string;
  content: string;
  type?: string;
  isStreaming?: boolean;
}

export const MessageBlock = ({
  role,
  content,
  type = BlockType.TEXT,
  isStreaming = false
}: MessageBlockProps) => {
  const isUser = role === MessageRole.USER;

  if (isUser) {
    return (
      <div className="w-full flex justify-end mb-4">
        <div className="max-w-[85%] bg-blue-600 text-white rounded-2xl px-4 py-2.5 text-sm shadow-md">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full mb-6 group ${isStreaming ? 'animate-pulse-subtle' : ''}`}>
      {type === BlockType.CODE || content.startsWith('```') ? (
        <div className="relative">
          <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl overflow-x-auto text-xs font-mono my-3 shadow-lg border border-gray-800">
            <code>
              {content.replace(/```[a-z]*/g, '')}
            </code>
          </pre>
          <div className="absolute top-2 right-2 text-[10px] text-gray-500 font-mono uppercase tracking-widest">Code</div>
        </div>
      ) : (
        <div className="prose prose-slate max-w-none prose-p:leading-7 prose-p:text-gray-700">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({ children }) => (
                <p className="mb-4 last:mb-0">
                  {children}
                </p>
              )
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};