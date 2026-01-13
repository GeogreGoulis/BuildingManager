import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { UpdateAnnouncementDto } from './dto/update-announcement.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RoleName } from '@/common/enums/rbac.enum';
import { RequestUser } from '@/auth/interfaces/jwt-payload.interface';

@Controller('buildings/:buildingId/announcements')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  create(
    @Param('buildingId') buildingId: string,
    @Body() createAnnouncementDto: CreateAnnouncementDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.announcementsService.create(buildingId, createAnnouncementDto, user.userId);
  }

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findAll(@Param('buildingId') buildingId: string) {
    return this.announcementsService.findAll(buildingId);
  }

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findOne(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
  ) {
    return this.announcementsService.findOne(buildingId, id);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  update(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() updateAnnouncementDto: UpdateAnnouncementDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.announcementsService.update(buildingId, id, updateAnnouncementDto, user.userId);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  remove(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.announcementsService.remove(buildingId, id, user.userId);
  }
}
