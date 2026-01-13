import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommonChargesCalculationService } from './common-charges-calculation.service';
import { CommonChargesPersistenceService } from './common-charges-persistence.service';
import {
  CalculationInputDto,
  DistributionMethod,
  ApartmentDto,
  ExpenseItemDto,
  HeatingConsumptionDto,
} from './dto/calculation-input.dto';
import { CalculationOutputDto } from './dto/calculation-output.dto';

/**
 * Common Charges Orchestration Service
 * 
 * High-level service that:
 * 1. Fetches data from database
 * 2. Calls pure calculation service
 * 3. Stores results via persistence service
 * 
 * This is the service used by controllers.
 */
@Injectable()
export class CommonChargesService {
  private readonly logger = new Logger(CommonChargesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly calculationService: CommonChargesCalculationService,
    private readonly persistenceService: CommonChargesPersistenceService,
  ) {}

  /**
   * Calculate common charges for a period
   * 
   * Workflow:
   * 1. Fetch period, building, apartments, expenses
   * 2. Build CalculationInputDto
   * 3. Call calculation service
   * 4. Store results via persistence service
   * 5. Return calculation output
   */
  async calculatePeriod(
    periodId: string,
    userId: string,
    options?: {
      forceRecalculate?: boolean;
      includeHeating?: boolean;
      reserveFundPercentage?: number;
    },
  ): Promise<CalculationOutputDto> {
    this.logger.log(`Calculating period ${periodId} for user ${userId}`);

    // Fetch period data
    const period = await this.prisma.commonChargePeriod.findUnique({
      where: { id: periodId },
      include: {
        building: true,
      },
    });

    if (!period) {
      throw new Error(`Period ${periodId} not found`);
    }

    // Check if locked
    if (period.isLocked && !options?.forceRecalculate) {
      this.logger.warn(`Period ${periodId} is locked, returning cached calculation`);
      const cached = await this.persistenceService.getLatestCalculation(periodId);
      if (cached) {
        // Reconstruct CalculationOutputDto from cached data
        // For now, throw error to force unlock
        throw new Error(`Period is locked. Unlock to recalculate.`);
      }
    }

    // Fetch apartments
    const apartments = await this.prisma.apartment.findMany({
      where: {
        buildingId: period.buildingId,
        deletedAt: null,
      },
    });

    // Fetch expenses for this period
    const expenses = await this.prisma.expense.findMany({
      where: {
        buildingId: period.buildingId,
        expenseDate: {
          gte: period.startDate,
          lte: period.endDate,
        },
        deletedAt: null,
      },
      include: {
        category: true,
      },
    });

    // Fetch heating consumptions (if applicable)
    let heatingConsumptions: HeatingConsumptionDto[] = [];
    if (options?.includeHeating) {
      // TODO: Fetch from OilConsumption table when implemented
      heatingConsumptions = [];
    }

    // Build input DTO
    const input: CalculationInputDto = {
      periodId: period.id,
      buildingId: period.buildingId,
      period: {
        month: period.startDate.getMonth() + 1,
        year: period.startDate.getFullYear(),
      },
      apartments: apartments.map((apt) => ({
        id: apt.id,
        number: apt.number,
        floor: String(apt.floor),
        sharePercentage: Number(apt.shareCommon),
        heatingSharePercentage: Number(apt.shareHeating),
        isOccupied: apt.isOccupied,
        isExcluded: false, // TODO: Track exclusions
      })),
      expenses: expenses.map((exp) => ({
        id: exp.id,
        categoryId: exp.categoryId || 'other',
        categoryName: exp.category?.name || 'Other',
        amount: Number(exp.amount),
        distributionMethod: this.mapCategoryToDistributionMethod(
          exp.category?.name || 'OTHER',
        ),
        description: exp.description,
      })),
      heatingConsumptions,
      settings: {
        decimalPlaces: 2,
        roundingStrategy: 'DISTRIBUTE',
        reserveFundPercentage: options?.reserveFundPercentage || 0,
        reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
        defaultVatPercentage: 24,
      },
      previousBalances: {}, // TODO: Fetch from previous period
    };

    // Calculate
    const output = this.calculationService.calculate(input);

    // Store results
    await this.persistenceService.storeCalculation(output, userId);

    return output;
  }

  /**
   * Get calculation for a period (cached)
   */
  async getCalculation(periodId: string): Promise<any> {
    return this.persistenceService.getLatestCalculation(periodId);
  }

  /**
   * Lock period
   */
  async lockPeriod(periodId: string, userId: string): Promise<any> {
    return this.persistenceService.lockPeriod(periodId, userId);
  }

  /**
   * Unlock period
   */
  async unlockPeriod(periodId: string, userId: string, reason: string): Promise<any> {
    return this.persistenceService.unlockPeriod(periodId, userId, reason);
  }

  /**
   * Get calculation history
   */
  async getHistory(periodId: string): Promise<any[]> {
    return this.persistenceService.getCalculationHistory(periodId);
  }

  /**
   * Get apartment charges
   */
  async getApartmentCharges(periodId: string): Promise<any[]> {
    return this.persistenceService.getApartmentCharges(periodId);
  }

  /**
   * Map expense category to distribution method
   * 
   * This is business logic that determines how each category is distributed.
   */
  private mapCategoryToDistributionMethod(categoryName: string): DistributionMethod {
    const mapping: Record<string, DistributionMethod> = {
      CLEANING: DistributionMethod.GENERAL_SHARE,
      ELECTRICITY: DistributionMethod.GENERAL_SHARE,
      WATER: DistributionMethod.GENERAL_SHARE,
      MAINTENANCE: DistributionMethod.GENERAL_SHARE,
      INSURANCE: DistributionMethod.GENERAL_SHARE,
      SECURITY: DistributionMethod.GENERAL_SHARE,
      GARDENING: DistributionMethod.GENERAL_SHARE,
      OTHER: DistributionMethod.GENERAL_SHARE,
      ELEVATOR: DistributionMethod.GENERAL_SHARE, // Could be special category
      OIL: DistributionMethod.CONSUMPTION_BASED,
    };

    return mapping[categoryName] || DistributionMethod.GENERAL_SHARE;
  }
}
