// apps/backend/src/app/modules/chat/chat.service.ts

import { generateText, streamText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderFactory } from './providers/provider.factory';
import { EncryptionService } from '../encryption/encryption.service';
import { MessageRole, BlockType } from '@prisma/client';
import { AskDto } from './dto/ask.dto';

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
  async getAiStreamResponse(userId: string, dto: AskDto) {
    const { model, apiKey } = await this.validateAccess(userId, dto.modelId);

    let history: any[] = [];
    let systemPrompt = '';
    let currentConvId = dto.conversationId;
    let isNewConversation = false;

    // On utilise un nom unique pour éviter toute confusion de scope
    let annotationIdToSave = dto.annotationId;

    if (dto.isFork && dto.blockId) {
      const block = await this.prisma.messageBlock.findUnique({
        where: { id: dto.blockId },
        include: { message: true },
      });
      if (!block) throw new BadRequestException('Bloc introuvable');

      currentConvId = block.message.conversationId;
      systemPrompt = `Précision sur : "${block.content}"`;

      // --- CRÉATION DE L'ANNOTATION EN AMONT ---
      if (!annotationIdToSave) {
        const ann = await this.prisma.messageAnnotation.create({
          data: {
            userId,
            blockId: dto.blockId!,
            selectedText: dto.selectedText!,
            startIndex: dto.startIndex || 0,
            endIndex: dto.endIndex || 0,
          },
        });
        annotationIdToSave = ann.id;
      }

      // Note : On utilise bien l'ID (existant ou nouveau) pour charger l'historique
      const forkMsgs = await this.getForkMessages(userId, annotationIdToSave);
      if (forkMsgs.length > 0) {
        history = forkMsgs.map((m) => ({
          role: m.role.toLowerCase() as any,
          content: m.blocks.map((b) => b.content).join('\n'),
        }));
      } else {
        // Premier message du fork
        history = [
          {
            role: 'user',
            content: `[PASSAGE]\n${dto.selectedText}\n\n[QUESTION]\n${dto.content}`,
          },
        ];
      }
    } else {
      // MODE NORMAL (Inchangé)
      if (!currentConvId) {
        const newConv = await this.prisma.conversation.create({
          data: { userId, title: 'Nouvelle discussion' },
        });
        currentConvId = newConv.id;
        isNewConversation = true;
      }

      const conv = await this.prisma.conversation.findUnique({
        where: { id: currentConvId },
        select: { summary: true },
      });

      const lastMessages = await this.prisma.message.findMany({
        where: { conversationId: currentConvId, parentMessageId: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { blocks: { orderBy: { order: 'asc' } } },
      });

      systemPrompt = `Résumé : ${conv?.summary || 'Néant'}`;
      history = lastMessages.reverse().map((m) => ({
        role: m.role.toLowerCase() as any,
        content: m.blocks.map((b) => b.content).join('\n'),
      }));
      history.push({ role: 'user', content: dto.content });
    }

    const googleProvider = createGoogleGenerativeAI({ apiKey });

    // On capture les variables nécessaires dans des constantes locales
    // AVANT d'entrer dans le stream pour être sûr qu'elles sont "clotûrées" (closure)
    const finalConvId = currentConvId;
    const finalAnnotationId = annotationIdToSave;

    const result = await streamText({
      model: googleProvider(dto.modelId),
      system: systemPrompt,
      messages: history,
      onFinish: async ({ text }) => {
        try {
          let parentMessageId = undefined;
          if (dto.isFork && dto.blockId) {
            parentMessageId = await this.getParentMessageIdFromBlock(
              dto.blockId,
            );
          }

          await this.saveMessagePair({
            userId,
            conversationId: finalConvId!,
            userContent: dto.content,
            aiContent: text,
            modelId: dto.modelId,
            parentMessageId,
            annotationId: finalAnnotationId,
            forkData: undefined,
          });

          if (!dto.isFork) {
            this.maybeUpdateSummary(finalConvId!, model, apiKey).catch(
              console.error,
            );

            if (isNewConversation) {
              this.generateConversationTitle(
                finalConvId!,
                dto.content, // On se base sur le premier message de l'user
                dto.modelId,
                apiKey,
                model.provider,
              ).catch((e) => console.error('Title generation error:', e));
            }
          }
        } catch (saveError) {
          console.error('CRITICAL: Erreur sauvegarde stream:', saveError);
        }
      },
    });

    const response = result.toTextStreamResponse();
    if (finalAnnotationId) {
      response.headers.set('Access-Control-Expose-Headers', 'x-annotation-id');
      response.headers.set('x-annotation-id', finalAnnotationId);
    }
    return response;
  }

  /**
   * RÉSUMÉ : Analyse et compresse l'historique par paliers
   */
  private async maybeUpdateSummary(
    conversationId: string,
    model: any,
    apiKey: string,
  ) {
    const count = await this.prisma.message.count({
      where: { conversationId, parentMessageId: null },
    });

    // On résume tous les 5 messages dès qu'on dépasse 15
    if (count >= 15 && count % 5 === 0) {
      const conv = await this.prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            where: { parentMessageId: null },
            orderBy: { createdAt: 'asc' },
            take: count - 10, // On garde les 10 derniers en buffer
            include: { blocks: true },
          },
        },
      });

      if (!conv) return;

      const textToSummarize = conv.messages
        .map((m) => `${m.role}: ${m.blocks.map((b) => b.content).join(' ')}`)
        .join('\n');

      const googleProvider = createGoogleGenerativeAI({ apiKey });

      // Utilisation de generateText pour le résumé (pas de stream nécessaire ici)
      const { text: newSummary } = await generateText({
        model: googleProvider(model.id),
        system:
          "Tu es un expert en synthèse. Tu dois mettre à jour le résumé technique d'une discussion.",
        prompt: `Ancien résumé: ${conv.summary || 'Néant'}\n\nNouveaux éléments: ${textToSummarize}\n\nProduis un nouveau résumé unique et dense.`,
      });

      await this.prisma.conversation.update({
        where: { id: conversationId },
        data: { summary: newSummary },
      });
    }
  }

  private async getParentMessageIdFromBlock(blockId?: string) {
    if (!blockId) return undefined;
    const block = await this.prisma.messageBlock.findUnique({
      where: { id: blockId },
    });
    return block?.messageId;
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

  async getConversationMessagesPaginated(
    userId: string,
    conversationId: string,
    cursor?: string,
    limit: number = 20,
  ) {
    // 1. On vérifie d'abord que la conversation appartient à l'user
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId, userId },
    });

    if (!conversation)
      throw new BadRequestException('Conversation introuvable');

    // 2. On récupère les messages de manière paginée
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        parentMessageId: null, // On ne prend que le thread principal
      },
      // Le curseur : on commence après cet ID
      // skip: 1 permet de ne pas ré-inclure le message du curseur lui-même
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),

      // On prend les plus récents
      orderBy: { createdAt: 'desc' },
      take: limit,

      include: {
        blocks: {
          orderBy: { order: 'asc' },
          include: { annotations: true },
        },
      },
    });

    // 3. On calcule si on a encore des messages après cette page
    // On les remet dans l'ordre chronologique (asc) pour le front
    return {
      messages: messages.reverse(),
      nextCursor: messages.length === limit ? messages[0].id : null,
    };
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
