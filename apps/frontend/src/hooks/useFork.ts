// apps/frontend/src/hooks/useFork.ts
import { useState } from 'react';
import { MessageRole } from '@naty-ai/shared-types';
import { forkApi } from '../app/api/fork';

export function useFork(selectedModelId: string, setGlobalAnnotations: React.Dispatch<React.SetStateAction<any[]>>) {
  const [forkConfig, setForkConfig] = useState<{
    isOpen: boolean;
    selectedText: string;
    blockId: string;
    annotationId: string | null;
    forkMessages: any[];
  } | null>(null);

  const openNewFork = (selectedText: string, blockId: string) => {
    setForkConfig({ isOpen: true, selectedText, blockId, annotationId: null, forkMessages: [] });
  };

  const openExistingFork = async (annotationId: string, annotations: any[]) => {
    const existing = annotations.find(a => a.id === annotationId);
    if (!existing) return;

    setForkConfig({ 
        isOpen: true, 
        selectedText: existing.selectedText, 
        blockId: existing.blockId, 
        annotationId: existing.id, 
        forkMessages: [] 
    });

    try {
      const raw = await forkApi.getMessages(annotationId);
      const simplified = raw.map(m => ({
        role: m.role,
        content: m.blocks?.map(b => b.content).join('\n') || (m as any).content
      }));
      setForkConfig(prev => prev ? { ...prev, forkMessages: simplified } : null);
    } catch (err) {
      console.error("Erreur chargement fork:", err);
    }
  };

  const handleSendForkMessage = async (content: string) => {
    if (!forkConfig || !selectedModelId) return;

    const userMsg = { role: MessageRole.USER, content };
    let updatedMsgs: any[] = [];

    setForkConfig(prev => {
      if (!prev) return null;
      updatedMsgs = [...prev.forkMessages, userMsg];
      return { ...prev, forkMessages: updatedMsgs };
    });

    try {
      const data = await forkApi.sendMessage({
        blockId: forkConfig.blockId,
        selectedText: forkConfig.selectedText,
        content,
        modelId: selectedModelId,
        annotationId: forkConfig.annotationId || undefined
      });

      const aiText = data.blocks?.map((b: any) => b.content).join('\n') || data.response;
      const finalMessages = [...updatedMsgs, { role: MessageRole.ASSISTANT, content: aiText }];

      setForkConfig(prev => prev ? { ...prev, annotationId: data.annotationId, forkMessages: finalMessages } : null);
      
      // Mise à jour des "pilules" dans le thread principal
      setGlobalAnnotations(prev => {
        const exists = prev.find(a => a.id === data.annotationId);
        if (exists) return prev.map(a => a.id === data.annotationId ? { ...a, forkMessages: finalMessages } : a);
        return [...prev, { id: data.annotationId, blockId: forkConfig.blockId, selectedText: forkConfig.selectedText, forkMessages: finalMessages }];
      });
    } catch (err) {
      console.error(err);
    }
  };

  return {
    forkConfig,
    setForkConfig,
    openNewFork,
    openExistingFork,
    handleSendForkMessage
  };
}