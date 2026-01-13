import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  Query,
  Body,
} from '@nestjs/common';
import { CommonChargesService } from './common-charges.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RoleName } from '@/common/enums/rbac.enum';
import { RequestUser } from '@/auth/interfaces/jwt-payload.interface';
import { PrismaService } from '@/prisma/prisma.service';

@Controller('buildings/:buildingId/common-charges')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CommonChargesController {
  constructor(
    private readonly commonChargesService: CommonChargesService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get all periods for a building
   */
  @Get('periods')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  async getPeriods(@Param('buildingId') buildingId: string) {
    const periods = await this.prisma.commonChargePeriod.findMany({
      where: { buildingId },
      orderBy: [{ startDate: 'desc' }],
      include: {
        lines: {
          select: {
            totalCharge: true,
          },
        },
        expenses: {
          where: { deletedAt: null },
          select: {
            amount: true,
          },
        },
      },
    });

    return periods.map((period) => ({
      id: period.id,
      buildingId: period.buildingId,
      name: period.name,
      year: period.startDate.getFullYear(),
      month: period.startDate.getMonth() + 1,
      startDate: period.startDate,
      endDate: period.endDate,
      dueDate: period.dueDate,
      status: period.isLocked ? 'LOCKED' : period.lines.length > 0 ? 'CALCULATED' : 'DRAFT',
      isLocked: period.isLocked,
      lockedAt: period.lockedAt,
      lockedBy: period.lockedBy,
      calculatedAt: period.lines.length > 0 ? period.updatedAt : null,
      totalExpenses: period.expenses.reduce(
        (sum, exp) => sum + Number(exp.amount),
        0,
      ),
      totalCharges: period.lines.reduce(
        (sum, line) => sum + Number(line.totalCharge),
        0,
      ),
      version: period.version,
      createdAt: period.createdAt,
      updatedAt: period.updatedAt,
    }));
  }

  /**
   * Get a specific period
   */
  @Get('periods/:periodId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  async getPeriod(
    @Param('buildingId') buildingId: string,
    @Param('periodId') periodId: string,
  ) {
    const period = await this.prisma.commonChargePeriod.findFirst({
      where: {
        id: periodId,
        buildingId,
      },
      include: {
        lines: {
          include: {
            apartment: {
              select: {
                id: true,
                number: true,
                floor: true,
                owner: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        expenses: {
          where: { deletedAt: null },
          include: {
            category: true,
          },
        },
      },
    });

    if (!period) {
      return null;
    }

    return {
      ...period,
      status: period.isLocked ? 'LOCKED' : period.lines.length > 0 ? 'CALCULATED' : 'DRAFT',
      totalExpenses: period.expenses.reduce(
        (sum, exp) => sum + Number(exp.amount),
        0,
      ),
    };
  }

  /**
   * Create a new period
   */
  @Post('periods')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  async createPeriod(
    @Param('buildingId') buildingId: string,
    @Body()
    data: {
      name: string;
      startDate: string;
      endDate: string;
      dueDate: string;
    },
  ) {
    return this.prisma.commonChargePeriod.create({
      data: {
        buildingId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        dueDate: new Date(data.dueDate),
      },
    });
  }

  /**
   * Update a period
   */
  @Patch('periods/:periodId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  async updatePeriod(
    @Param('buildingId') buildingId: string,
    @Param('periodId') periodId: string,
    @Body()
    data: {
      name?: string;
      startDate?: string;
      endDate?: string;
      dueDate?: string;
    },
  ) {
    const period = await this.prisma.commonChargePeriod.findFirst({
      where: { id: periodId, buildingId },
    });

    if (!period) {
      throw new Error('Period not found');
    }

    if (period.isLocked) {
      throw new Error('Cannot update a locked period');
    }

    return this.prisma.commonChargePeriod.update({
      where: { id: periodId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.startDate && { startDate: new Date(data.startDate) }),
        ...(data.endDate && { endDate: new Date(data.endDate) }),
        ...(data.dueDate && { dueDate: new Date(data.dueDate) }),
      },
    });
  }

  /**
   * Delete a period
   */
  @Delete('periods/:periodId')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  async deletePeriod(
    @Param('buildingId') buildingId: string,
    @Param('periodId') periodId: string,
  ) {
    const period = await this.prisma.commonChargePeriod.findFirst({
      where: { id: periodId, buildingId },
    });

    if (!period) {
      throw new Error('Period not found');
    }

    if (period.isLocked) {
      throw new Error('Cannot delete a locked period');
    }

    // Delete associated lines first
    await this.prisma.commonChargeLine.deleteMany({
      where: { periodId },
    });

    return this.prisma.commonChargePeriod.delete({
      where: { id: periodId },
    });
  }

  /**
   * Preview calculation for a period (draft mode - does not save)
   */
  @Get('periods/:periodId/preview')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  async previewCalculation(
    @Param('buildingId') buildingId: string,
    @Param('periodId') periodId: string,
  ) {
    const period = await this.prisma.commonChargePeriod.findFirst({
      where: { id: periodId, buildingId },
      include: { building: true },
    });

    if (!period) {
      throw new Error('Period not found');
    }

    // Fetch apartments
    const apartments = await this.prisma.apartment.findMany({
      where: { buildingId, deletedAt: null },
      include: { owner: { select: { firstName: true, lastName: true } } },
    });

    // Fetch expenses for this period
    const expenses = await this.prisma.expense.findMany({
      where: {
        buildingId,
        expenseDate: { gte: period.startDate, lte: period.endDate },
        deletedAt: null,
      },
      include: { category: true },
    });

    // Calculate totals by category
    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const expensesByCategory = expenses.reduce((acc: Record<string, number>, exp) => {
      const catName = exp.category?.name || 'Χωρίς κατηγορία';
      acc[catName] = (acc[catName] || 0) + Number(exp.amount);
      return acc;
    }, {});

    // Calculate charges per apartment based on shares
    const apartmentCharges = apartments.map((apt) => {
      const shareCommon = Number(apt.shareCommon) / 100;
      const shareElevator = Number(apt.shareElevator) / 100;
      const shareHeating = Number(apt.shareHeating) / 100;
      const shareOther = Number(apt.shareOther) / 100;

      // Simple proportional distribution based on shares
      const avgShare = (shareCommon + shareElevator + shareOther) / 3 || 0;
      const estimatedCharge = totalExpenses * avgShare;

      return {
        apartmentId: apt.id,
        apartmentNumber: apt.number,
        floor: apt.floor,
        ownerName: apt.owner ? `${apt.owner.firstName} ${apt.owner.lastName}` : 'Χωρίς ιδιοκτήτη',
        squareMeters: Number(apt.squareMeters),
        shares: {
          common: Number(apt.shareCommon),
          elevator: Number(apt.shareElevator),
          heating: Number(apt.shareHeating),
          other: Number(apt.shareOther),
        },
        estimatedCharge,
      };
    });

    return {
      period: {
        id: period.id,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        dueDate: period.dueDate,
      },
      summary: {
        totalExpenses,
        expenseCount: expenses.length,
        apartmentCount: apartments.length,
        expensesByCategory,
      },
      apartmentCharges,
      expenses: expenses.map((exp) => ({
        id: exp.id,
        description: exp.description,
        amount: Number(exp.amount),
        category: exp.category?.name || 'Χωρίς κατηγορία',
        date: exp.expenseDate,
      })),
    };
  }

  /**
   * Calculate common charges for a period
   */
  @Post('periods/:periodId/calculate')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  async calculatePeriod(
    @Param('buildingId') buildingId: string,
    @Param('periodId') periodId: string,
    @CurrentUser() user: RequestUser,
    @Body() options?: { forceRecalculate?: boolean },
  ) {
    return this.commonChargesService.calculatePeriod(periodId, user.userId, {
      forceRecalculate: options?.forceRecalculate,
    });
  }

  /**
   * Lock a period
   */
  @Post('periods/:periodId/lock')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  async lockPeriod(
    @Param('buildingId') buildingId: string,
    @Param('periodId') periodId: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.commonChargesService.lockPeriod(periodId, user.userId);
  }

  /**
   * Unlock a period
   */
  @Post('periods/:periodId/unlock')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN)
  async unlockPeriod(
    @Param('buildingId') buildingId: string,
    @Param('periodId') periodId: string,
    @CurrentUser() user: RequestUser,
    @Body() data: { reason: string },
  ) {
    return this.commonChargesService.unlockPeriod(
      periodId,
      user.userId,
      data.reason,
    );
  }

  /**
   * Get calculation history for a period
   */
  @Get('periods/:periodId/history')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  async getHistory(
    @Param('buildingId') buildingId: string,
    @Param('periodId') periodId: string,
  ) {
    return this.commonChargesService.getHistory(periodId);
  }

  /**
   * Get apartment charges for a period
   */
  @Get('periods/:periodId/apartments')
  @Roles(RoleName.SUPER_ADMIN, RoleName.BUILDING_ADMIN, RoleName.READ_ONLY)
  async getApartmentCharges(
    @Param('buildingId') buildingId: string,
    @Param('periodId') periodId: string,
  ) {
    return this.commonChargesService.getApartmentCharges(periodId);
  }
}
