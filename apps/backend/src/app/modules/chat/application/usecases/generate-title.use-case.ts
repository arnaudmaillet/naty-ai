// apps/backend/src/app/modules/chat/application/use-cases/generate-title.use-case.ts

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IAiGateway } from '../../domain/gateways/ai.gateway.interface';
import { IChatRepository } from '../../domain/repositories/chat.repository.interface';

@Injectable()
export class GenerateTitleUseCase {
  // Optionnel mais recommandé : utiliser le Logger NestJS pour tracer les tâches de fond
  private readonly logger = new Logger(GenerateTitleUseCase.name);

  constructor(
    @Inject('IChatRepository') private readonly repository: IChatRepository,
    @Inject('IAiGateway') private readonly aiGateway: IAiGateway,
  ) {}

  /**
   * Génère et sauvegarde un titre court pour une nouvelle conversation.
   */
  async execute(
    conversationId: string, 
    firstMessage: string, 
    modelId: string, 
    apiKey: string
  ): Promise<void> {
    try {
      // 1. Récupération des infos du modèle pour connaître le Provider (Gemini, OpenAI...)
      const model = await this.repository.findModelById(modelId);
      if (!model) {
        this.logger.warn(`Modèle ${modelId} introuvable pour la génération de titre.`);
        return;
      }

      // 2. Préparation du prompt métier
      const systemPrompt = "Tu es un expert en synthèse. Ton seul but est de nommer des conversations.";
      const prompt = `Génère un titre très court (max 4 mots) décrivant ce message : "${firstMessage}". 
                      Ne mets aucune ponctuation finale, ni de guillemets.`;

      // 3. Appel de l'IA via la Gateway (Agnostique !)
      const generatedTitle = await this.aiGateway.generateText({
        modelId: model.id,
        provider: model.provider,
        apiKey: apiKey,
        systemPrompt: systemPrompt,
        prompt: prompt,
      });

      // 4. Nettoyage basique du retour de l'IA
      const cleanTitle = generatedTitle.replace(/"/g, '').trim();

      // 5. Mise à jour en base de données via le Repository
      await this.repository.updateConversation(conversationId, { title: cleanTitle });
      
      this.logger.log(`Titre généré pour la conversation ${conversationId}: ${cleanTitle}`);

    } catch (error) {
      this.logger.error(`Erreur lors de la génération du titre pour ${conversationId}`, error);
      // Fallback de sécurité en cas d'échec de l'IA
      await this.repository.updateConversation(conversationId, { title: 'Nouvelle discussion' }).catch();
    }
  }
}