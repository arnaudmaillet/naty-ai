// apps/backend/src/app/modules/chat/infrastructure/repositories/prisma-chat.repository.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AiModelEntity,
  AiProvider,
  ConversationEntity,
  MessageEntity,
  MessageRole,
  BlockType,
} from '../../domain/entities/chat.entities';
import { IChatRepository } from '../../domain/repositories/chat.repository.interface';

@Injectable()
export class PrismaChatRepository implements IChatRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ====================================================================
  // MÉTHODES DE LECTURE (QUERIES)
  // ====================================================================

  async getAvailableModels(): Promise<AiModelEntity[]> {
    const models = await this.prisma.aiModel.findMany({
      where: { isEnabled: true, isPublic: true },
      orderBy: { name: 'asc' },
    });

    // Mapping : Array Prisma -> Array Domaine
    return models.map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider as AiProvider,
      contextWindow: model.contextWindow,
      isEnabled: model.isEnabled,
      isPublic: model.isPublic,
    }));
  }

  async findModelById(id: string): Promise<AiModelEntity | null> {
    const model = await this.prisma.aiModel.findUnique({ where: { id } });
    if (!model) return null;

    // Mapping : Prisma -> Domaine
    return {
      id: model.id,
      name: model.name,
      provider: model.provider as AiProvider,
      contextWindow: model.contextWindow,
      isEnabled: model.isEnabled,
      isPublic: model.isPublic,
    };
  }

  async getUserApiKey(
    userId: string,
    provider: string,
  ): Promise<{ encryptedKey: string } | null> {
    // Ici on ne renvoie qu'un fragment, pas besoin de mapper une entité entière
    return this.prisma.userApiKey.findUnique({
      where: { userId_provider: { userId, provider: provider as any } },
      select: { encryptedKey: true },
    });
  }

  async getBlockWithConversation(blockId: string): Promise<any | null> {
    return this.prisma.messageBlock.findUnique({
      where: { id: blockId },
      include: { message: { select: { conversationId: true } } },
    });
  }

  async getConversationSummary(
    conversationId: string,
  ): Promise<Partial<ConversationEntity> | null> {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { summary: true },
    });
    return conv ? { summary: conv.summary } : null;
  }

  async getUserConversations(
    userId: string,
  ): Promise<Partial<ConversationEntity>[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });

    return conversations.map((c) => ({
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
    }));
  }

  async getForkMessages(
    userId: string,
    annotationId: string,
  ): Promise<MessageEntity[]> {
    const messages = await this.prisma.message.findMany({
      where: { annotationId, conversation: { userId } },
      orderBy: { createdAt: 'asc' },
      include: { blocks: { orderBy: { order: 'asc' } } },
    });

    return messages.map((msg) => this.mapToMessageEntity(msg));
  }

  async getLastMainThreadMessages(
    conversationId: string,
    take: number,
  ): Promise<MessageEntity[]> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, parentMessageId: null },
      orderBy: { createdAt: 'desc' },
      take,
      include: { blocks: { orderBy: { order: 'asc' } } },
    });

    return messages.map((msg) => this.mapToMessageEntity(msg));
  }

  async getConversationMessagesPaginated(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<{ messages: MessageEntity[]; nextCursor?: string }> {
    const messages = await this.prisma.message.findMany({
      where: { conversationId, parentMessageId: null },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { blocks: { orderBy: { order: 'asc' } } },
    });

    const domainMessages = messages
      .reverse()
      .map((msg) => this.mapToMessageEntity(msg));

    return {
      messages: domainMessages,
      nextCursor: messages.length === limit ? messages[0].id : undefined,
    };
  }

  async countMainThreadMessages(conversationId: string): Promise<number> {
    return this.prisma.message.count({
      where: { conversationId, parentMessageId: null },
    });
  }

  // ====================================================================
  // MÉTHODES D'ÉCRITURE (MUTATIONS)
  // ====================================================================

  async createConversation(
    userId: string,
    title: string,
  ): Promise<ConversationEntity> {
    const conv = await this.prisma.conversation.create({
      data: { userId, title },
    });

    return {
      id: conv.id,
      userId: conv.userId,
      title: conv.title,
      summary: conv.summary,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
    };
  }

  async updateConversation(
    id: string,
    data: Partial<ConversationEntity>,
  ): Promise<void> {
    await this.prisma.conversation.update({
      where: { id },
      data,
    });
  }

  async createAnnotation(params: any): Promise<any> {
    return this.prisma.messageAnnotation.create({
      data: {
        userId: params.userId,
        blockId: params.blockId,
        selectedText: params.selectedText,
        startIndex: params.startIndex,
        endIndex: params.endIndex,
      },
    });
  }

  // ====================================================================
  // MÉTHODE DE SAUVEGARDE (TRANSACTION)
  // ====================================================================

  async saveMessageTransaction(
    params: any,
  ): Promise<{ annotationId?: string }> {
    return this.prisma.$transaction(async (tx) => {
      let finalAnnotationId = params.annotationId;

      // 1. GESTION DE L'ANCRE (ANNOTATION) POUR LES FORKS
      if (params.forkData && !finalAnnotationId) {
        const ann = await tx.messageAnnotation.create({
          data: {
            userId: params.userId,
            blockId: params.forkData.blockId,
            selectedText: params.forkData.selectedText,
            startIndex: params.forkData.startIndex,
            endIndex: params.forkData.endIndex,
          },
        });
        finalAnnotationId = ann.id;
      }

      // 2. CRÉATION DU MESSAGE UTILISATEUR
      await tx.message.create({
        data: {
          role: 'USER',
          conversationId: params.conversationId,
          parentMessageId: params.parentMessageId || null,
          annotationId: finalAnnotationId || null,
          blocks: {
            create: {
              content: params.userContent,
              type: 'TEXT',
              order: 0,
            },
          },
        },
      });

      // 3. PRÉPARATION ET CRÉATION DU MESSAGE ASSISTANT
      const paragraphs = params.aiContent
        .split(/\n\n+/)
        .filter((p: string) => p.trim() !== '');

      await tx.message.create({
        data: {
          role: 'ASSISTANT',
          conversationId: params.conversationId,
          parentMessageId: params.parentMessageId || null,
          annotationId: finalAnnotationId || null,
          modelId: params.modelId,
          blocks: {
            create: paragraphs.map((para: string, index: number) => {
              const text = para.trim();
              let type = 'TEXT';

              if (text.startsWith('```')) {
                type = 'CODE';
              }

              return { content: text, type, order: index };
            }),
          },
        },
      });

      return { annotationId: finalAnnotationId };
    });
  }

  // ====================================================================
  // MÉTHODE DE MAPPING (TRADUCTION PRIVÉE)
  // ====================================================================

  private mapToMessageEntity(prismaMsg: any): MessageEntity {
    return {
      id: prismaMsg.id,
      conversationId: prismaMsg.conversationId,
      role: prismaMsg.role as MessageRole,
      content: prismaMsg.content,
      modelId: prismaMsg.modelId,
      parentMessageId: prismaMsg.parentMessageId,
      annotationId: prismaMsg.annotationId,
      createdAt: prismaMsg.createdAt,
      blocks: prismaMsg.blocks
        ? prismaMsg.blocks.map((b: any) => ({
            id: b.id,
            content: b.content,
            type: b.type as BlockType,
            order: b.order,
          }))
        : [],
    };
  }
}
