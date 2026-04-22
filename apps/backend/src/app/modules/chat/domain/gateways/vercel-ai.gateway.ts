// apps/backend/src/app/modules/chat/infrastructure/gateways/vercel-ai.gateway.ts

import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { streamText, generateText as aiGenerateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
// Tu pourras importer ces lignes le jour où tu utiliseras d'autres IA :
// import { createOpenAI } from '@ai-sdk/openai'; 
// import { createAnthropic } from '@ai-sdk/anthropic';

import { IAiGateway } from '../../domain/gateways/ai.gateway.interface';

@Injectable()
export class VercelAiGateway implements IAiGateway {
  private readonly logger = new Logger(VercelAiGateway.name);

  // ====================================================================
  // 1. MÉTHODE POUR LE FLUX EN DIRECT (STREAMING)
  // ====================================================================
  async streamChat(params: {
    modelId: string;
    provider: string;
    apiKey: string;
    systemPrompt: string;
    messages: any[];
    onFinish: (text: string) => Promise<void>;
  }): Promise<Response> {
    try {
      // On récupère le bon "moteur" (Google, OpenAI...) selon la BDD
      const aiModelInstance = this.getAiModelInstance(params.provider, params.apiKey, params.modelId);

      const result = await streamText({
        model: aiModelInstance,
        system: params.systemPrompt,
        messages: params.messages,
        onFinish: async (event) => {
          // Vercel AI SDK renvoie un objet complexe, on extrait juste le texte final
          // et on le passe à la fonction de callback définie dans notre Use Case
          await params.onFinish(event.text);
        },
      });

      // Retourne une réponse Web standard compatible avec Express/NestJS
      return result.toTextStreamResponse();
      
    } catch (error) {
      this.logger.error(`Erreur lors du stream avec ${params.provider}`, error);
      throw new InternalServerErrorException("Échec de la communication avec l'IA");
    }
  }

  // ====================================================================
  // 2. MÉTHODE POUR LES TÂCHES DE FOND (TITRE, RÉSUMÉ)
  // ====================================================================
  async generateText(params: {
    modelId: string;
    provider: string;
    apiKey: string;
    systemPrompt: string;
    prompt: string;
  }): Promise<string> {
    try {
      const aiModelInstance = this.getAiModelInstance(params.provider, params.apiKey, params.modelId);

      const { text } = await aiGenerateText({
        model: aiModelInstance,
        system: params.systemPrompt,
        prompt: params.prompt,
      });

      return text;

    } catch (error) {
      this.logger.error(`Erreur lors de la génération de texte avec ${params.provider}`, error);
      throw new InternalServerErrorException("Échec de la génération de texte");
    }
  }

  // ====================================================================
  // MÉTHODE PRIVÉE : LE SÉLECTEUR DE FOURNISSEUR (Factory Pattern)
  // ====================================================================
  
  /**
   * C'est ici que tu gères les spécificités de chaque fournisseur d'IA.
   * Le reste de ton application s'en moque totalement !
   */
  private getAiModelInstance(providerName: string, apiKey: string, modelId: string) {
    switch (providerName.toUpperCase()) {
      case 'GEMINI': {
        const google = createGoogleGenerativeAI({ apiKey });
        return google(modelId);
      }
      
      case 'OPENAI': {
        // Exemple pour plus tard :
        // const openai = createOpenAI({ apiKey });
        // return openai(modelId);
        throw new Error("OpenAI n'est pas encore implémenté dans l'infrastructure");
      }

      case 'ANTHROPIC': {
        // Exemple pour plus tard :
        // const anthropic = createAnthropic({ apiKey });
        // return anthropic(modelId);
        throw new Error("Anthropic n'est pas encore implémenté dans l'infrastructure");
      }

      default:
        throw new Error(`Fournisseur IA inconnu ou non supporté : ${providerName}`);
    }
  }
}