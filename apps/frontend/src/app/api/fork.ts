// apps/frontend/src/app/api/fork.ts

import { request } from './client';
import { Message } from '@naty-ai/shared-types';

export const forkApi = {
  sendMessage: (data: any) =>
    request<any>('/chat/fork', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getMessages: (annotationId: string) =>
    request<Message[]>(`/chat/fork/${annotationId}`),
};