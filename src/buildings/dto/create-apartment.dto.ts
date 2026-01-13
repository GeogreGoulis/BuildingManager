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

  // Χιλιοστά συμμετοχής ανά κατηγορία (0-100%)
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  shareCommon?: number; // Κοινόχρηστα

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  shareElevator?: number; // Ανελκυστήρας

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  shareHeating?: number; // Θέρμανση

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  shareSpecial?: number; // Ειδικά έξοδα

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  shareOwner?: number; // Έξοδα ιδιοκτητών

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  shareOther?: number; // Λοιπά έξοδα

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
