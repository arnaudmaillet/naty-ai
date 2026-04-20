'use client';

import { useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { MainThread } from './MainThread';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { ForkThread } from './ForkThread';
import { MessageRole, Message } from '@naty-ai/shared-types';
import { useFork } from 'apps/frontend/src/hooks/useFork';
import { chatApi } from '../../../app/api/chat';

// Hooks et Stores
import { useChatStore } from 'apps/frontend/src/store/useChatStore';
import { useChatQueries } from 'apps/frontend/src/hooks/useChatQueries';
import { useQueryClient } from '@tanstack/react-query';

export function LayoutContent() {
    const searchParams = useSearchParams();
    const idFromUrl = searchParams.get('id');
    const queryClient = useQueryClient();

    // Zustand State
    const messages = useChatStore((state) => state.messages);
    const setMessages = useChatStore((state) => state.setMessages);
    const isStreaming = useChatStore((state) => state.isStreaming);
    const setStreaming = useChatStore((state) => state.setStreaming);
    const input = useChatStore((state) => state.input);
    const setInput = useChatStore((state) => state.setInput);

    // React Query
    const { modelsQuery, conversationQuery } = useChatQueries(idFromUrl);
    const models = modelsQuery.data || [];
    const selectedModelId = models[0]?.id || '';

    // 1. Aplatir les messages avec useMemo pour éviter les re-renders de MainThread
    const allMessages = useMemo(() => {
        return conversationQuery.data?.pages.flatMap(page => page.messages) ?? [];
    }, [conversationQuery.data?.pages]);

    // 2. Synchronisation précise du store
    useEffect(() => {
        if (idFromUrl && !isStreaming) {
            if (allMessages.length > 0) {
                setMessages(allMessages);
            }
        } else if (!idFromUrl) {
            setMessages([]);
        }
    }, [allMessages, idFromUrl, setMessages, isStreaming]);

    // 3. Annotations mémoïsées (Crucial pour la performance de Virtuoso)
    const annotations = useMemo(() => {
        return messages.flatMap((m) =>
            (m.blocks || []).flatMap((b) =>
                (b.annotations || []).map((a) => ({
                    ...a,
                    blockId: b.id,
                }))
            )
        );
    }, [messages]);

    // 4. Hook de Fork avec gestion des pilules (setGlobalAnnotations)
    const {
        forkConfig,
        setForkConfig,
        openNewFork,
        openExistingFork,
        handleSendForkMessage,
        isForkStreaming
    } = useFork(selectedModelId, setMessages);

    const handleAnnotationClick = useCallback((id: string) => {
        openExistingFork(id, annotations);
    }, [openExistingFork, annotations]);

    const handleHeaderVisible = useCallback(() => {
        if (conversationQuery.hasNextPage && !conversationQuery.isFetchingNextPage) {
            conversationQuery.fetchNextPage();
        }
    }, [conversationQuery]);

    // 5. Envoi message principal (Streaming)
    const handleSend = useCallback(async () => {
        if (!input.trim() || isStreaming) return;

        const content = input;
        const tempAssistantId = 'streaming-assistant';

        setStreaming(true);
        setInput('');

        // Capture des messages ACTUELS du store juste avant l'envoi
        const snapshot = useChatStore.getState().messages;

        const userMsg = {
            id: `temp-user-${Date.now()}`,
            role: MessageRole.USER,
            content,
            blocks: [{ id: 'b1', content, type: 'TEXT' }]
        } as any;

        const assistantMsg = {
            id: tempAssistantId,
            role: MessageRole.ASSISTANT,
            content: '',
            blocks: [{ id: 'b2', content: '', type: 'TEXT' }]
        } as any;

        // Mise à jour propre
        setMessages([...snapshot, userMsg, assistantMsg]);

        try {
            await chatApi.askStream(content, selectedModelId, idFromUrl || undefined, (accumulatedText) => {
                // Utilisation du state fonctionnel de Zustand pour éviter les écrasements
                setMessages(prev => prev.map(m =>
                    m.id === tempAssistantId
                        ? {
                            ...m,
                            content: accumulatedText,
                            blocks: [{ ...m.blocks[0], content: accumulatedText }]
                        }
                        : m
                ));
            });

            // ATTENTION : On n'invalide PAS immédiatement. 
            // On attend que le message soit bien enregistré.
            await queryClient.invalidateQueries({ queryKey: ['conversation', idFromUrl] });

            // Après l'invalidation, on laisse le useEffect (débloqué par isStreaming: false) 
            // rafraîchir les messages avec les IDs officiels.

        } catch (err: any) {
            setMessages(prev => prev.filter(m => m.id !== tempAssistantId));
            setInput(content);
        } finally {
            setStreaming(false);
        }
    }, [input, isStreaming, selectedModelId, idFromUrl, setMessages, setStreaming, setInput, queryClient]);

    return (
        <div className="flex flex-row h-full w-full overflow-hidden bg-white">
            {/* PANNEAU GAUCHE : THREAD PRINCIPAL */}
            <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${forkConfig?.isOpen ? 'w-1/2 border-r' : 'w-full'}`}>
                <ModelSelector
                    models={models}
                    selectedModelId={selectedModelId}
                    onModelChange={() => { }}
                    disabled={isStreaming}
                />

                <MainThread
                    key={idFromUrl} // Force le reset Virtuoso au changement de conv
                    messages={messages}
                    annotations={annotations}
                    isLoading={isStreaming}
                    onForkRequest={openNewFork}
                    onAnnotationClick={handleAnnotationClick}
                    onHeaderVisible={handleHeaderVisible}
                />

                {/* INPUT PRINCIPAL AVEC HALO */}
                <div className="w-full pb-3 bg-gradient-to-t from-white via-white to-transparent pt-12 -mt-12 pointer-events-none relative z-20">
                    <div className={`mx-auto w-full pointer-events-auto transition-all ${forkConfig?.isOpen ? 'max-w-full px-4' : 'max-w-3xl'}`}>
                        <ChatInput
                            value={input}
                            onChange={setInput}
                            onSend={handleSend}
                            disabled={isStreaming}
                        />
                    </div>
                </div>
            </div>

            {/* PANNEAU DROIT : FORK THREAD */}
            {forkConfig?.isOpen && (
                <div className="w-1/2 h-full flex flex-col bg-gray-50/50 animate-in slide-in-from-right duration-300">
                    <ForkThread
                        key={forkConfig.annotationId || 'new-fork'}
                        selectedText={forkConfig.selectedText}
                        messages={forkConfig.forkMessages}
                        onClose={() => setForkConfig(null)}
                        onSendMessage={handleSendForkMessage}
                        isLoading={isForkStreaming}
                    />
                </div>
            )}
        </div>
    );
}