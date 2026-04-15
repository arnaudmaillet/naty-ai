// apps/backend/src/app/modules/chat/chat.controller.ts

import { Controller, Post, Get, Body, UseGuards, Req, Param } from '@nestjs/common';
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
      dto.conversationId,
    );
  }

  @Get('conversations')
  async getConversations(@Req() req: any) {
    return this.chatService.getUserConversations(req.user.id);
  }

  @Get('conversations/:id')
  async getConversationMessages(@Req() req: any, @Param('id') id: string) {
    return this.chatService.getConversationWithMessages(req.user.id, id);
  }
}
