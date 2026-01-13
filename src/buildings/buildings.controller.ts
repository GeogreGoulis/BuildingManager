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
import { BuildingsService } from './buildings.service';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { CreateApartmentDto } from './dto/create-apartment.dto';
import { UpdateApartmentDto } from './dto/update-apartment.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RoleName } from '@/common/enums/rbac.enum';
import { RequestUser } from '@/auth/interfaces/jwt-payload.interface';

@Controller('buildings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  // ==================== BUILDINGS ====================

  @Post()
  @Roles(RoleName.SUPER_ADMIN)
  createBuilding(@Body() createBuildingDto: CreateBuildingDto, @CurrentUser() user: RequestUser) {
    return this.buildingsService.createBuilding(createBuildingDto, user.userId);
  }

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findAllBuildings() {
    return this.buildingsService.findAllBuildings();
  }

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findOneBuilding(@Param('id') id: string) {
    return this.buildingsService.findOneBuilding(id);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  updateBuilding(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.buildingsService.updateBuilding(id, updateBuildingDto, user.userId);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN)
  removeBuilding(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.buildingsService.removeBuilding(id, user.userId);
  }

  // ==================== APARTMENTS ====================

  @Post('apartments')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  createApartment(
    @Body() createApartmentDto: CreateApartmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.buildingsService.createApartment(createApartmentDto, user.userId);
  }

  @Get('apartments/all')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findAllApartments(@Query('buildingId') buildingId?: string) {
    return this.buildingsService.findAllApartments(buildingId);
  }

  @Get('apartments/:id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findOneApartment(@Param('id') id: string) {
    return this.buildingsService.findOneApartment(id);
  }

  @Patch('apartments/:id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  updateApartment(
    @Param('id') id: string,
    @Body() updateApartmentDto: UpdateApartmentDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.buildingsService.updateApartment(id, updateApartmentDto, user.userId);
  }

  @Delete('apartments/:id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  removeApartment(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.buildingsService.removeApartment(id, user.userId);
  }
}
