// apps/backend/src/app/modules/chat/application/use-cases/get-ai-stream.use-case.ts

import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { EncryptionService } from '../../../encryption/encryption.service';


// Si tu utilises des Use Cases séparés pour ces actions (Très recommandé en Clean Archi)
import { IChatRepository } from '../../domain/repositories/chat.repository.interface';
import { AskDto } from '../../dto/ask.dto';
import { IAiGateway } from '../../domain/gateways/ai.gateway.interface';
import { GenerateTitleUseCase } from './generate-title.use-case';
import { UpdateSummaryUseCase } from './update-summary.use-case';

// Interface locale pour le formatage des messages
interface AiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

@Injectable()
export class GetAiStreamUseCase {
  constructor(
    @Inject('IChatRepository') private readonly repository: IChatRepository,
    @Inject('IAiGateway') private readonly aiGateway: IAiGateway,
    private readonly encryptionService: EncryptionService,
    private readonly updateSummaryUseCase: UpdateSummaryUseCase,
    private readonly generateTitleUseCase: GenerateTitleUseCase,
  ) {}

  /**
   * Point d'entrée principal du cas d'utilisation
   */
  async execute(userId: string, dto: AskDto): Promise<Response> {
    // 1. Validation et récupération des credentials métier
    const { model, apiKey } = await this.validateAccess(userId, dto.modelId);

    // 2. Préparation du contexte métier
    let history: AiMessage[] = [];
    let systemPrompt = '';
    let currentConvId = dto.conversationId;
    let isNewConversation = false;
    let annotationIdToSave = dto.annotationId;

    if (dto.isFork && dto.blockId) {
      // --- MODE FORK ---
      const forkContext = await this.prepareForkContext(userId, dto, annotationIdToSave);
      history = forkContext.history;
      systemPrompt = forkContext.systemPrompt;
      currentConvId = forkContext.conversationId;
      annotationIdToSave = forkContext.annotationId;
    } else {
      // --- MODE NORMAL ---
      const normalContext = await this.prepareNormalContext(userId, dto, currentConvId);
      history = normalContext.history;
      systemPrompt = normalContext.systemPrompt;
      currentConvId = normalContext.conversationId;
      isNewConversation = normalContext.isNewConversation;
    }

    // "Clôture" des variables pour le callback de fin de stream
    const finalConvId = currentConvId!;
    const finalAnnotationId = annotationIdToSave;

    // 3. Appel de l'IA via la passerelle (Agnostique du fournisseur !)
    const streamResponse = await this.aiGateway.streamChat({
      modelId: dto.modelId,
      provider: model.provider, // 'GEMINI', 'OPENAI', etc.
      apiKey: apiKey,
      systemPrompt: systemPrompt,
      messages: history,
      onFinish: async (aiResponseText: string) => {
        await this.handleStreamFinish({
          userId,
          finalConvId,
          finalAnnotationId,
          text: aiResponseText,
          dto,
          isNewConversation,
          modelId: dto.modelId,
          apiKey,
        });
      },
    });

    // 4. Si on a créé/utilisé une annotation, on l'ajoute aux headers HTTP de la réponse
    if (finalAnnotationId) {
      streamResponse.headers.set('Access-Control-Expose-Headers', 'x-annotation-id');
      streamResponse.headers.set('x-annotation-id', finalAnnotationId);
    }

    return streamResponse;
  }

  // ====================================================================
  // MÉTHODES PRIVÉES (Logique métier détaillée)
  // ====================================================================

  private async validateAccess(userId: string, modelId: string) {
    const model = await this.repository.findModelById(modelId);
    if (!model) throw new BadRequestException('Modèle introuvable');

    const keyData = await this.repository.getUserApiKey(userId, model.provider);
    if (!keyData) throw new BadRequestException(`Clé manquante pour ${model.provider}`);

    const apiKey = this.encryptionService.decrypt(keyData.encryptedKey);
    return { model, apiKey };
  }

  private async prepareForkContext(userId: string, dto: AskDto, existingAnnotationId?: string) {
    const block = await this.repository.getBlockWithConversation(dto.blockId!);
    if (!block) throw new BadRequestException('Bloc introuvable');

    const conversationId = block.message.conversationId;
    const systemPrompt = `Précision sur le passage suivant : "${block.content}"`;
    let annotationId = existingAnnotationId;

    if (!annotationId) {
      const ann = await this.repository.createAnnotation({
        userId,
        blockId: dto.blockId!,
        selectedText: dto.selectedText!,
        startIndex: dto.startIndex || 0,
        endIndex: dto.endIndex || 0,
      });
      annotationId = ann.id;
    }

    let history: AiMessage[] = [];
    const forkMsgs = await this.repository.getForkMessages(userId, annotationId);
    
    if (forkMsgs.length > 0) {
      history = forkMsgs.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.blocks.map((b: any) => b.content).join('\n'),
      }));
    } else {
      history = [{
        role: 'user',
        content: `[PASSAGE]\n${dto.selectedText}\n\n[QUESTION]\n${dto.content}`,
      }];
    }

    return { history, systemPrompt, conversationId, annotationId };
  }

  private async prepareNormalContext(userId: string, dto: AskDto, existingConvId?: string) {
    let conversationId = existingConvId;
    let isNewConversation = false;

    if (!conversationId) {
      const newConv = await this.repository.createConversation(userId, 'Nouvelle discussion');
      conversationId = newConv.id;
      isNewConversation = true;
    }

    const conv = await this.repository.getConversationSummary(conversationId);
    const systemPrompt = `Résumé de la conversation : ${conv?.summary || 'Aucun résumé disponible.'}`;

    const lastMessages = await this.repository.getLastMainThreadMessages(conversationId, 10);
    
    const history: AiMessage[] = lastMessages.reverse().map((m) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.blocks.map((b: any) => b.content).join('\n'),
    }));
    
    history.push({ role: 'user', content: dto.content });

    return { history, systemPrompt, conversationId, isNewConversation };
  }

  private async handleStreamFinish(params: {
    userId: string;
    finalConvId: string;
    finalAnnotationId?: string;
    text: string;
    dto: AskDto;
    isNewConversation: boolean;
    modelId: string;
    apiKey: string;
  }) {
    try {
      let parentMessageId: string | undefined = undefined;
      
      if (params.dto.isFork && params.dto.blockId) {
        const block = await this.repository.getBlockWithConversation(params.dto.blockId);
        parentMessageId = block?.message.conversationId;
      }

      // 1. Le Repository fait UNIQUEMENT la sauvegarde en base
      await this.repository.saveMessageTransaction({
        userId: params.userId,
        conversationId: params.finalConvId,
        userContent: params.dto.content,
        aiContent: params.text,
        modelId: params.modelId,
        parentMessageId,
        annotationId: params.finalAnnotationId,
        forkData: params.dto.isFork ? {
          blockId: params.dto.blockId!,
          selectedText: params.dto.selectedText!,
          startIndex: params.dto.startIndex || 0,
          endIndex: params.dto.endIndex || 0,
        } : undefined
      });

      // 2. Orchestration des effets de bord via d'autres Use Cases dédiés (Fire and Forget)
      if (!params.dto.isFork) {
        this.updateSummaryUseCase.execute(params.finalConvId, params.apiKey, params.modelId).catch(console.error);

        if (params.isNewConversation) {
          this.generateTitleUseCase.execute(
            params.finalConvId, 
            params.dto.content, 
            params.modelId, 
            params.apiKey
          ).catch(console.error);
        }
      }
    } catch (saveError) {
      console.error('CRITICAL: Erreur lors de la finalisation du stream:', saveError);
    }
  }
}