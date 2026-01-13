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
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RoleName } from '@/common/enums/rbac.enum';
import { RequestUser } from '@/auth/interfaces/jwt-payload.interface';

@Controller('buildings/:buildingId/expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  create(
    @Param('buildingId') buildingId: string,
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.expensesService.create(
      { ...createExpenseDto, buildingId },
      user.userId,
    );
  }

  @Get()
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findAll(
    @Param('buildingId') buildingId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.expensesService.findAll(
      buildingId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('categories')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  getCategories() {
    return this.expensesService.getCategories();
  }

  @Get(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  findOne(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
  ) {
    return this.expensesService.findOne(buildingId, id);
  }

  @Patch(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  update(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @Body() updateExpenseDto: UpdateExpenseDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.expensesService.update(buildingId, id, updateExpenseDto, user.userId);
  }

  @Delete(':id')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  remove(
    @Param('buildingId') buildingId: string,
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.expensesService.remove(buildingId, id, user.userId);
  }
}
