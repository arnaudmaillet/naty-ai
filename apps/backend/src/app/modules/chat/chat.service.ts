import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderFactory } from './providers/provider.factory';
import { EncryptionService } from '../encryption/encryption.service';
import { ChatMessage } from './interfaces/ai-strategy';
import { MessageRole } from '@naty-ai/shared-types';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private providerFactory: ProviderFactory,
  ) {}

  async getAiResponse(
    userId: string,
    modelId: string,
    content: string,
    conversationId?: string,
  ) {
    // 1. Trouver le modèle
    const model = await this.prisma.aiModel.findUnique({
      where: { id: modelId },
    });
    if (!model) throw new BadRequestException('Modèle introuvable');

    // 2. Récupérer et déchiffrer la clé
    const keyRecord = await this.prisma.userApiKey.findUnique({
      where: { userId_provider: { userId, provider: model.provider } },
    });
    if (!keyRecord)
      throw new BadRequestException(`Clé manquante pour ${model.provider}`);

    const apiKey = this.encryptionService.decrypt(keyRecord.encryptedKey);

    // 3. Obtenir la conversation et l'historique
    let conversation;
    let history: ChatMessage[] = [];
    let isNewConversation = false;

    if (conversationId) {
      conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId, userId },
        include: { messages: { orderBy: { createdAt: 'asc' }, take: 20 } },
      });
      if (!conversation)
        throw new BadRequestException('Conversation introuvable');

      history = conversation.messages.map((m) => ({
        role: m.role as MessageRole,
        content: m.content,
      }));
    } else {
      isNewConversation = true;
      conversation = await this.prisma.conversation.create({
        data: { userId, title: 'Nouvelle discussion' },
      });
    }

    // 4. Ajouter le message actuel à l'historique avant l'envoi
    const currentMessage: ChatMessage = { role: MessageRole.USER, content };
    const fullContext = [...history, currentMessage];

    // 5. Appeler l'IA avec TOUT le contexte
    const strategy = this.providerFactory.getProvider(model.provider);
    const aiResponse = await strategy.generateResponse(
      fullContext,
      model.id,
      apiKey,
    );

    // 6. Sauvegarder les deux nouveaux messages (User et AI) en BDD
    await this.prisma.message.createMany({
      data: [
        { content, role: MessageRole.USER, conversationId: conversation.id },
        {
          content: aiResponse,
          role: MessageRole.ASSISTANT,
          conversationId: conversation.id,
          modelId: model.id,
        },
      ],
    });

    let finalTitle = conversation.title; // Par défaut "Nouvelle discussion"

    if (isNewConversation) {
      finalTitle = await this.generateConversationTitle(
        conversation.id,
        content,
        model.id,
        apiKey,
        model.provider,
      );
    }

    // 8. On renvoie le titre au front pour qu'il puisse mettre à jour la Sidebar immédiatement
    return {
      response: aiResponse,
      conversationId: conversation.id,
      title: finalTitle,
    };
  }

  async getUserConversations(userId: string) {
    return this.prisma.conversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true },
    });
  }

  async getConversationWithMessages(userId: string, conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation)
      throw new BadRequestException('Conversation introuvable');
    return conversation;
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
      return 'Nouvelle discussion'; // Fallback
    }
  }

  async getModels() {
    return this.prisma.aiModel.findMany({
      where: {
        isEnabled: true,
        isPublic: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }
}
