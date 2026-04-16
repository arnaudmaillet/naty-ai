'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@naty-ai/shared-types';

export function MessageList({ messages, isLoading }: { messages: Message[], isLoading: boolean }) {
    return (
        <div className="flex-1 overflow-y-auto bg-white">
            {/* Container avec une largeur maximale pour la lecture (max-w-3xl est le standard) */}
            <div className="max-w-3xl mx-auto px-4 py-8 md:px-6 md:py-12 space-y-10">

                {messages.map((msg, i) => (
                    <div
                        key={i}
                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-500`}
                    >
                        {msg.role === 'user' ? (
                            /* Message UTILISATEUR : Bulle grise discrète alignée à droite */
                            <div className="max-w-[80%] bg-gray-100 text-gray-800 rounded-2xl px-4 py-2 text-sm md:text-base shadow-sm border border-gray-200/50">
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            </div>
                        ) : (
                            /* Message IA : Pleine largeur, pas de bulle, typographie soignée */
                            <div className="w-full prose prose-slate max-w-none 
  prose-p:leading-7 prose-p:text-gray-700 prose-p:mb-4
  prose-headings:text-gray-900 prose-headings:font-semibold
  prose-strong:text-gray-900
  
  /* --- CODE INLINE (au milieu d'une phrase) --- */
  /* On garde un fond très léger mais on s'assure qu'il ne pollue pas les blocs PRE */
  prose-code:text-blue-600 
  prose-code:bg-gray-100 
  prose-code:px-1 
  prose-code:py-0.5 
  prose-code:rounded 
  prose-code:before:content-none 
  prose-code:after:content-none
  prose-code:font-medium

  /* --- BLOCS DE CODE (Multilignes) --- */
  prose-pre:bg-gray-100 
  prose-pre:text-gray-800 
  prose-pre:rounded-xl 
  prose-pre:shadow-sm
  prose-pre:prose-code:bg-transparent 
  prose-pre:prose-code:text-gray-800
  prose-pre:prose-code:p-0

  prose-li:text-gray-700 prose-ul:list-disc prose-ol:list-decimal">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                ))}

                {/* Indicateur de chargement minimaliste */}
                {isLoading && (
                    <div className="flex justify-start animate-pulse">
                        <div className="flex space-x-2 items-center">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                            <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}