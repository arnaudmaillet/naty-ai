import { IsString, IsNumber, IsNotEmpty, IsOptional } from 'class-validator';

export class HandleForkDto {
  @IsString()
  @IsNotEmpty()
  blockId!: string;

  @IsString()
  @IsNotEmpty()
  content!: string;

  @IsString()
  @IsNotEmpty()
  modelId!: string;

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
