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
    return this.chatService.getAiResponse(
      req.user.id, 
      dto.modelId, 
      dto.content, 
      dto.conversationId
    );
  }
}