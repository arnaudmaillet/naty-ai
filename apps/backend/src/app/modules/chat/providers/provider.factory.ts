import { Injectable, BadRequestException } from '@nestjs/common';
import { AiProvider } from '@prisma/client';
import { AiStrategy } from './../interfaces/ai-strategy';
import { GeminiStrategy } from '../strategies/gemini.strategy';

@Injectable()
export class ProviderFactory {
  constructor(private geminiStrategy: GeminiStrategy) {}

  getProvider(provider: AiProvider): AiStrategy {
    switch (provider) {
      case AiProvider.GEMINI:
        return this.geminiStrategy;
      // case AiProvider.OPENAI: return this.openAiStrategy; (A ajouter plus tard)
      default:
        throw new BadRequestException(`Le provider ${provider} n'est pas encore supporté.`);
    }
  }
}