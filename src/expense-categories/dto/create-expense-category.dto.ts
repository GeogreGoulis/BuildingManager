import { IsString, IsOptional } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
