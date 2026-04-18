// apps/frontend/src/app/components/chat/ChatBlock.tsx
import { BlockType, MessageRole } from '@naty-ai/shared-types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBlockProps {
  role: string;
  content: string;
  type?: string; // 'text' ou 'code'
}

export const MessageBlock = ({ role, content, type = BlockType.TEXT }: MessageBlockProps) => {
  const isUser = role === MessageRole.USER;

  if (isUser) {
    return (
      <div className="w-full flex justify-end">
        <div className="max-w-[85%] bg-gray-100 text-gray-800 rounded-2xl px-4 py-2 text-sm shadow-sm border border-gray-200/50 select-none">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {type === 'code' ? (
        <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl overflow-x-auto text-xs font-mono my-3 shadow-inner">
          <code>{content}</code>
        </pre>
      ) : (
        <div className="prose prose-slate max-w-none prose-p:leading-7 prose-p:text-gray-700 selection:bg-blue-100">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
};