import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreateExpenseDto {
  @IsUUID()
  @IsOptional()
  buildingId?: string;

  @IsUUID()
  categoryId: string;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsString()
  description: string;

  @IsDateString()
  expenseDate: string;

  @IsString()
  @IsOptional()
  invoiceNumber?: string;

  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;

  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsUUID()
  @IsOptional()
  periodId?: string;
}
