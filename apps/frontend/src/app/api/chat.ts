// apps/frontend/src/app/api/chat.ts

import { request } from './client';
import { AiModel } from '@naty-ai/shared-types';

export const chatApi = {
  ask: (content: string, modelId: string, conversationId?: string) =>
    request<any>('/chat/ask', {
      method: 'POST',
      body: JSON.stringify({ content, modelId, conversationId }),
    }),

  getFullConversation: (id: string) => request<any>(`/chat/conversations/${id}`),
  
  getAvailableModels: () => request<AiModel[]>('/chat/models'),
  
  getConversations: () => request<any[]>('/chat/conversations'),
};