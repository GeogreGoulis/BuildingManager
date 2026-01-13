import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RoleName } from '@/common/enums/rbac.enum';
import { RequestUser } from '@/auth/interfaces/jwt-payload.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(RoleName.SUPER_ADMIN)
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.create(createUserDto, user.userId);
  }

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  @Get('building/:buildingId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  getUsersByBuilding(@Param('buildingId') buildingId: string) {
    return this.usersService.getUsersByBuilding(buildingId);
  }

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.update(id, updateUserDto, user.userId);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.remove(id, user.userId);
  }

  @Post(':id/roles')
  @Roles(RoleName.SUPER_ADMIN)
  assignRole(
    @Param('id') id: string,
    @Body() assignRoleDto: AssignRoleDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.assignRole(id, assignRoleDto, user.userId);
  }

  @Delete(':userId/roles/:roleId')
  @Roles(RoleName.SUPER_ADMIN)
  removeRole(
    @Param('userId') userId: string,
    @Param('roleId') roleId: string,
    @Query('buildingId') buildingId: string | undefined,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.removeRole(userId, roleId, buildingId || null, user.userId);
  }
}
