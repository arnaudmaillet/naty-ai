// apps/backend/src/app/modules/chat/presentation/chat.controller.ts

import {
  Controller,
  Post,
  Get,
  Res,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { Readable } from 'node:stream';

import { AskDto } from './dto/ask.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetAiStreamUseCase } from './application/usecases/ask-ai.use-case';
import { IChatRepository } from './domain/repositories/chat.repository.interface';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    // Injection du cas d'utilisation complexe (Écriture / Action)
    private readonly getAiStreamUseCase: GetAiStreamUseCase,

    // Injection de l'interface de lecture (Queries)
    @Inject('IChatRepository') private readonly chatRepository: IChatRepository,
  ) {}

  @Post('ask')
  async ask(@Req() req: any, @Body() dto: AskDto, @Res() res: Response) {
    try {
      // 1. On délègue au Use Case
      const streamResponse = await this.getAiStreamUseCase.execute(
        req.user.id,
        dto,
      );

      if (!streamResponse.body) {
        throw new Error('Le flux de réponse est vide');
      }

      // 2. Configuration des headers Express
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // (Optionnel) Transfert des headers custom générés par le Use Case (ex: x-annotation-id)
      streamResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      // 3. Conversion et pipe
      const nodeStream = Readable.fromWeb(streamResponse.body as any);
      nodeStream.pipe(res);
    } catch (error: unknown) {
      console.error('Streaming error:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      if (!res.headersSent) {
        res
          .status(500)
          .json({
            message: errorMessage || 'Erreur lors de la génération du stream',
          });
      } else {
        res.end();
      }
    }
  }

  @Get('fork/:annotationId')
  async getForkMessages(
    @Req() req: any,
    @Param('annotationId') annotationId: string,
  ) {
    // Lecture directe via l'interface du Repository
    return this.chatRepository.getForkMessages(req.user.id, annotationId);
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    return this.chatRepository.getUserConversations(req.user.id);
  }

  @Get('conversations/:id')
  async getConversationMessages(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 20;
    return this.chatRepository.getConversationMessagesPaginated(
      req.user.id,
      id,
      cursor,
      take,
    );
  }

  @Get('models')
  async listAvailableModels() {
    // Note: Assure-toi d'ajouter getModels() dans IChatRepository
    // et dans PrismaChatRepository !
    return this.chatRepository.getAvailableModels();
  }
}
