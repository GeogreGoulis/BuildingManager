import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DocumentCategory } from '@prisma/client';

export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(DocumentCategory)
  category?: DocumentCategory;
}
