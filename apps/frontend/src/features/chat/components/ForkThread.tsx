'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageBlock } from './MessageBlock';

// On définit une interface locale plus simple pour les messages de fork
interface SimpleMessage {
  role: string;
  content: string;
}

interface ForkThreadProps {
  selectedText: string;
  messages: SimpleMessage[]; // Utilisation du type simplifié
  onSendMessage: (content: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function ForkThread({
  selectedText,
  messages,
  onSendMessage,
  onClose,
  isLoading = false
}: ForkThreadProps) {
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas à chaque nouveau message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSubmitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSendMessage(input);
      setInput('');
    } catch (error) {
      console.error("Erreur envoi fork:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100 shadow-2xl">
      {/* HEADER */}
      <div className="h-[57px] px-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <h3 className="font-semibold text-sm text-gray-900">Précision contextuelle</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        {/* Rappel du contexte */}
        <div className="p-4 bg-blue-50/50 border-b border-blue-100/50 sticky top-0 z-10 backdrop-blur-sm">
          <p className="text-[10px] text-blue-600 mb-1 font-bold uppercase tracking-wider">Passage sélectionné</p>
          <p className="text-sm text-gray-700 italic border-l-2 border-blue-400 pl-3 py-1 bg-white/50 rounded-r-lg">
            "{selectedText}"
          </p>
        </div>

        {/* FIL DE DISCUSSION SIMPLIFIÉ */}
        <div className="p-4 space-y-8">
          {messages.map((msg, idx) => (
            <div key={idx} className="animate-in fade-in duration-500">
              <MessageBlock role={msg.role} content={msg.content} />
            </div>
          ))}

          {isSubmitting && (
            <div className="flex justify-start p-2">
              <div className="flex space-x-1 animate-pulse">
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full" />
                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full [animation-delay:0.2s]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* INPUT */}
      <div className="p-4 border-t border-gray-100 bg-white">
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            autoFocus
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Écrivez votre précision..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none max-h-32"
          />
          <button
            type="submit"
            disabled={!input.trim() || isSubmitting}
            className="absolute right-2 bottom-2 p-2 text-blue-600 disabled:opacity-30 transition-opacity"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}