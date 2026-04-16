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

export enum AiProvider {
  GEMINI = 'GEMINI',
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
}

export interface AiModel {
  id: string;
  name: string;
  provider: AiProvider;
  contextWindow: number;
  isEnabled: boolean;
}

/**
 * Rôles dans une conversation (Standardisé pour la plupart des APIs)
 */
export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}
