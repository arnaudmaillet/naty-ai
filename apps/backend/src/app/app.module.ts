import { Module } from '@nestjs/common';
import { PrismaModule } from './modules/prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module';
import { ChatModule } from './modules/chat/chat.module';
import { EncryptionModule } from './modules/encryption/encryption.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    AuthModule,
    ChatModule,
    EncryptionModule,
    PrismaModule,
    UserModule
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}