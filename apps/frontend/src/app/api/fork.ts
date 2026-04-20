// apps/frontend/src/app/api/fork.ts

import { request } from './client';
import { Message } from '@naty-ai/shared-types';

export const forkApi = {
  getMessages: (annotationId: string) =>
    request<Message[]>(`/chat/fork/${annotationId}`),
};