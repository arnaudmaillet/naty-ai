'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { chatRequest, getAvailableModels, getFullConversation } from '../../../services/api';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { AiModel, Message } from '@naty-ai/shared-types';
import { ModelSelector } from './ModelSelector';

export function ChatContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const idFromUrl = searchParams.get('id');

    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [convId, setConvId] = useState<string | undefined>();

    const [models, setModels] = useState<AiModel[]>([]);
    const [selectedModelId, setSelectedModelId] = useState<string>('');

    useEffect(() => {
        if (idFromUrl) {
            setIsLoading(true);
            getFullConversation(idFromUrl)
                .then((data) => {
                    setMessages(data.messages);
                    setConvId(data.id);
                })
                .catch(err => console.error("Erreur de chargement:", err))
                .finally(() => setIsLoading(false));
        } else {
            setMessages([]);
            setConvId(undefined);
        }
    }, [idFromUrl]);

    useEffect(() => {
        getAvailableModels()
            .then((data) => {
                setModels(data);
                if (data.length > 0 && !selectedModelId) {
                    setSelectedModelId(data[0].id);
                }
            });
    }, []);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const content = input;
        setInput('');

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content,
            conversationId: convId || 'new',
            createdAt: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        try {
            const data = await chatRequest(content, selectedModelId, convId);
            const assistantMessage: Message = {
                id: data.messageId || crypto.randomUUID(),
                role: 'assistant',
                content: data.response,
                conversationId: data.conversationId || convId || 'new',
                createdAt: new Date().toISOString(),
            };

            setMessages(prev => [...prev, assistantMessage]);

            if (!convId && data.conversationId) {
                setConvId(data.conversationId);
                router.push(`/?id=${data.conversationId}`, { scroll: false });
                setTimeout(() => {
                    window.dispatchEvent(new Event('refresh-conversations'));
                }, 1000);
            }
        } catch (err) {
            console.error("Erreur lors de l'envoi:", err);
            alert("Erreur de communication avec l'IA.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <ModelSelector
                models={models}
                selectedModelId={selectedModelId}
                onModelChange={setSelectedModelId}
                disabled={isLoading}
            />
            <MessageList messages={messages} isLoading={isLoading} />
            <ChatInput
                input={input}
                setInput={setInput}
                onSend={handleSend}
                isLoading={isLoading}
            />
        </div>
    );
}