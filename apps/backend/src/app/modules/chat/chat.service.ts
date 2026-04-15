import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProviderFactory } from './providers/provider.factory';
import { EncryptionService } from '../encryption/encryption.service';
import { MessageRole } from './types/providers';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private providerFactory: ProviderFactory
  ) {}

  async getAiResponse(userId: string, modelId: string, content: string) {
    // 1. Trouver le modèle et son provider en BDD
    const model = await this.prisma.aiModel.findUnique({ where: { id: modelId } });
    if (!model) throw new BadRequestException('Modèle introuvable');

    // 2. Récupérer la clé API chiffrée de l'utilisateur
    const keyRecord = await this.prisma.userApiKey.findUnique({
      where: { userId_provider: { userId, provider: model.provider } }
    });
    if (!keyRecord) throw new BadRequestException(`Clé manquante pour ${model.provider}`);

    const apiKey = this.encryptionService.decrypt(keyRecord.encryptedKey);

    // 3. Obtenir la bonne stratégie via la Factory
    const strategy = this.providerFactory.getProvider(model.provider);

    // 4. Appeler l'IA via l'interface générique
    const aiResponse = await strategy.generateResponse(
      [{ role: MessageRole.USER, content }], 
      model.id, 
      apiKey
    );

    // 5. Persistance en DB (Conversation, Messages...)
    // ... ton code Prisma de sauvegarde ici ...

    return { response: aiResponse };
  }
}