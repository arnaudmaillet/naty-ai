'use client';

import React, { useState, useRef, useCallback, memo, useMemo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { MessageBlock } from './MessageBlock';
import { ChatInput } from './ChatInput';

interface SimpleMessage {
  id?: string;
  role: string;
  content: string;
}

interface ForkThreadProps {
  selectedText: string;
  messages: SimpleMessage[];
  onSendMessage: (content: string) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

// 1. Message individuel mémoïsé
const ForkMessageRow = memo(({ msg, isStreaming }: { msg: SimpleMessage, isStreaming: boolean }) => (
  <div className="animate-in fade-in duration-300 pb-8">
    <MessageBlock role={msg.role} content={msg.content} isStreaming={isStreaming} />
  </div>
));
ForkMessageRow.displayName = 'ForkMessageRow';

// 2. Composants statiques pour Virtuoso (extraits pour éviter la re-création)
const VirtuosoComponents = {
  List: React.forwardRef(({ style, children, ...props }: any, ref) => (
    <div {...props} ref={ref} style={style} className="px-4 py-8">
      {children}
    </div>
  )),
};

// 3. Liste mémoïsée avec stabilisation des fonctions internes
const ForkMessageList = memo(({
  messages,
  isLoading,
}: {
  messages: SimpleMessage[],
  isLoading: boolean,
}) => {
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // Stabilisation de la clé d'item
  const computeItemKey = useCallback((index: number, msg: SimpleMessage) => {
    return msg.id || `fork-msg-${index}`;
  }, []);

  // Stabilisation du rendu d'item : évite de recalculer tout le DOM à chaque chunk de texte
  const itemContent = useCallback((index: number, msg: SimpleMessage) => (
    <ForkMessageRow
      msg={msg}
      isStreaming={isLoading && index === messages.length - 1 && msg.role === 'assistant'}
    />
  ), [isLoading, messages.length]);

  // Stabilisation du Footer (le loader)
  const Footer = useCallback(() => (
    <>
      {isLoading && (
        <div className="flex justify-start p-2">
          <div className="flex space-x-1.5 items-center bg-gray-50 px-3 py-2 rounded-full border border-gray-100">
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" />
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.2s]" />
            <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce [animation-delay:0.4s]" />
          </div>
        </div>
      )}
      <div className="h-28" />
    </>
  ), [isLoading]);

  return (
    <Virtuoso
      ref={virtuosoRef}
      data={messages}
      computeItemKey={computeItemKey}
      initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
      followOutput={(isAtBottom) => (isLoading ? 'smooth' : isAtBottom ? 'smooth' : false)}
      itemContent={itemContent}
      style={{ height: '100%', width: '100%' }}
      components={{
        ...VirtuosoComponents,
        Footer
      }}
    />
  );
});
ForkMessageList.displayName = 'ForkMessageList';

// 4. Composant Principal
export function ForkThread({
  selectedText,
  messages,
  onSendMessage,
  onClose,
  isLoading = false
}: ForkThreadProps) {
  const [localInput, setLocalInput] = useState('');

  const handleSend = async (content: string) => {
    if (!content.trim() || isLoading) return;
    setLocalInput('');
    try {
      await onSendMessage(content);
    } catch (error) {
      console.error("Erreur envoi fork:", error);
      setLocalInput(content);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-100 shadow-2xl relative overflow-hidden">
      {/* HEADER */}
      <div className="h-[57px] px-4 border-b border-gray-100 flex items-center justify-between bg-white shrink-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <h3 className="font-semibold text-sm text-gray-900 tracking-tight">Précision contextuelle</h3>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* CONTEXTE STICKY */}
      <div className="p-4 bg-blue-50/80 border-b border-blue-100/50 sticky top-0 z-20 backdrop-blur-md">
        <p className="text-[10px] text-blue-600 mb-1 font-bold uppercase tracking-widest">Passage sélectionné</p>
        <p className="text-sm text-gray-700 italic border-l-2 border-blue-400 pl-3 py-1 bg-white/50 rounded-r-lg">
          "{selectedText}"
        </p>
      </div>

      {/* LISTE MÉMOÏSÉE */}
      <div className="flex-1 relative">
        <ForkMessageList
          messages={messages}
          isLoading={isLoading}
        />
      </div>

      {/* INPUT FOOTER */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-white via-white to-transparent pt-12 pointer-events-none z-30">
        <div className="pointer-events-auto">
          <ChatInput
            value={localInput}
            onChange={setLocalInput}
            onSend={handleSend}
            disabled={isLoading}
            placeholder="Répondre au fork..."
          />
        </div>
      </div>
    </div>
  );
}