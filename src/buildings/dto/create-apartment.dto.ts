import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsNumber,
  IsOptional,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateApartmentDto {
  @IsString()
  @IsNotEmpty()
  buildingId: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsInt()
  @IsNotEmpty()
  floor: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  squareMeters: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  sharePercentage: number;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsBoolean()
  @IsOptional()
  isOccupied?: boolean;

  @IsBoolean()
  @IsOptional()
  hasHeating?: boolean;
}
