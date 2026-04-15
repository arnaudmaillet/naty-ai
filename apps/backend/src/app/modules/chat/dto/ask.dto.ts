import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AskDto {
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}