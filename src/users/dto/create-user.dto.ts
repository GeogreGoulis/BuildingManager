import { IsEmail, IsString, IsNotEmpty, IsOptional, IsBoolean, MinLength, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  role?: string; // SUPER_ADMIN, BUILDING_ADMIN, READ_ONLY

  @IsString()
  @IsOptional()
  buildingId?: string; // Required for BUILDING_ADMIN and READ_ONLY roles
}
