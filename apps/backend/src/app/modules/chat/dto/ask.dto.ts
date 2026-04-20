import { IsNotEmpty, IsString, IsOptional, IsUUID, IsBoolean, IsNumber } from 'class-validator';

export class AskDto {
  // --- Propriétés de base ---
  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;

  @IsOptional()
  @IsUUID()
  conversationId?: string;

  // --- Propriétés héritées du Fork (Optionnelles) ---
  @IsOptional()
  @IsBoolean() // On ajoute ce flag pour savoir si on crée une annotation ou non
  isFork?: boolean;

  @IsOptional()
  @IsString()
  blockId?: string;

  @IsOptional()
  @IsString()
  annotationId?: string;

  @IsOptional()
  @IsString()
  selectedText?: string;

  @IsOptional()
  @IsNumber()
  startIndex?: number;

  @IsOptional()
  @IsNumber()
  endIndex?: number;
}