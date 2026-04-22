// apps/backend/src/app/modules/chat/domain/chat.repository.interface.ts

import {
  AiModelEntity,
  ConversationEntity,
  MessageEntity,
  AnnotationEntity,
  MessageBlockEntity,
} from '../entities/chat.entities';

export interface IChatRepository {
  // ====================================================================
  // MÉTHODES DE LECTURE (QUERIES)
  // ====================================================================

  /** Récupère la liste de tous les modèles IA actifs et publics */
  getAvailableModels(): Promise<AiModelEntity[]>;

  /** Récupère un modèle IA et ses configurations */
  findModelById(id: string): Promise<AiModelEntity | null>;

  /** Récupère la clé API chiffrée d'un utilisateur pour un fournisseur donné */
  getUserApiKey(
    userId: string,
    provider: string,
  ): Promise<{ encryptedKey: string } | null>;

  /** Récupère uniquement le résumé d'une conversation */
  getConversationSummary(
    conversationId: string,
  ): Promise<Partial<ConversationEntity> | null>;

  /** Liste les conversations d'un utilisateur (souvent id, title, updatedAt) */
  getUserConversations(userId: string): Promise<Partial<ConversationEntity>[]>;

  /** Récupère l'historique paginé d'une discussion pour l'affichage Front-End */
  getConversationMessagesPaginated(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit?: number,
  ): Promise<{ messages: MessageEntity[]; nextCursor?: string }>;

  /** Récupère les X derniers messages du thread principal (utile pour le contexte IA) */
  getLastMainThreadMessages(
    conversationId: string,
    take: number,
  ): Promise<MessageEntity[]>;

  /** Récupère tous les messages appartenant à une dérivation (Fork) */
  getForkMessages(
    userId: string,
    annotationId: string,
  ): Promise<MessageEntity[]>;

  /** Compte le nombre de messages dans une conversation (utile pour déclencher le résumé) */
  countMainThreadMessages(conversationId: string): Promise<number>;

  /** Récupère un bloc spécifique en incluant l'ID de la conversation parente */
  getBlockWithConversation(
    blockId: string,
  ): Promise<
    (MessageBlockEntity & { message: { conversationId: string } }) | null
  >;

  // ====================================================================
  // MÉTHODES D'ÉCRITURE (MUTATIONS)
  // ====================================================================

  /** Initialise une nouvelle conversation en base */
  createConversation(
    userId: string,
    title: string,
  ): Promise<ConversationEntity>;

  /** Met à jour une conversation existante (titre, résumé, etc.) */
  updateConversation(
    id: string,
    data: Partial<ConversationEntity>,
  ): Promise<void>;

  /** Crée une nouvelle ancre (annotation) sur un texte sélectionné */
  createAnnotation(params: {
    userId: string;
    blockId: string;
    selectedText: string;
    startIndex: number;
    endIndex: number;
  }): Promise<AnnotationEntity>;

  /** * Transaction SQL : Sauvegarde en une seule fois le message User,
   * l'annotation (si fork) et les blocs du message IA.
   */
  saveMessageTransaction(params: {
    userId: string;
    conversationId: string;
    userContent: string;
    aiContent: string;
    modelId: string;
    parentMessageId?: string;
    annotationId?: string;
    forkData?: {
      blockId: string;
      selectedText: string;
      startIndex: number;
      endIndex: number;
    };
  }): Promise<{ annotationId?: string }>;
}
