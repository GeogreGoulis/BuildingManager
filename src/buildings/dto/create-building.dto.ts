import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsBoolean,
  Min,
} from 'class-validator';

export class CreateBuildingDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @IsString()
  @IsOptional()
  taxId?: string;

  @IsInt()
  @IsOptional()
  @Min(1900)
  constructionYear?: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  floors?: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1)
  apartmentCount: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
