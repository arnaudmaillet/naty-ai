'use client';

import React, { memo, useRef, useCallback, useMemo } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Message, MessageRole } from '@naty-ai/shared-types';
import { useTextSelection } from 'apps/frontend/src/hooks/useTextSelection';
import { MessageBlock } from './MessageBlock';
import { AskBubble } from './AskBubble';
import { useChatStore } from 'apps/frontend/src/store/useChatStore';
import { AnnotationPills } from './AnnotationPills';

// --- INTERFACE MISE À JOUR ---
interface MessageListProps {
    messages: Message[];
    annotations?: any[];
    isLoading: boolean;
    onForkRequest?: (selectedText: string, blockId: string) => void;
    onAnnotationClick?: (annotationId: string) => void;
    onHeaderVisible?: () => void; // <-- AJOUTÉ ICI
    canFork?: boolean;
}

// --- COMPOSANT DE LIGNE MÉMOÏSÉ ---
const MessageRow = memo(({
    msg,
    index,
    annotations,
    isStreaming,
    onAnnotationClick,
    canFork
}: {
    msg: Message;
    index: number;
    annotations: any[];
    isStreaming: boolean;
    onAnnotationClick?: (id: string) => void;
    canFork: boolean;
}) => {
    const isUser = msg.role === MessageRole.USER;
    const isAssistant = msg.role === MessageRole.ASSISTANT;

    // Déterminer si ce message précis est celui qui stream
    const isThisMsgStreaming = msg.id === 'streaming-assistant' || msg.id.startsWith('fork-stream');

    return (
        <div className="flex flex-col pb-10 group" data-role={msg.role}>
            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`w-full ${isUser ? 'flex justify-end' : ''} ${canFork ? 'max-w-3xl' : 'max-w-full'} mx-auto`}>

                    {isThisMsgStreaming ? (
                        /* RENDU STREAMING : Pas de fork possible tant que ça bouge */
                        <div className="w-full">
                            <MessageBlock
                                role={msg.role}
                                content={msg.content || ""}
                                isStreaming={true}
                            />
                        </div>
                    ) : (
                        /* RENDU POST-STREAM : On restaure les blocs et la bulle Ask */
                        msg.blocks && msg.blocks.length > 0 ? (
                            msg.blocks.map((block, blockIdx) => (
                                <div
                                    key={block.id || `block-${index}-${blockIdx}`}
                                    className="relative mb-6 last:mb-0"
                                    onMouseDown={() => {
                                        // On restaure ton interaction ici
                                        if (isAssistant && block.id) {
                                            useChatStore.getState().setActiveBlockId(block.id);
                                        } else {
                                            useChatStore.getState().setActiveBlockId(null);
                                        }
                                    }}
                                >
                                    <MessageBlock
                                        role={msg.role}
                                        content={block.content}
                                        type={block.type}
                                        isStreaming={false}
                                    />

                                    <AnnotationPills
                                        annotations={annotations.filter(a => a.blockId === block.id)}
                                        onAnnotationClick={onAnnotationClick}
                                    />
                                </div>
                            ))
                        ) : (
                            /* FALLBACK (USER) : On nettoie l'activeBlockId */
                            <div
                                className="w-full"
                                onMouseDown={() => useChatStore.getState().setActiveBlockId(null)}
                            >
                                <MessageBlock
                                    role={msg.role}
                                    content={msg.content || ""}
                                    isStreaming={false}
                                />
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    return prev.msg.content === next.msg.content &&
        prev.msg.id === next.msg.id &&
        JSON.stringify(prev.msg.blocks) === JSON.stringify(next.msg.blocks) &&
        prev.annotations === next.annotations;
});

MessageRow.displayName = 'MessageRow';

// --- COMPOSANT PRINCIPAL ---
export const MainThread = memo(function MainThread({
    messages,
    annotations = [],
    isLoading,
    onForkRequest,
    onAnnotationClick,
    onHeaderVisible,
    canFork = true
}: MessageListProps) {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    useTextSelection();

    // 1. Stabiliser la clé
    const computeItemKey = useCallback((index: number, item: Message) => {
        return item.id === 'streaming-assistant' ? 'streaming-node' : (item.id || `msg-${index}`);
    }, []);

    // 2. STABILISER itemContent avec useCallback
    // C'est l'étape la plus importante pour arrêter les "Render Message XX"
    const itemContent = useCallback((index: number, msg: Message) => (
        <MessageRow
            index={index}
            msg={msg}
            annotations={annotations} // Sera comparé par le memo de MessageRow
            isStreaming={msg.id === 'streaming-assistant'}
            onAnnotationClick={onAnnotationClick}
            canFork={canFork}
        />
    ), [annotations, onAnnotationClick, canFork]);
    // Note: 'annotations' est dans les dépendances, mais comme il est mémoïsé 
    // dans LayoutContent, il ne change de référence que si une annotation est ajoutée/modifiée.

    // 3. Sortir le composant List pour éviter de re-déclarer forwardRef à chaque rendu
    const List = useMemo(() => React.forwardRef(({ style, children, ...props }: any, ref) => (
        <div
            {...props}
            ref={ref}
            style={style}
            className={`mx-auto px-4 py-8 ${canFork ? 'max-w-3xl' : 'max-w-full'}`}
        >
            {children}
            {canFork && onForkRequest && (
                <AskBubble
                    containerRef={scrollerRef}
                    onForkRequest={onForkRequest}
                />
            )}
        </div>
    )), [canFork, onForkRequest]);

    return (
        <div className="flex-1 bg-white relative">
            <Virtuoso
                ref={virtuosoRef}
                data={messages}
                computeItemKey={computeItemKey}
                scrollerRef={(ref) => { scrollerRef.current = ref as HTMLDivElement; }}

                // 1. CHANGER ICI : 'auto' au lieu de 'smooth' pendant le stream
                followOutput={(isAtBottom) => {
                    if (isLoading) return 'auto'; // 'auto' suit instantanément sans animation
                    return isAtBottom ? 'smooth' : false;
                }}


                atBottomThreshold={60}
                increaseViewportBy={200}

                initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
                itemContent={itemContent}
                style={{ height: '100%', width: '100%' }}
                components={{
                    List,
                    Header: () => {
                        // On peut aussi mémoïser le déclenchement du header
                        React.useEffect(() => {
                            if (onHeaderVisible) onHeaderVisible();
                        }, []);
                        return <div className="h-4" />;
                    },
                }}
            />
        </div>
    );
});