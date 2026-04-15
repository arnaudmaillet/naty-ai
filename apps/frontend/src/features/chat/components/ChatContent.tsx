'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { chatRequest, getFullConversation } from '../../../services/api';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { Message } from '@naty-ai/shared-types';

export function ChatContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const idFromUrl = searchParams.get('id');

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [convId, setConvId] = useState<string | undefined>();

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
      const data = await chatRequest(content, 'gemini-3-flash-preview', convId);
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