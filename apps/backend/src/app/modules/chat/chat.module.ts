import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { GeminiStrategy } from './strategies/gemini.strategy';
import { ProviderFactory } from './providers/provider.factory';

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    GeminiStrategy,
    ProviderFactory
],
exports: [ProviderFactory]
})
export class ChatModule {}