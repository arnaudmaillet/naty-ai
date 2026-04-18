'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MainThread } from './MainThread';
import { ChatInput } from './ChatInput';
import { ModelSelector } from './ModelSelector';
import { ForkThread } from './ForkThread';
import { MessageRole, AiModel, Message } from '@naty-ai/shared-types'
import { useFork } from 'apps/frontend/src/hooks/useFork';
import { chatApi } from '../../../app/api/chat';

export function LayoutContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const idFromUrl = searchParams.get('id');

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [convId, setConvId] = useState<string | undefined>();

    const [models, setModels] = useState<AiModel[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>('');
    const [annotations, setAnnotations] = useState<any[]>([]);

    const {
        forkConfig,
        setForkConfig,
        openNewFork,
        openExistingFork,
        handleSendForkMessage
    } = useFork(selectedModelId, setAnnotations);


    // 1. Chargement de la conversation
    useEffect(() => {
        if (idFromUrl) {
            setIsLoading(true);
            chatApi.getFullConversation(idFromUrl)
                .then((data) => {
                    setMessages(data.messages);
                    const extracted = data.messages.flatMap((m: any) =>
                        (m.blocks || []).flatMap((b: any) =>
                            (b.annotations || []).map((a: any) => ({
                                ...a,
                                blockId: b.id,
                                forkMessages: []
                            }))
                        )
                    );

                    setAnnotations(extracted);
                    setConvId(data.id);
                })
                .catch(err => console.error("Erreur chargement conv:", err))
                .finally(() => setIsLoading(false));
        } else {
            setMessages([]);
            setAnnotations([]);
            setConvId(undefined);
        }
    }, [idFromUrl]);

    // 2. Chargement des modèles
    useEffect(() => {
        chatApi.getAvailableModels().then((data) => {
            setModels(data);
            if (data.length > 0 && !selectedModelId) {
                setSelectedModelId(data[0].id);
            }
        });
    }, []);

    // 3. Envoi d'un message (Flux principal)
    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const content = input;
        setInput('');

        // Update optimiste avec les Enums MAJUSCULES
        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: MessageRole.USER,
            content: content,
            blocks: [{
                id: crypto.randomUUID(),
                messageId: '',
                content: content,
                type: 'TEXT',
                order: 0,
                createdAt: new Date(),
            }],
            conversationId: convId || 'new',
            modelId: null,
            parentMessageId: null,
            annotationId: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const data = await chatApi.ask(content, selectedModelId, convId);

            const assistantMessage = {
                id: data.assistantMessageId,
                role: MessageRole.ASSISTANT,
                blocks: data.blocks,
                conversationId: data.conversationId || convId,
                createdAt: new Date(),
                updatedAt: new Date(),
                content: null,
                modelId: selectedModelId,
                parentMessageId: data.userMessageId || null,
                annotationId: data.annotationId || null,
            } as Message;

            setMessages(prev => [...prev, assistantMessage]);

            if (!convId && data.conversationId) {
                setConvId(data.conversationId);
                router.push(`/?id=${data.conversationId}`, { scroll: false });
                setTimeout(() => window.dispatchEvent(new Event('refresh-conversations')), 500);
            }
        } catch (err) {
            console.error("Erreur envoi:", err);
            alert("Erreur de communication avec l'IA.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-row h-full w-full overflow-hidden bg-white">
            <div className={`flex flex-col h-full transition-all duration-500 ease-in-out ${forkConfig?.isOpen ? 'w-1/2 border-r border-gray-100' : 'w-full'}`}>
                <ModelSelector
                    models={models}
                    selectedModelId={selectedModelId}
                    onModelChange={setSelectedModelId}
                    disabled={isLoading}
                />
                <MainThread
                    messages={messages}
                    annotations={annotations}
                    isLoading={isLoading}
                    onForkRequest={openNewFork}
                    onAnnotationClick={(id) => openExistingFork(id, annotations)}
                />
                <ChatInput
                    input={input}
                    setInput={setInput}
                    onSend={handleSend}
                    isLoading={isLoading}
                />
            </div>

            {forkConfig?.isOpen && (
                <div className="w-1/2 h-full flex flex-col bg-gray-50/50 animate-in slide-in-from-right duration-300">
                    <ForkThread
                        key={forkConfig.annotationId || 'new-fork'}
                        selectedText={forkConfig.selectedText}
                        messages={forkConfig.forkMessages}
                        onClose={() => setForkConfig(null)}
                        onSendMessage={handleSendForkMessage}
                        isLoading={false}
                    />
                </div>
            )}
        </div>
    );
}