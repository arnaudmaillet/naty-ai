'use client';

import React, { useState, useCallback, memo, useEffect } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { X } from 'lucide-react';
import { cn } from "../../../../lib/utils";
import { useForkStore } from 'apps/frontend/src/store/useForkStore';
import { useMainStore } from 'apps/frontend/src/store/useMainStore';
import { MessageRow } from '../messages/Message';
import { ForkThreadInput } from '../../containers/ThreadInputsContainer';
import { useForkThread } from 'apps/frontend/src/hooks/useForkThread';
import { ForkModelSelector } from '../../containers/ModelSelectorContainer';

const ForkMessageList = memo(() => {
  const annotationId = useForkStore(state => state.annotationId);
  const messages = useForkStore(state => state.messages);
  const isForkStreaming = useForkStore(state => state.isStreaming);

  const itemContent = useCallback((index: number, msg: any) => (
    <MessageRow
      index={index}
      msg={msg}
      annotations={[]}
      isStreaming={isForkStreaming && index === messages.length - 1}
      canFork={false}
    />
  ), [isForkStreaming, messages.length]);

  return (
    <Virtuoso
      key={annotationId || 'new-fork'}
      data={messages}
      initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
      followOutput={(isAtBottom) => (isForkStreaming ? 'auto' : isAtBottom ? 'smooth' : false)}
      itemContent={itemContent}
      style={{ height: '100%', width: '100%' }}
      alignToBottom={messages.length < 5}
      components={{
        List: React.forwardRef(({ style, children, ...props }: any, ref) => (
          <div
            {...props}
            ref={ref}
            style={style}
            className="px-6"
          >
            {children}
          </div>
        )),
        Header: () => <div className="h-[160px]" />
      }}
    />
  );
});

// --- COMPOSANT PRINCIPAL ---
export const ForkThread = memo(function ForkThread({ models }: any) {
  // 1. On ne s'abonne qu'aux données nécessaires au rendu de ce panneau
  const selectedText = useForkStore(state => state.selectedText);
  const isForkStreaming = useForkStore(state => state.isStreaming);
  const closeFork = useForkStore(state => state.close);

  // 2. Accès au Store Principal pour le statut de stream (statique ou sélecteur simple)
  const isMainStreaming = useMainStore(state => state.isStreaming);

  // 3. Récupération de la logique d'envoi
  // On ne passe plus selectedModelId ici, le hook va le chercher dans le store au moment du clic
  const { handleSendForkMessage } = useForkThread();

  const [isExpanded, setIsExpanded] = useState(false);
  const handleToggleExpand = useCallback(() => setIsExpanded(p => !p), []);

  return (
    <div className="flex flex-col h-full bg-white border border-zinc-200 relative overflow-hidden rounded-3xl shadow-sm">

      {/* HEADER FIXE */}
      <div className="absolute top-0 left-0 right-0 z-40 flex flex-col bg-white/90 backdrop-blur-md border-b border-zinc-100">
        <div className="h-14 px-2 flex items-center justify-between">
          {/* Le Container s'abonne tout seul au selectedModelId du ForkStore */}
          <ForkModelSelector
            models={models}
            disabled={isForkStreaming || isMainStreaming}
          />
          <button
            onClick={closeFork}
            className="p-2 hover:bg-zinc-50 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>

        <div className="p-4 pt-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Context</span>
            <button onClick={handleToggleExpand} className="text-[9px] font-bold text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-100 uppercase">
              {isExpanded ? 'Réduire' : 'Détails'}
            </button>
          </div>
          <p className={cn(
            "text-[13px] text-zinc-600 leading-relaxed pl-3 border-l-2 border-zinc-200 italic transition-all duration-300",
            isExpanded ? "line-clamp-none whitespace-pre-wrap" : "line-clamp-2"
          )}>
            "{selectedText}"
          </p>
        </div>
      </div>

      {/* LISTE DE MESSAGES */}
      <div className="flex-1 relative min-h-0">
        <ForkMessageList />
      </div>

      {/* FOOTER */}
      <div className="p-4 bg-white border-t border-zinc-50">
        <ForkThreadInput
          onSend={handleSendForkMessage}
          disabled={isForkStreaming}
          placeholder="Préciser ce point..."
        />
      </div>
    </div>
  );
});

ForkThread.displayName = 'ForkThread';