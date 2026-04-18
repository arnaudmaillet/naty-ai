// On exporte uniquement les TYPES (interfaces) pour le frontend
// Cela évite d'importer la logique lourde de Prisma dans le navigateur

import {
  Message as PrismaMessage,
  MessageBlock as PrismaMessageBlock,
  MessageAnnotation as PrismaMessageAnnotation,
} from '@prisma/client';

// 1. On définit ce qu'est un bloc avec ses annotations
export type MessageBlock = PrismaMessageBlock & {
  annotations?: PrismaMessageAnnotation[];
};

// 2. On définit le Message complet avec ses relations
export type Message = PrismaMessage & {
  blocks: MessageBlock[]; // On le rend obligatoire ou optionnel selon ton usage
  replies?: Message[];
};

export const MessageRole = {
  USER: 'USER',
  ASSISTANT: 'ASSISTANT',
  SYSTEM: 'SYSTEM',
} as const;

export type MessageRole = keyof typeof MessageRole;

export const BlockType = {
  TEXT: 'TEXT',
  CODE: 'CODE',
  IMAGE: 'IMAGE',
} as const;

export type BlockType = keyof typeof BlockType;

// On ré-exporte les types dont on a besoin
export type {
  Conversation,
  AiModel,
  MessageAnnotation,
  User,
  UserApiKey,
} from '@prisma/client';

/**
 * TYPES PERSONNALISÉS (Non-DB)
 * Tu peux ajouter ici des types qui n'existent pas dans Prisma
 * mais dont tu as besoin pour l'UI.
 */
export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  token: string;
}

// Exemple pour ton ForkConfig dans le layout
export interface ForkConfig {
  isOpen: boolean;
  selectedText: string;
  blockId: string;
  annotationId: string | null;
  forkMessages: any[];
}
