import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;
}