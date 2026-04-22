// apps/backend/src/app/modules/chat/application/use-cases/update-summary.use-case.ts

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IAiGateway } from '../../domain/gateways/ai.gateway.interface';
import { IChatRepository } from '../../domain/repositories/chat.repository.interface';

@Injectable()
export class UpdateSummaryUseCase {
  private readonly logger = new Logger(UpdateSummaryUseCase.name);

  // Configuration métier : On met à jour le résumé tous les 5 messages, à partir de 15 messages.
  private readonly TRIGGER_THRESHOLD = 15;
  private readonly TRIGGER_INTERVAL = 5;

  constructor(
    @Inject('IChatRepository') private readonly repository: IChatRepository,
    @Inject('IAiGateway') private readonly aiGateway: IAiGateway,
  ) {}

  /**
   * Vérifie si un résumé est nécessaire et le met à jour de manière asynchrone.
   */
  async execute(conversationId: string, apiKey: string, modelId: string): Promise<void> {
    try {
      // 1. Logique Métier : Est-ce le moment de résumer ?
      const messageCount = await this.repository.countMainThreadMessages(conversationId);
      
      if (messageCount < this.TRIGGER_THRESHOLD || messageCount % this.TRIGGER_INTERVAL !== 0) {
        return; // Ce n'est pas encore le moment, on coupe l'exécution ici.
      }

      // 2. Récupération du contexte
      const model = await this.repository.findModelById(modelId);
      const conversation = await this.repository.getConversationSummary(conversationId);
      
      if (!model || !conversation) return;

      // On récupère les X derniers messages (ex: les 10 messages depuis le dernier résumé)
      const recentMessages = await this.repository.getLastMainThreadMessages(conversationId, 10);
      
      // On formate les messages en texte brut pour le prompt
      const textToSummarize = recentMessages
        .reverse()
        .map((m) => `${m.role}: ${m.blocks.map((b: any) => b.content).join(' ')}`)
        .join('\n\n');

      // 3. Préparation des Prompts
      const systemPrompt = "Tu es un assistant chargé de maintenir la mémoire contextuelle d'une discussion longue.";
      const prompt = `Voici l'ancien résumé de la discussion :
                      ${conversation.summary || 'Aucun résumé existant.'}
                      
                      Voici les nouveaux échanges qui ont eu lieu :
                      ${textToSummarize}
                      
                      Fusionne ces informations pour produire un NOUVEAU résumé unique, dense et technique de la situation globale.`;

      // 4. Appel à l'IA pour générer le texte
      const newSummary = await this.aiGateway.generateText({
        modelId: model.id,
        provider: model.provider,
        apiKey: apiKey,
        systemPrompt: systemPrompt,
        prompt: prompt,
      });

      // 5. Sauvegarde du nouveau résumé
      await this.repository.updateConversation(conversationId, { summary: newSummary });
      
      this.logger.log(`Résumé mis à jour pour la conversation ${conversationId}`);

    } catch (error) {
      this.logger.error(`Échec de la mise à jour du résumé pour ${conversationId}`, error);
    }
  }
}