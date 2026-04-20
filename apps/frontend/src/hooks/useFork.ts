// apps/frontend/src/hooks/useFork.ts
import { useState } from 'react';
import { MessageRole } from '@naty-ai/shared-types';
import { forkApi } from '../app/api/fork';
import { chatApi } from '../app/api/chat';
import { useQueryClient } from '@tanstack/react-query';

export function useFork(
  selectedModelId: string,
  setGlobalMessages: React.Dispatch<React.SetStateAction<any[]>>,
) {
  const [forkConfig, setForkConfig] = useState<{
    isOpen: boolean;
    selectedText: string;
    blockId: string;
    annotationId: string | null;
    forkMessages: any[];
  } | null>(null);

  const [isForkStreaming, setIsForkStreaming] = useState(false);
  const queryClient = useQueryClient();

  const openNewFork = (selectedText: string, blockId: string) => {
    setForkConfig({
      isOpen: true,
      selectedText,
      blockId,
      annotationId: null,
      forkMessages: [],
    });
  };

  const openExistingFork = async (annotationId: string, annotations: any[]) => {
    const existing = annotations.find((a) => a.id === annotationId);
    if (!existing) return;

    setForkConfig({
      isOpen: true,
      selectedText: existing.selectedText,
      blockId: existing.blockId,
      annotationId: existing.id,
      forkMessages: [],
    });

    try {
      const raw = await forkApi.getMessages(annotationId);
      const simplified = raw.map((m) => ({
        id: m.id,
        role: m.role,
        content:
          m.blocks?.map((b: any) => b.content).join('\n') || (m as any).content,
      }));
      setForkConfig((prev) =>
        prev ? { ...prev, forkMessages: simplified } : null,
      );
    } catch (err) {
      console.error('Erreur chargement fork:', err);
    }
  };

  const handleSendForkMessage = async (content: string) => {
    if (!forkConfig || !selectedModelId || isForkStreaming) return;

    const tempAssistantId = `fork-stream-${Date.now()}`;
    const userMsg = {
      role: MessageRole.USER,
      content,
      id: `temp-user-${Date.now()}`,
    };
    const assistantMsg = {
      id: tempAssistantId,
      role: MessageRole.ASSISTANT,
      content: '',
    };

    setForkConfig((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        forkMessages: [...prev.forkMessages, userMsg, assistantMsg],
      };
    });

    setIsForkStreaming(true);

    try {
      // --- APPEL STREAM AVEC RÉCUPÉRATION DU HEADER ---
      const result = await chatApi.askStream(
        content,
        selectedModelId,
        undefined,
        (accumulatedText) => {
          // accumulatedText est le texte complet à cet instant
          setForkConfig((prev) => {
            if (!prev) return null;

            return {
              ...prev,
              forkMessages: prev.forkMessages.map((m) =>
                // On identifie le message assistant temporaire par son ID unique
                m.id === tempAssistantId
                  ? { ...m, content: accumulatedText } // On remplace le contenu par la nouvelle version accumulée
                  : m,
              ),
            };
          });
        },
        {
          isFork: true,
          blockId: forkConfig.blockId,
          selectedText: forkConfig.selectedText,
          annotationId: forkConfig.annotationId,
        } as any,
      );

      // Si le backend nous a renvoyé un nouvel ID (via header x-annotation-id)
      // on met à jour notre config locale IMMÉDIATEMENT.
      if (result?.annotationId && !forkConfig.annotationId) {
        setForkConfig((prev) =>
          prev ? { ...prev, annotationId: result.annotationId } : null,
        );
      }

      // On rafraîchit le thread principal pour faire apparaître la pilule bleue
      queryClient.invalidateQueries({ queryKey: ['conversation'] });
    } catch (err) {
      console.error('Erreur stream fork:', err);
      setForkConfig((prev) =>
        prev
          ? {
              ...prev,
              forkMessages: prev.forkMessages.filter(
                (m) => m.id !== tempAssistantId,
              ),
            }
          : null,
      );
    } finally {
      setIsForkStreaming(false);
    }
  };

  return {
    forkConfig,
    setForkConfig,
    openNewFork,
    openExistingFork,
    handleSendForkMessage,
    isForkStreaming,
  };
}
