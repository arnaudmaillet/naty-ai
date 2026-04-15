import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderFactory } from './providers/provider.factory';
import { EncryptionService } from '../encryption/encryption.service';
import { MessageRole } from './types/providers';
import { ChatMessage } from './interfaces/ai-strategy';

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

    // 3. Obtenir la stratégie
    let conversation;
    let history: ChatMessage[] = [];

    if (conversationId) {
      // On récupère la conversation et les 10 derniers messages pour le contexte
      conversation = await this.prisma.conversation.findUnique({
        where: { id: conversationId, userId }, // Sécurité : vérifie que c'est bien celle de l'user
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // On limite pour ne pas exploser les tokens
          },
        },
      });

      if (!conversation)
        throw new BadRequestException('Conversation introuvable');

      // On transforme les messages Prisma au format attendu par les stratégies (ChatMessage[])
      history = conversation.messages.map((m) => ({
        role: m.role as MessageRole,
        content: m.content,
      }));
    } else {
      // Nouvelle conversation
      conversation = await this.prisma.conversation.create({
        data: { userId, title: content.substring(0, 50) },
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

    return { response: aiResponse, conversationId: conversation.id };
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
}
