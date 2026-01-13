import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { CreateApartmentDto } from './create-apartment.dto';

export class UpdateApartmentDto extends PartialType(CreateApartmentDto) {
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  sharePercentage?: number;
}
