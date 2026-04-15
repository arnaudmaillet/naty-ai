'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function MessageList({ messages, isLoading }: { messages: Message[], isLoading: boolean }) {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-gradient-to-b from-gray-50 to-white">
      {messages.map((msg, i) => (
        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
          <div className={`flex gap-3 max-w-[85%] md:max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold shadow-sm ${
              msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'
            }`}>
              {msg.role === 'user' ? 'ME' : 'AI'}
            </div>
            
            {/* Bulle de message */}
            <div className={`rounded-2xl px-4 py-2.5 shadow-sm border ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white border-blue-500' 
                : 'bg-white text-gray-800 border-gray-100'
            }`}>
              {/* Rendu Markdown pour l'Assistant, Texte brut pour l'User */}
              {msg.role === 'assistant' ? (
                <div className="prose prose-sm md:prose-base max-w-none prose-slate break-words overflow-x-auto
                  prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-pink-500 prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              ) : (
                <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {isLoading && (
        <div className="flex justify-start">
          <div className="ml-11 bg-white border border-gray-100 rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}