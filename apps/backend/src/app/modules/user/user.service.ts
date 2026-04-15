import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { AiProvider } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {}

  async updateApiKey(userId: string, provider: AiProvider, rawKey: string) {
    const encryptedKey = this.encryptionService.encrypt(rawKey);

    return this.prisma.userApiKey.upsert({
      where: {
        userId_provider: { userId, provider },
      },
      update: {
        encryptedKey,
        isActive: true,
      },
      create: {
        userId,
        provider,
        encryptedKey,
      },
    });
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        createdAt: true,
        apiKeys: {
          select: {
            provider: true,
            isActive: true,
            updatedAt: true,
          },
        },
      },
    });
  }
}