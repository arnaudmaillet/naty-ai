// apps/backend/src/app/modules/chat/chat.module.ts

import { Module } from '@nestjs/common';

// Présentation
import { GetAiStreamUseCase } from './application/usecases/ask-ai.use-case';
import { UpdateSummaryUseCase } from './application/usecases/update-summary.use-case';
import { GenerateTitleUseCase } from './application/usecases/generate-title.use-case';

// Infrastructure (Implémentations concrètes)
import { PrismaChatRepository } from './infrastructure/repositories/prisma-chat.repository';

// Modules partagés (ajuste les chemins selon ton projet)
import { PrismaModule } from '../prisma/prisma.module';
import { EncryptionModule } from '../encryption/encryption.module';
import { ChatController } from './chat.controller';

import { VercelAiGateway } from './domain/gateways/vercel-ai.gateway';

@Module({
  imports: [
    PrismaModule, 
    EncryptionModule
  ],
  controllers: [ChatController],
  providers: [
    // 1. Enregistrement des Use Cases métier
    GetAiStreamUseCase,
    UpdateSummaryUseCase,
    GenerateTitleUseCase,

    // 2. INVERSION DE DÉPENDANCE (Le point clé de l'architecture)
    {
      provide: 'IChatRepository',
      useClass: PrismaChatRepository,
    },
    {
      provide: 'IAiGateway',
      useClass: VercelAiGateway,
    },
  ],
})
export class ChatModule {}