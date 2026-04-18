import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderFactory } from './providers/provider.factory';
import { EncryptionService } from '../encryption/encryption.service';
import { ChatMessage } from './interfaces/ai-strategy';
import { MessageRole, BlockType } from '@prisma/client';
import { HandleForkDto } from './dto/fork.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private providerFactory: ProviderFactory,
  ) {}

  /**
   * Génère une réponse IA et décompose le contenu en blocs pour un ancrage précis.
   */
  async getAiResponse(
    userId: string,
    modelId: string,
    content: string,
    conversationId?: string,
  ) {
    const { model, apiKey } = await this.validateAccess(userId, modelId);

    let history: ChatMessage[] = [];
    let currentConvId = conversationId;
    let isNewConversation = false;

    if (conversationId) {
      const conv = await this.prisma.conversation.findUnique({
        where: { id: conversationId, userId },
        include: {
          messages: {
            where: { parentMessageId: null }, // On ne prend que le tronc principal pour le contexte
            orderBy: { createdAt: 'asc' },
            take: 20,
            include: { blocks: { orderBy: { order: 'asc' } } },
          },
        },
      });
      if (!conv) throw new BadRequestException('Conversation introuvable');

      history = conv.messages.map((m) => ({
        role: m.role,
        content: m.blocks.map((b) => b.content).join('\n\n'),
      }));
    } else {
      isNewConversation = true;
      const newConv = await this.prisma.conversation.create({
        data: { userId, title: 'Nouvelle discussion' },
      });
      currentConvId = newConv.id;
    }

    const aiResponse = await this.callAiStrategy(model, apiKey, [
      ...history,
      { role: MessageRole.USER, content },
    ]);

    const saved = await this.saveMessagePair({
      userId,
      conversationId: currentConvId!,
      userContent: content,
      aiContent: aiResponse,
      modelId: model.id,
      parentMessageId: undefined,
    });

    // Génération du titre si c'est le premier message
    let finalTitle = 'Nouvelle discussion';
    if (isNewConversation) {
      finalTitle = await this.generateConversationTitle(
        currentConvId!,
        content,
        model.id,
        apiKey,
        model.provider,
      );
    }

    return {
      ...saved,
      response: aiResponse,
      conversationId: currentConvId,
      title: finalTitle,
    };
  }

  /**
   * FLUX FORK : Réponse contextuelle liée à une annotation sur un bloc
   */
  async handleFork(userId: string, dto: HandleForkDto) {
    const { model, apiKey } = await this.validateAccess(userId, dto.modelId);

    // 1. On récupère le bloc d'origine (Ancre)
    const block = await this.prisma.messageBlock.findUnique({
      where: { id: dto.blockId },
      include: { message: true },
    });
    if (!block) throw new BadRequestException('Bloc introuvable');

    let chatHistory: ChatMessage[] = [];

    // 2. GESTION DU CONTEXTE IA
    if (dto.annotationId) {
      const previousMessages = await this.getForkMessages(
        userId,
        dto.annotationId,
      );
      chatHistory = previousMessages.map((m) => ({
        role: m.role,
        content: m.blocks.map((b) => b.content).join('\n\n'),
      }));
    } else {
      chatHistory = [
        {
          role: MessageRole.USER,
          content:
            `[CONTEXTE DU PARAGRAPHE]\n"${block.content}"\n\n[PASSAGE SÉLECTIONNÉ]\n"${dto.selectedText}"\n\n[QUESTION]\n${dto.content}`.trim(),
        },
      ];
    }

    // 3. APPEL IA
    const aiResponse = await this.callAiStrategy(model, apiKey, chatHistory);

    // 4. SAUVEGARDE (Unique moteur partagé)
    return this.saveMessagePair({
      userId,
      conversationId: block.message.conversationId,
      userContent: dto.content,
      aiContent: aiResponse,
      modelId: model.id,
      parentMessageId: block.messageId, // On lie toujours au message parent
      annotationId: dto.annotationId, // Si présent, réutilise l'ancre existante
      // On ne passe forkData QUE si on n'a pas encore d'annotationId (donc création)
      forkData: dto.annotationId
        ? undefined
        : {
            blockId: block.id,
            selectedText: dto.selectedText!,
            startIndex: dto.startIndex || 0,
            endIndex: dto.endIndex || 0,
          },
    });
  }

  // --- LOGIQUE INTERNE PARTAGÉE ---

  private async validateAccess(userId: string, modelId: string) {
    const model = await this.prisma.aiModel.findUnique({
      where: { id: modelId },
    });
    if (!model) throw new BadRequestException('Modèle introuvable');

    const key = await this.prisma.userApiKey.findUnique({
      where: { userId_provider: { userId, provider: model.provider } },
    });
    if (!key)
      throw new BadRequestException(`Clé manquante pour ${model.provider}`);

    return { model, apiKey: this.encryptionService.decrypt(key.encryptedKey) };
  }

  private async callAiStrategy(
    model: any,
    apiKey: string,
    messages: ChatMessage[],
  ) {
    const strategy = this.providerFactory.getProvider(model.provider);
    return strategy.generateResponse(messages, model.id, apiKey);
  }

  private async saveMessagePair(params: {
    userId: string;
    conversationId: string;
    userContent: string;
    aiContent: string;
    modelId: string;
    parentMessageId?: string;
    annotationId?: string; // Pour répondre dans un fork existant
    forkData?: {
      // Pour créer un nouveau fork
      blockId: string;
      selectedText: string;
      startIndex: number;
      endIndex: number;
    };
  }) {
    return this.prisma.$transaction(async (tx) => {
      let finalAnnotationId = params.annotationId;

      // 1. GESTION DE L'ANCRE (ANNOTATION)
      // On ne crée l'annotation que si on a forkData ET qu'on n'a pas déjà un annotationId
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
      const userMsg = await tx.message.create({
        data: {
          role: MessageRole.USER,
          conversationId: params.conversationId,
          parentMessageId: params.parentMessageId || null,
          annotationId: finalAnnotationId || null,
          blocks: {
            create: {
              content: params.userContent,
              type: BlockType.TEXT,
              order: 0,
            },
          },
        },
      });

      // 3. PRÉPARATION ET CRÉATION DU MESSAGE ASSISTANT
      const paragraphs = params.aiContent
        .split(/\n\n+/)
        .filter((p) => p.trim() !== '');

      const assistantMsg = await tx.message.create({
        data: {
          role: MessageRole.ASSISTANT,
          conversationId: params.conversationId,
          parentMessageId: params.parentMessageId || null,
          annotationId: finalAnnotationId || null,
          modelId: params.modelId,
          blocks: {
            create: paragraphs.map((para, index) => {
              const text = para.trim();
              let type: BlockType = BlockType.TEXT;

              // Vérification du type de bloc
              if (text.startsWith('```')) {
                type = BlockType.CODE;
              }

              return { content: text, type, order: index };
            }),
          },
        },
        include: { blocks: { orderBy: { order: 'asc' } } },
      });

      return {
        userMessageId: userMsg.id,
        assistantMessageId: assistantMsg.id,
        blocks: assistantMsg.blocks,
        annotationId: finalAnnotationId,
      };
    });
  }

  /**
   * Récupère une conversation complète avec ses messages et leurs blocs respectifs.
   */
  async getConversationWithMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: {
        messages: {
          where: { parentMessageId: null },
          orderBy: { createdAt: 'asc' },
          include: {
            blocks: {
              orderBy: { order: 'asc' },
              include: {
                annotations: true,
              },
            },
          },
        },
      },
    });

    if (!conversation)
      throw new BadRequestException('Conversation introuvable');
    return conversation;
  }

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });
  }

  async generateConversationTitle(
    conversationId: string,
    firstMessage: string,
    modelId: string,
    apiKey: string,
    provider: any,
  ): Promise<string> {
    const prompt = `Génère un titre très court (max 4 mots) pour : "${firstMessage}". Pas de ponctuation, pas de guillemets.`;
    try {
      const strategy = this.providerFactory.getProvider(provider);
      const titleResponse = await strategy.generateResponse(
        [{ role: MessageRole.USER, content: prompt }],
        modelId,
        apiKey,
      );
      const cleanTitle = titleResponse.replace(/"/g, '').trim();

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { title: cleanTitle },
      });

      return cleanTitle;
    } catch (error) {
      return 'Nouvelle discussion';
    }
  }

  async getModels() {
    return this.prisma.aiModel.findMany({
      where: { isEnabled: true, isPublic: true },
      orderBy: { name: 'asc' },
    });
  }

  async getForkMessages(userId: string, annotationId: string) {
    return this.prisma.message.findMany({
      where: {
        annotationId: annotationId,
        conversation: {
          userId: userId,
        },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        blocks: { orderBy: { order: 'asc' } },
      },
    });
  }
}
