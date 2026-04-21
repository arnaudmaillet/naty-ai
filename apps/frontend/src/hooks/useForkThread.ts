// apps/frontend/src/hooks/useFork.ts

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { MessageRole } from '@naty-ai/shared-types';
import { useForkStore } from '../store/useForkStore';
import { forkApi } from '../app/api/fork';
import { chatApi } from '../app/api/chat';
import { useMainStore } from '../store/useMainStore';

// 1. On ne passe plus selectedModelId en argument du hook
export function useForkThread() {
  const queryClient = useQueryClient();

  const openNew = useForkStore((state) => state.openNew);
  const openExisting = useForkStore((state) => state.openExisting);
  const setMessages = useForkStore((state) => state.setMessages);
  const setStreaming = useForkStore((state) => state.setStreaming);
  const setInput = useForkStore((state) => state.setInput);
  const setAnnotationId = useForkStore((state) => state.setAnnotationId);
  const setSelectedModelId = useForkStore((state) => state.setSelectedModelId);

  /**
   * Ouvre un nouveau Fork en synchronisant le modèle du MainThread vers le ForkStore
   */
  const openNewFork = useCallback(
    (text: string, blockId: string) => {
      // Lire le modèle actuel du MainThread sans s'y abonner
      const mainModelId = useMainStore.getState().selectedModelId;

      // On ouvre le panneau
      openNew(text, blockId);

      // On synchronise le modèle par défaut (une seule fois à l'ouverture)
      setSelectedModelId(mainModelId);
    },
    [openNew, setSelectedModelId],
  );

  /**
   * Charge une conversation existante
   */
  const openExistingFork = useCallback(
    async (annotationId: string, annotations: any[]) => {
      const existing = annotations.find((a) => a.id === annotationId);
      if (!existing) return;

      openExisting(existing.selectedText, existing.blockId, existing.id);

      try {
        const raw = await forkApi.getMessages(annotationId);
        const formatted = raw.map((m) => ({
          id: m.id,
          role: m.role,
          content:
            m.content || m.blocks?.map((b: any) => b.content).join('\n') || '',
          blocks: m.blocks || [
            { id: `b-${m.id}`, content: m.content, type: 'TEXT' },
          ],
        }));
        setMessages(formatted);
      } catch (err) {
        console.error('Erreur chargement fork:', err);
      }
    },
    [openExisting, setMessages],
  );

  /**
   * Envoie un message dans le thread du fork
   */
  const handleSendForkMessage = useCallback(
    async (content: string) => {
      // 2. On lit les valeurs du ForkStore au moment de l'envoi
      const state = useForkStore.getState();
      const currentForkModelId = state.selectedModelId;

      if (!currentForkModelId || state.isStreaming || !content.trim()) return;

      const tempAssistantId = `fork-stream-${Date.now()}`;

      setInput('');
      setStreaming(true);

      const userMsg = {
        id: `temp-user-${Date.now()}`,
        role: MessageRole.USER,
        content,
        blocks: [{ id: `fb-u-${Date.now()}`, content, type: 'TEXT' }],
      };

      const assistantMsg = {
        id: tempAssistantId,
        role: MessageRole.ASSISTANT,
        content: '',
        blocks: [{ id: `fb-a-${Date.now()}`, content: '', type: 'TEXT' }],
      };

      setMessages([...state.messages, userMsg, assistantMsg]);

      try {
        const result = await chatApi.askStream(
          content,
          currentForkModelId,
          undefined,
          (accumulatedText) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempAssistantId
                  ? {
                      ...m,
                      content: accumulatedText,
                      blocks: [{ ...m.blocks[0], content: accumulatedText }],
                    }
                  : m,
              ),
            );
          },
          {
            isFork: true,
            blockId: state.blockId,
            selectedText: state.selectedText,
            annotationId: state.annotationId,
          } as any,
        );

        if (result?.annotationId && !state.annotationId) {
          setAnnotationId(result.annotationId);
        }

        queryClient.invalidateQueries({ queryKey: ['conversation'] });
      } catch (err) {
        console.error('Erreur lors du stream fork:', err);
        const currentMessages = useForkStore.getState().messages;
        setMessages(currentMessages.filter((m) => m.id !== tempAssistantId));
        setInput(content);
      } finally {
        setStreaming(false);
      }
    },
    [setMessages, setStreaming, setInput, setAnnotationId, queryClient], // Plus de selectedModelId en dépendance !
  );

  return {
    openNewFork,
    openExistingFork,
    handleSendForkMessage,
  };
}
