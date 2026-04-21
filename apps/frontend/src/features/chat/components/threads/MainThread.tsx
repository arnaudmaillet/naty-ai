'use client';

import React, { memo, useRef, useCallback, useEffect } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { Message } from '@naty-ai/shared-types';
import { AskBubble } from '../AskBubble';
import { MessageRow } from '../messages/Message';
import { cn } from "../../../../lib/utils";
import { MainThreadInput } from '../../containers/ThreadInputsContainer';
import { useForkThread } from '../../../../hooks/useForkThread';
import { useMainThread } from '../../../../hooks/useMainThread';
import { useTextSelection } from '../../../../hooks/useTextSelection';
import { MainModelSelector } from '../../containers/ModelSelectorContainer';

export const MainThread = memo(function MainThread({
    idFromUrl,
    models,
    onAnnotationClick,
    onHeaderVisible,
    isForkOpen
}: any) {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    const {
        messages,
        isStreaming,
        annotations,
        handleAnnotationClick,
        handleSend
    } = useMainThread(idFromUrl, models);

    const { openNewFork } = useForkThread();

    const VirtuosoHeader = memo(({ onVisible }: { onVisible?: () => void }) => {
        useEffect(() => {
            onVisible?.();
        }, [onVisible]);
        return <div className="h-4" />;
    });

    useTextSelection();

    // --- GESTION DU SCROLL ---
    useEffect(() => {
        if (isStreaming && virtuosoRef.current) {
            virtuosoRef.current.scrollToIndex({
                index: messages.length - 1,
                align: 'end',
                behavior: 'auto'
            });
        }
    }, [messages, isStreaming]);

    const itemContent = useCallback((index: number, msg: Message) => (
        <MessageRow
            index={index}
            msg={msg}
            annotations={annotations}
            isStreaming={msg.id === 'streaming-assistant' || (isStreaming && index === messages.length - 1)}
            onAnnotationClick={handleAnnotationClick}
            canFork={true}
        />
    ), [onAnnotationClick, annotations, isStreaming, messages.length]);

    return (
        <div className="flex flex-col h-full bg-white relative">
            <div className="absolute top-4 left-4 z-30">
                <MainModelSelector
                    models={models}
                    disabled={isStreaming}
                />
            </div>

            <div className="flex-1 relative min-h-0">
                <Virtuoso
                    ref={virtuosoRef}
                    data={messages}
                    followOutput={(isAtBottom) => isStreaming ? 'auto' : (isAtBottom ? 'smooth' : false)}
                    itemContent={itemContent}
                    scrollerRef={(ref) => { scrollerRef.current = ref as HTMLDivElement; }}
                    style={{ height: '100%', width: '100%' }}
                    atBottomThreshold={60}
                    initialTopMostItemIndex={messages.length > 0 ? messages.length - 1 : 0}
                    components={{
                        List: React.forwardRef(({ style, children, ...props }: any, ref) => (
                            <div
                                {...props}
                                ref={ref}
                                style={style}
                                className={cn(
                                    "mx-auto px-4 py-8 w-full",
                                    isForkOpen ? "max-w-full" : "max-w-3xl"
                                )}
                            >
                                {children}
                                <AskBubble
                                    containerRef={scrollerRef}
                                    onForkRequest={openNewFork}
                                />
                            </div>
                        )),
                        Header: () => <VirtuosoHeader onVisible={onHeaderVisible} />
                    }}
                />
            </div>

            <div className="w-full pb-6 bg-gradient-to-t from-white via-white to-transparent pt-12 -mt-12 pointer-events-auto z-20">
                <div className={cn("mx-auto w-full transition-all duration-500", isForkOpen ? "max-w-full px-4" : "max-w-3xl")}>
                    <MainThreadInput
                        onSend={handleSend}
                        disabled={isStreaming}
                        placeholder="Posez votre question..."
                    />
                </div>
            </div>
        </div>
    );
});