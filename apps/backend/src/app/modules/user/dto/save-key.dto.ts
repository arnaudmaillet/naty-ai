import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { AiProvider } from '@prisma/client';

export class SaveKeyDto {
  @IsEnum(AiProvider)
  @IsNotEmpty()
  provider!: AiProvider;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  key!: string;
}