// apps/backend/src/app/modules/chat/chat.controller.ts

import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { AskDto } from './dto/ask.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('ask')
  async ask(@Req() req: any, @Body() dto: AskDto) {
    // 1. On extrait l'ID de l'utilisateur injecté par Passport dans la requête
    const userId = req.user.id;

    // 2. On transmet les infos au service
    // Note : On utilise dto.modelId (qu'on a ajouté au DTO à l'étape précédente)
    return this.chatService.getAiResponse(userId, dto.modelId, dto.content);
  }
}