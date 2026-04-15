export function types(): string {
  return 'types';
}

export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  conversationId: string;
  modelId?: string | null;
  createdAt: Date | string;
}

export interface Conversation {
  id: string;
  title?: string | null;
  userId: string;
  updatedAt: Date | string;
  createdAt: Date | string;
  messages?: Message[];
}