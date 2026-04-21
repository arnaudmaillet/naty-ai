// apps/frontend/src/hooks/useChat.ts
import { useCallback, useEffect, useMemo } from 'react';
import { useMainStore } from 'apps/frontend/src/store/useMainStore';
import { useChatQueries } from 'apps/frontend/src/hooks/useChatQueries';
import { chatApi } from 'apps/frontend/src/app/api/chat';
import { MessageRole } from '@naty-ai/shared-types';
import { useQueryClient } from '@tanstack/react-query';
import { useForkThread } from './useForkThread';

export function useMainThread(idFromUrl: string | null, models: any[]) {
  const queryClient = useQueryClient();
  const { conversationQuery } = useChatQueries(idFromUrl);

  const messages = useMainStore((state) => state.messages);
  const isStreaming = useMainStore((state) => state.isStreaming);

  const setMessages = useMainStore((state) => state.setMessages);
  const setStreaming = useMainStore((state) => state.setStreaming);
  const setSelectedModelId = useMainStore((state) => state.setSelectedModelId);
  const setInput = useMainStore((state) => state.setInput);

  const { openExistingFork, openNewFork } = useForkThread();

  // Initialisation du modèle
  useEffect(() => {
    const currentId = useMainStore.getState().selectedModelId;
    if (!currentId && models?.length > 0) {
      setSelectedModelId(models[0].id);
    }
  }, [models, setSelectedModelId]);

  // Synchronisation des messages
  const allMessages = useMemo(() => {
    return conversationQuery.data?.pages.flatMap((page) => page.messages) ?? [];
  }, [conversationQuery.data?.pages]);

  useEffect(() => {
    if (idFromUrl && !isStreaming) {
      if (allMessages.length > 0) setMessages(allMessages);
    } else if (!idFromUrl) {
      setMessages([]);
    }
  }, [allMessages, idFromUrl, isStreaming, setMessages]);

  // Calcul des annotations pour MessageRow
  const annotations = useMemo(() => {
    return messages.flatMap((m) =>
      (m.blocks || []).flatMap((b) =>
        (b.annotations || []).map((a) => ({ ...a, blockId: b.id })),
      ),
    );
  }, [messages]);

  const handleAnnotationClick = useCallback((annotationId: string) => {
    // On utilise la liste d'annotations calculée juste au dessus
    openExistingFork(annotationId, annotations);
  }, [openExistingFork, annotations]);

  // Logique d'envoi
  const handleSend = useCallback(async () => {
    const state = useMainStore.getState();
    const content = state.input;
    const currentModelId = state.selectedModelId;

    if (!content.trim() || isStreaming || !currentModelId) return;

    const tempAssistantId = 'streaming-assistant';
    setStreaming(true);
    setInput('');

    const userMsg = {
      id: `temp-user-${Date.now()}`,
      role: MessageRole.USER,
      content,
      blocks: [{ id: `b-u-${Date.now()}`, content, type: 'TEXT' }],
    };

    const assistantMsg = {
      id: tempAssistantId,
      role: MessageRole.ASSISTANT,
      content: '',
      blocks: [{ id: `b-a-${Date.now()}`, content: '', type: 'TEXT' }],
    };

    setMessages([...state.messages, userMsg as any, assistantMsg as any]);

    try {
      await chatApi.askStream(
        content,
        currentModelId,
        idFromUrl || undefined,
        (text) => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempAssistantId
                ? {
                    ...m,
                    content: text,
                    blocks: [{ ...m.blocks[0], content: text }],
                  }
                : m,
            ),
          );
        },
      );
      await queryClient.invalidateQueries({
        queryKey: ['conversation', idFromUrl],
      });
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempAssistantId));
      setInput(content);
    } finally {
      setStreaming(false);
    }
  }, [
    idFromUrl,
    isStreaming,
    setMessages,
    setStreaming,
    setInput,
    queryClient,
  ]);

  return {
    messages,
    isStreaming,
    annotations,
    handleAnnotationClick,
    handleSend,
    openNewFork
  };
}
