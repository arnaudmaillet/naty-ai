// apps/backend/src/app/modules/chat/chat.controller.ts

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
} from '@nestjs/common';
import { Response } from 'express';
import { ChatService } from './chat.service';
import { AskDto } from './dto/ask.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Readable } from 'node:stream';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ask')
  async ask(@Req() req: any, @Body() dto: AskDto, @Res() res: Response) {
    try {
      // MODIFICATION ICI : On passe 'dto' directement au lieu de décomposer les arguments
      // Cela permet au service d'accéder à dto.isFork, dto.blockId, dto.annotationId, etc.
      const streamResponse = await this.chatService.getAiStreamResponse(
        req.user.id,
        dto, // On envoie l'objet DTO complet
      );

      if (!streamResponse.body) {
        throw new Error('Le flux de réponse est vide');
      }

      // Configuration des headers pour le streaming
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Transfer-Encoding', 'chunked');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Conversion du Web Stream en Node.js Readable Stream
      const nodeStream = Readable.fromWeb(streamResponse.body as any);

      // On pipe vers la réponse Express
      nodeStream.pipe(res);
    } catch (error: unknown) {
      // On explicite le type unknown
      console.error('Streaming error:', error);

      // On extrait le message de l'erreur de manière sécurisée
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';

      if (!res.headersSent) {
        res.status(500).json({
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
    return this.chatService.getForkMessages(req.user.id, annotationId);
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    return this.chatService.getUserConversations(req.user.id);
  }

  @Get('conversations/:id')
  async getConversationMessages(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cursor') cursor?: string, // L'ID du message le plus ancien déjà chargé
    @Query('limit') limit?: string, // Nombre de messages à charger
  ) {
    // On convertit la limit en nombre, avec une valeur par défaut de 20
    const take = limit ? parseInt(limit, 10) : 20;

    // On appelle la nouvelle méthode de service paginée
    return this.chatService.getConversationMessagesPaginated(
      req.user.id,
      id,
      cursor,
      take,
    );
  }

  @Get('models')
  async listModels() {
    return this.chatService.getModels();
  }
}
