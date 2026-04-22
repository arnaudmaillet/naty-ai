// apps/backend/src/app/modules/chat/domain/entities/chat.entities.ts

export type AiProvider = 'GEMINI' | 'OPENAI' | 'ANTHROPIC';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';
export type BlockType = 'TEXT' | 'CODE' | 'IMAGE';

export interface AiModelEntity {
  id: string;
  name: string;
  provider: AiProvider;
  contextWindow: number;
  isEnabled: boolean;
  isPublic: boolean;
}

export interface ConversationEntity {
  id: string;
  userId: string;
  title: string | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageBlockEntity {
  id: string;
  content: string;
  type: BlockType;
  order: number;
}

export interface MessageEntity {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string | null;
  modelId: string | null;
  parentMessageId: string | null;
  annotationId: string | null;
  blocks: MessageBlockEntity[];
  createdAt: Date;
}

export interface AnnotationEntity {
  id: string;
  blockId: string;
  userId: string;
  selectedText: string;
  startIndex: number;
  endIndex: number;
}
