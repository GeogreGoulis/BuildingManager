import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;

  @IsString()
  @IsOptional()
  buildingId?: string;
}
