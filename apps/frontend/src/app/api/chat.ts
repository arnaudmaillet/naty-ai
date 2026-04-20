import { request } from './client';
import { AiModel } from '@naty-ai/shared-types';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const chatApi = {
  askStream: async (
    content: string,
    modelId: string,
    conversationId: string | undefined,
    onChunk: (text: string) => void,
    options?: {
      isFork?: boolean;
      blockId?: string;
      selectedText?: string;
      annotationId?: string | null;
    },
  ): Promise<{ annotationId: string | null }> => {
    const token = localStorage.getItem('token');

    const response = await fetch(`${API_URL}/chat/ask`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({
        content,
        modelId,
        conversationId,
        ...options,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Erreur streaming';
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorMessage;
      } catch (e) {
        if (response.status === 429) errorMessage = 'Quota API dépassé.';
        if (response.status === 503) errorMessage = 'Service indisponible.';
      }
      throw new Error(errorMessage);
    }

    const annotationId = response.headers.get('x-annotation-id');
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) return { annotationId };

    let accumulatedText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // On décode le morceau actuel
      const chunk = decoder.decode(value, { stream: true });

      // On l'ajoute au cumul
      accumulatedText += chunk;

      // On envoie le cumul TOTAL à l'UI
      onChunk(accumulatedText);
    }

    return { annotationId };
  },

  getConversationMessages: (
    id: string,
    cursor?: string,
    limit: number = 20,
  ) => {
    let endpoint = `/chat/conversations/${id}?limit=${limit}`;
    if (cursor) endpoint += `&cursor=${cursor}`;
    return request<{ messages: any[]; nextCursor: string | null }>(endpoint);
  },

  getAvailableModels: () => request<AiModel[]>('/chat/models'),
  getConversations: () => request<any[]>('/chat/conversations'),
};
