import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CalculationOutputDto } from './dto/calculation-output.dto';

/**
 * Common Charges Persistence Service
 * 
 * Responsible for:
 * - Storing calculation results to database
 * - Creating audit logs for all operations
 * - Managing period locking/unlocking
 * - Retrieving historical calculations
 * 
 * Separation from calculation service ensures:
 * - Pure calculation logic (testable, reproducible)
 * - Separate DB transaction management
 * - Clear audit trail
 */
@Injectable()
export class CommonChargesPersistenceService {
  private readonly logger = new Logger(CommonChargesPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Store calculation results to database
   * 
   * Creates:
   * - CommonChargePeriod (if not exists)
   * - CommonChargeLine per apartment
   * - AuditLog with full calculation breakdown
   * 
   * Transaction ensures atomicity: all or nothing
   */
  async storeCalculation(
    calculation: CalculationOutputDto,
    userId: string,
  ): Promise<{ periodId: string; linesCreated: number }> {
    const { metadata, apartmentCharges } = calculation;

    this.logger.log(
      `Storing calculation for period ${metadata.periodId} by user ${userId}`,
    );

    // Validate period is not locked
    const existingPeriod = await this.prisma.commonChargePeriod.findUnique({
      where: { id: metadata.periodId },
    });

    if (existingPeriod?.isLocked) {
      throw new BadRequestException(
        `Period ${metadata.periodId} is locked and cannot be modified`,
      );
    }

    // Start transaction
    return this.prisma.$transaction(async (tx) => {
      // Upsert period
      const period = await tx.commonChargePeriod.upsert({
        where: { id: metadata.periodId },
        update: {
          version: { increment: 1 },
          updatedAt: new Date(),
        },
        create: {
          id: metadata.periodId,
          buildingId: metadata.buildingId,
          name: `${metadata.period.month}/${metadata.period.year}`,
          startDate: new Date(metadata.period.year, metadata.period.month - 1, 1),
          endDate: new Date(metadata.period.year, metadata.period.month, 0),
          dueDate: new Date(metadata.period.year, metadata.period.month, 15),
          isLocked: false,
          version: 1,
        },
      });

      // Delete existing lines (if recalculation)
      await tx.commonChargeLine.deleteMany({
        where: { periodId: period.id },
      });

      // Create new lines
      const lines = await Promise.all(
        apartmentCharges.map((charge) =>
          tx.commonChargeLine.create({
            data: {
              periodId: period.id,
              apartmentId: charge.apartmentId,
              baseCharge: charge.subtotal,
              totalCharge: charge.total,
            },
          }),
        ),
      );

      // Create audit log with full breakdown
      await tx.auditLog.create({
        data: {
          userId,
          action: 'CREATE',
          entity: 'CommonChargePeriod',
          entityId: period.id,
          oldValue: {},
          newValue: JSON.stringify({
            totalExpenses: calculation.totalExpenses,
            totalDistributed: calculation.totalDistributed,
            apartmentCount: apartmentCharges.length,
          }),
          metadata: {
            calculationVersion: metadata.calculationVersion,
            inputHash: metadata.inputHash,
            settings: metadata.settings,
            categorySummaries: calculation.categorySummaries,
            apartmentBreakdowns: apartmentCharges.map((charge) => ({
              apartmentId: charge.apartmentId,
              apartmentNumber: charge.apartmentNumber,
              subtotal: charge.subtotal,
              previousBalance: charge.previousBalance,
              total: charge.total,
              expenses: charge.expenses.map((exp) => ({
                categoryName: exp.categoryName,
                description: exp.description,
                amount: exp.finalAmount,
              })),
            })),
            distributionVariance: calculation.distributionVariance,
            totalRoundingAdjustments: calculation.totalRoundingAdjustments,
          } as any,
        },
      });

      this.logger.log(
        `Stored calculation: period=${period.id}, lines=${lines.length}, version=${period.version}`,
      );

      return {
        periodId: period.id,
        linesCreated: lines.length,
      };
    });
  }

  /**
   * Lock a common charge period
   * 
   * Once locked:
   * - Cannot modify expenses
   * - Cannot recalculate
   * - Can only regenerate PDF with same data
   */
  async lockPeriod(
    periodId: string,
    userId: string,
  ): Promise<{ success: boolean; lockedAt: Date }> {
    const period = await this.prisma.commonChargePeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new BadRequestException(`Period ${periodId} not found`);
    }

    if (period.isLocked) {
      throw new BadRequestException(`Period ${periodId} is already locked`);
    }

    const lockedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Lock period
      await tx.commonChargePeriod.update({
        where: { id: periodId },
        data: {
          isLocked: true,
          lockedAt,
          lockedBy: userId,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'LOCK',
          entity: 'CommonChargePeriod',
          entityId: periodId,
          oldValue: JSON.stringify({ isLocked: false }),
          newValue: JSON.stringify({ isLocked: true, lockedAt }),
          metadata: {
            reason: 'Period locked for distribution',
          },
        },
      });
    });

    this.logger.log(`Period ${periodId} locked by user ${userId} at ${lockedAt}`);

    return { success: true, lockedAt };
  }

  /**
   * Unlock a common charge period
   * 
   * Allows modifications again (e.g., corrections before distribution)
   */
  async unlockPeriod(
    periodId: string,
    userId: string,
    reason: string,
  ): Promise<{ success: boolean }> {
    const period = await this.prisma.commonChargePeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new BadRequestException(`Period ${periodId} not found`);
    }

    if (!period.isLocked) {
      throw new BadRequestException(`Period ${periodId} is not locked`);
    }

    await this.prisma.$transaction(async (tx) => {
      // Unlock period
      await tx.commonChargePeriod.update({
        where: { id: periodId },
        data: {
          isLocked: false,
          lockedAt: null,
          lockedBy: null,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'UNLOCK',
          entity: 'CommonChargePeriod',
          entityId: periodId,
          oldValue: JSON.stringify({
            isLocked: true,
            lockedAt: period.lockedAt,
            lockedBy: period.lockedBy,
          }),
          newValue: JSON.stringify({ isLocked: false }),
          metadata: {
            reason,
            unlockedAt: new Date(),
          },
        },
      });
    });

    this.logger.log(`Period ${periodId} unlocked by user ${userId}: ${reason}`);

    return { success: true };
  }

  /**
   * Get calculation history for a period
   * 
   * Returns all audit logs with calculation metadata
   */
  async getCalculationHistory(periodId: string): Promise<any[]> {
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        entity: 'CommonChargePeriod',
        entityId: periodId,
        action: { in: ['CREATE', 'UPDATE', 'LOCK', 'UNLOCK'] },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      timestamp: log.createdAt,
      user: log.user,
      metadata: log.metadata,
      changes: {
        old: log.oldValue,
        new: log.newValue,
      },
    }));
  }

  /**
   * Get latest calculation for a period
   */
  async getLatestCalculation(periodId: string): Promise<any | null> {
    const latestLog = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'CommonChargePeriod',
        entityId: periodId,
        action: 'CREATE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestLog || !latestLog.metadata) {
      return null;
    }

    return {
      timestamp: latestLog.createdAt,
      metadata: latestLog.metadata,
      breakdown: (latestLog.metadata as any).apartmentBreakdowns || [],
    };
  }

  /**
   * Verify calculation reproducibility
   * 
   * Checks if recalculation with same inputs produces same hash
   */
  async verifyCalculation(
    periodId: string,
    newInputHash: string,
  ): Promise<{ isValid: boolean; message: string }> {
    const latestLog = await this.prisma.auditLog.findFirst({
      where: {
        entity: 'CommonChargePeriod',
        entityId: periodId,
        action: 'CREATE',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestLog || !latestLog.metadata) {
      return {
        isValid: false,
        message: 'No calculation found for this period',
      };
    }

    const storedHash = (latestLog.metadata as any).inputHash;

    if (storedHash === newInputHash) {
      return {
        isValid: true,
        message: 'Calculation is reproducible (hashes match)',
      };
    } else {
      return {
        isValid: false,
        message: `Input data has changed (stored: ${storedHash}, new: ${newInputHash})`,
      };
    }
  }

  /**
   * Get apartment charges for a period
   */
  async getApartmentCharges(periodId: string): Promise<any[]> {
    const lines = await this.prisma.commonChargeLine.findMany({
      where: { periodId },
      include: {
        apartment: {
          select: {
            id: true,
            number: true,
            floor: true,
            sharePercentage: true,
            owner: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        apartment: {
          number: 'asc',
        },
      },
    });

    return lines.map((line) => ({
      apartmentId: line.apartmentId,
      apartmentNumber: line.apartment.number,
      floor: line.apartment.floor,
      sharePercentage: line.apartment.sharePercentage,
      chargeAmount: Number(line.baseCharge),
      owner: line.apartment.owner,
    }));
  }

  /**
   * Delete calculation (soft delete via audit log)
   */
  async deleteCalculation(
    periodId: string,
    userId: string,
    reason: string,
  ): Promise<{ success: boolean }> {
    const period = await this.prisma.commonChargePeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new BadRequestException(`Period ${periodId} not found`);
    }

    if (period.isLocked) {
      throw new BadRequestException(
        `Cannot delete locked period ${periodId}. Unlock first.`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Delete lines
      await tx.commonChargeLine.deleteMany({
        where: { periodId },
      });

      // Soft delete period (if you have deletedAt)
      // For now, just create audit log
      await tx.auditLog.create({
        data: {
          userId,
          action: 'DELETE',
          entity: 'CommonChargePeriod',
          entityId: periodId,
          oldValue: JSON.stringify({
            version: period.version,
            isLocked: period.isLocked,
          }),
          newValue: {},
          metadata: {
            reason,
            deletedAt: new Date(),
          },
        },
      });
    });

    this.logger.log(`Calculation deleted for period ${periodId} by user ${userId}`);

    return { success: true };
  }
}
