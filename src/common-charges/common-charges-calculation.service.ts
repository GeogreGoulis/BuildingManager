import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import {
  CalculationInputDto,
  DistributionMethod,
  ExpenseItemDto,
  ApartmentDto,
  HeatingConsumptionDto,
  ReserveFundOperationDto,
} from './dto/calculation-input.dto';
import {
  CalculationOutputDto,
  ApartmentChargeBreakdownDto,
  ExpenseBreakdownItemDto,
  HeatingBreakdownDto,
  CategorySummaryDto,
  ReserveFundBreakdownDto,
  ReserveFundSummaryDto,
  CalculationMetadataDto,
} from './dto/calculation-output.dto';

/**
 * Common Charges Calculation Service
 * 
 * PURE CALCULATION SERVICE - No database operations.
 * 
 * Principles:
 * 1. Deterministic: Same inputs → Same outputs
 * 2. Transparent: Full breakdown of every calculation
 * 3. Auditable: Every step is traceable
 * 4. Extensible: Easy to add new distribution methods
 * 
 * Business Rules:
 * - General expenses: Distributed by general share percentage
 * - Heating: Distributed by heating share percentage or consumption
 * - Special categories: Can target specific apartments
 * - Rounding: Ensures total distributed = total expenses (no money lost/created)
 * - Reserve fund: Can be contributed or withdrawn
 */
@Injectable()
export class CommonChargesCalculationService {
  private readonly logger = new Logger(CommonChargesCalculationService.name);
  
  // Algorithm version - increment when calculation logic changes
  private readonly CALCULATION_VERSION = '1.0.0';

  /**
   * Main calculation entry point
   * 
   * @param input Complete calculation inputs
   * @returns Complete calculation outputs with full breakdown
   */
  calculate(input: CalculationInputDto): CalculationOutputDto {
    this.logger.log(`Starting calculation for period ${input.periodId}`);
    
    // Validate inputs
    const validationErrors = this.validateInput(input);
    if (validationErrors.length > 0) {
      throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
    }

    // Filter out excluded apartments
    const activeApartments = input.apartments.filter(apt => !apt.isExcluded);
    
    // Initialize apartment charges
    const apartmentCharges: Map<string, ApartmentChargeBreakdownDto> = new Map();
    activeApartments.forEach(apartment => {
      apartmentCharges.set(apartment.id, {
        apartmentId: apartment.id,
        apartmentNumber: apartment.number,
        floor: apartment.floor,
        sharePercentage: apartment.sharePercentage,
        heatingSharePercentage: apartment.heatingSharePercentage,
        wasExcluded: false,
        expenses: [],
        previousBalance: input.previousBalances?.[apartment.id] || 0,
        subtotal: 0,
        totalRoundingAdjustments: 0,
        total: 0,
      });
    });

    // Distribute each expense
    for (const expense of input.expenses) {
      this.distributeExpense(expense, activeApartments, apartmentCharges, input);
    }

    // Calculate heating charges (if applicable)
    if (input.heatingConsumptions && input.heatingConsumptions.length > 0) {
      this.calculateHeatingCharges(
        input.heatingConsumptions,
        activeApartments,
        apartmentCharges,
        input,
      );
    }

    // Calculate reserve fund (if applicable)
    let reserveFundSummary: ReserveFundSummaryDto | undefined;
    if (input.reserveFundOperations && input.reserveFundOperations.length > 0) {
      reserveFundSummary = this.calculateReserveFund(
        input.reserveFundOperations,
        activeApartments,
        apartmentCharges,
        input,
      );
    }

    // Calculate totals per apartment
    apartmentCharges.forEach((charge, apartmentId) => {
      charge.subtotal = charge.expenses.reduce((sum, exp) => sum + exp.finalAmount, 0);
      
      if (charge.heating) {
        charge.subtotal += charge.heating.finalAmount;
      }
      
      if (charge.reserveFund) {
        charge.subtotal += charge.reserveFund.finalAmount;
      }
      
      charge.totalRoundingAdjustments = charge.expenses.reduce(
        (sum, exp) => sum + exp.roundingAdjustment,
        0,
      );
      
      if (charge.heating) {
        charge.totalRoundingAdjustments += charge.heating.roundingAdjustment;
      }
      
      if (charge.reserveFund) {
        charge.totalRoundingAdjustments += charge.reserveFund.roundingAdjustment;
      }
      
      charge.total = charge.subtotal + charge.previousBalance;
    });

    // Calculate category summaries
    const categorySummaries = this.calculateCategorySummaries(
      input.expenses,
      Array.from(apartmentCharges.values()),
    );

    // Calculate totals and variances
    const totalExpenses = input.expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalDistributed = Array.from(apartmentCharges.values()).reduce(
      (sum, charge) => sum + charge.subtotal - (charge.reserveFund?.finalAmount || 0),
      0,
    );
    const distributionVariance = Math.abs(totalExpenses - totalDistributed);
    const totalRoundingAdjustments = Array.from(apartmentCharges.values()).reduce(
      (sum, charge) => sum + charge.totalRoundingAdjustments,
      0,
    );

    // Generate warnings
    const warnings: string[] = [];
    if (distributionVariance > 0.01) {
      warnings.push(
        `Distribution variance detected: €${distributionVariance.toFixed(2)}`,
      );
    }

    // Create metadata
    const metadata: CalculationMetadataDto = {
      calculatedAt: new Date(),
      periodId: input.periodId,
      buildingId: input.buildingId,
      period: input.period,
      settings: {
        decimalPlaces: input.settings.decimalPlaces,
        roundingStrategy: input.settings.roundingStrategy,
        reserveFundPercentage: input.settings.reserveFundPercentage,
      },
      inputHash: this.generateInputHash(input),
      calculationVersion: this.CALCULATION_VERSION,
    };

    return {
      metadata,
      apartmentCharges: Array.from(apartmentCharges.values()),
      categorySummaries,
      reserveFundSummary,
      totalExpenses,
      totalDistributed,
      distributionVariance,
      totalRoundingAdjustments,
      validationErrors: [],
      warnings,
    };
  }

  /**
   * Distribute a single expense across apartments
   */
  private distributeExpense(
    expense: ExpenseItemDto,
    apartments: ApartmentDto[],
    apartmentCharges: Map<string, ApartmentChargeBreakdownDto>,
    input: CalculationInputDto,
  ): void {
    // Determine which apartments to charge
    let targetApartments = apartments;
    if (expense.includedApartmentIds && expense.includedApartmentIds.length > 0) {
      targetApartments = apartments.filter(apt =>
        expense.includedApartmentIds!.includes(apt.id),
      );
    }

    if (targetApartments.length === 0) {
      this.logger.warn(`No apartments to charge for expense ${expense.id}`);
      return;
    }

    // Calculate distribution based on method
    const distribution = this.calculateDistribution(
      expense,
      targetApartments,
      input.settings.decimalPlaces,
    );

    // Apply rounding adjustments to ensure total = expense amount
    const roundedDistribution = this.applyRoundingAdjustments(
      distribution,
      expense.amount,
      input.settings.roundingStrategy,
      input.settings.decimalPlaces,
    );

    // Add to apartment charges
    roundedDistribution.forEach((item, apartmentId) => {
      const charge = apartmentCharges.get(apartmentId);
      if (!charge) {
        return;
      }

      const breakdownItem: ExpenseBreakdownItemDto = {
        expenseId: expense.id,
        categoryName: expense.categoryName,
        description: expense.description,
        totalAmount: expense.amount,
        distributionMethod: expense.distributionMethod,
        sharePercentage: item.sharePercentage,
        calculatedAmount: item.calculatedAmount,
        finalAmount: item.finalAmount,
        roundingAdjustment: item.roundingAdjustment,
        vatAmount: item.vatAmount,
      };

      charge.expenses.push(breakdownItem);
    });
  }

  /**
   * Calculate distribution amounts based on method
   */
  private calculateDistribution(
    expense: ExpenseItemDto,
    apartments: ApartmentDto[],
    decimalPlaces: number,
  ): Map<string, {
    sharePercentage: number;
    calculatedAmount: number;
    finalAmount: number;
    roundingAdjustment: number;
    vatAmount?: number;
  }> {
    const distribution = new Map();

    switch (expense.distributionMethod) {
      case DistributionMethod.GENERAL_SHARE:
        return this.distributeByGeneralShare(expense, apartments, decimalPlaces);

      case DistributionMethod.HEATING_SHARE:
        return this.distributeByHeatingShare(expense, apartments, decimalPlaces);

      case DistributionMethod.EQUAL_SPLIT:
        return this.distributeEqually(expense, apartments, decimalPlaces);

      case DistributionMethod.CUSTOM:
        if (!expense.customDistribution) {
          throw new Error(`Custom distribution required for expense ${expense.id}`);
        }
        return this.distributeByCustom(
          expense,
          apartments,
          expense.customDistribution,
          decimalPlaces,
        );

      default:
        throw new Error(
          `Unsupported distribution method: ${expense.distributionMethod}`,
        );
    }
  }

  /**
   * Distribute by general share percentage
   */
  private distributeByGeneralShare(
    expense: ExpenseItemDto,
    apartments: ApartmentDto[],
    decimalPlaces: number,
  ): Map<string, any> {
    const distribution = new Map();
    const totalShare = apartments.reduce((sum, apt) => sum + apt.sharePercentage, 0);

    apartments.forEach(apartment => {
      const sharePercentage = apartment.sharePercentage;
      const calculatedAmount = (expense.amount * sharePercentage) / totalShare;
      const finalAmount = this.roundToDecimal(calculatedAmount, decimalPlaces);

      distribution.set(apartment.id, {
        sharePercentage,
        calculatedAmount,
        finalAmount,
        roundingAdjustment: 0, // Will be adjusted later
      });
    });

    return distribution;
  }

  /**
   * Distribute by heating share percentage
   */
  private distributeByHeatingShare(
    expense: ExpenseItemDto,
    apartments: ApartmentDto[],
    decimalPlaces: number,
  ): Map<string, any> {
    const distribution = new Map();
    
    // Only apartments with heating share
    const heatingApartments = apartments.filter(apt => apt.heatingSharePercentage > 0);
    const totalShare = heatingApartments.reduce(
      (sum, apt) => sum + apt.heatingSharePercentage,
      0,
    );

    heatingApartments.forEach(apartment => {
      const sharePercentage = apartment.heatingSharePercentage;
      const calculatedAmount = (expense.amount * sharePercentage) / totalShare;
      const finalAmount = this.roundToDecimal(calculatedAmount, decimalPlaces);

      distribution.set(apartment.id, {
        sharePercentage,
        calculatedAmount,
        finalAmount,
        roundingAdjustment: 0,
      });
    });

    return distribution;
  }

  /**
   * Distribute equally
   */
  private distributeEqually(
    expense: ExpenseItemDto,
    apartments: ApartmentDto[],
    decimalPlaces: number,
  ): Map<string, any> {
    const distribution = new Map();
    const count = apartments.length;
    const amountPerApartment = expense.amount / count;

    apartments.forEach(apartment => {
      const calculatedAmount = amountPerApartment;
      const finalAmount = this.roundToDecimal(calculatedAmount, decimalPlaces);

      distribution.set(apartment.id, {
        sharePercentage: 100 / count,
        calculatedAmount,
        finalAmount,
        roundingAdjustment: 0,
      });
    });

    return distribution;
  }

  /**
   * Distribute by custom percentages
   */
  private distributeByCustom(
    expense: ExpenseItemDto,
    apartments: ApartmentDto[],
    customDistribution: Record<string, number>,
    decimalPlaces: number,
  ): Map<string, any> {
    const distribution = new Map();
    
    // Validate custom percentages sum to 100
    const totalPercentage = Object.values(customDistribution).reduce(
      (sum, pct) => sum + pct,
      0,
    );
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      throw new Error(
        `Custom distribution percentages must sum to 100, got ${totalPercentage}`,
      );
    }

    apartments.forEach(apartment => {
      const sharePercentage = customDistribution[apartment.id] || 0;
      if (sharePercentage === 0) {
        return; // Skip apartments not in custom distribution
      }

      const calculatedAmount = (expense.amount * sharePercentage) / 100;
      const finalAmount = this.roundToDecimal(calculatedAmount, decimalPlaces);

      distribution.set(apartment.id, {
        sharePercentage,
        calculatedAmount,
        finalAmount,
        roundingAdjustment: 0,
      });
    });

    return distribution;
  }

  /**
   * Apply rounding adjustments to ensure total = target amount
   * 
   * This is CRITICAL for auditability:
   * Sum of all apartment charges MUST equal total expense amount.
   * No money is lost or created due to rounding.
   */
  private applyRoundingAdjustments(
    distribution: Map<string, any>,
    targetAmount: number,
    strategy: 'DISTRIBUTE' | 'FIRST_APARTMENT' | 'LARGEST_SHARE',
    decimalPlaces: number,
  ): Map<string, any> {
    // Calculate total after rounding
    const totalDistributed = Array.from(distribution.values()).reduce(
      (sum, item) => sum + item.finalAmount,
      0,
    );

    const difference = targetAmount - totalDistributed;

    // If difference is negligible, no adjustment needed
    if (Math.abs(difference) < Math.pow(10, -(decimalPlaces + 2))) {
      return distribution;
    }

    this.logger.debug(
      `Rounding adjustment needed: €${difference.toFixed(decimalPlaces + 2)}`,
    );

    const adjustmentUnit = Math.pow(10, -decimalPlaces);
    let remainingDifference = difference;

    switch (strategy) {
      case 'FIRST_APARTMENT': {
        // Add all difference to first apartment
        const firstApartmentId = Array.from(distribution.keys())[0];
        const firstItem = distribution.get(firstApartmentId);
        firstItem.finalAmount += difference;
        firstItem.roundingAdjustment = difference;
        break;
      }

      case 'LARGEST_SHARE': {
        // Add all difference to apartment with largest share
        let largestApartmentId = '';
        let largestShare = 0;
        
        distribution.forEach((item, apartmentId) => {
          if (item.sharePercentage > largestShare) {
            largestShare = item.sharePercentage;
            largestApartmentId = apartmentId;
          }
        });

        const largestItem = distribution.get(largestApartmentId);
        largestItem.finalAmount += difference;
        largestItem.roundingAdjustment = difference;
        break;
      }

      case 'DISTRIBUTE':
      default: {
        // Distribute difference in small increments
        // Sort by share percentage (largest first)
        const sortedEntries = Array.from(distribution.entries()).sort(
          (a, b) => b[1].sharePercentage - a[1].sharePercentage,
        );

        let index = 0;
        while (Math.abs(remainingDifference) >= adjustmentUnit / 2 && index < sortedEntries.length * 100) {
          const [apartmentId, item] = sortedEntries[index % sortedEntries.length];
          const adjustment = remainingDifference > 0 ? adjustmentUnit : -adjustmentUnit;
          
          item.finalAmount += adjustment;
          item.roundingAdjustment += adjustment;
          remainingDifference -= adjustment;
          
          index++;
        }

        // Handle any tiny remaining difference (should be < adjustmentUnit)
        if (Math.abs(remainingDifference) > 0) {
          const [apartmentId, item] = sortedEntries[0];
          item.finalAmount += remainingDifference;
          item.roundingAdjustment += remainingDifference;
        }
        break;
      }
    }

    return distribution;
  }

  /**
   * Calculate heating charges based on consumption
   * 
   * Logic:
   * 1. Calculate consumption-based charges (consumption × unitPrice)
   * 2. Sum total consumption costs
   * 3. Find fixed costs (total oil expense - consumption costs)
   * 4. Distribute fixed costs by heating share percentage
   * 5. Add previous balances
   */
  private calculateHeatingCharges(
    consumptions: HeatingConsumptionDto[],
    apartments: ApartmentDto[],
    apartmentCharges: Map<string, ApartmentChargeBreakdownDto>,
    input: CalculationInputDto,
  ): void {
    if (consumptions.length === 0) {
      return;
    }

    // Find total heating expense from expenses
    const heatingExpense = input.expenses.find(
      exp => exp.distributionMethod === DistributionMethod.CONSUMPTION_BASED,
    );

    if (!heatingExpense) {
      this.logger.warn('No consumption-based expense found for heating calculation');
      return;
    }

    // Calculate consumption costs per apartment
    const consumptionCosts = new Map<string, number>();
    let totalConsumptionCost = 0;

    consumptions.forEach(consumption => {
      const cost = consumption.consumption * consumption.unitPrice;
      consumptionCosts.set(consumption.apartmentId, cost);
      totalConsumptionCost += cost;
    });

    // Calculate fixed costs (base charge)
    const fixedCosts = heatingExpense.amount - totalConsumptionCost;

    this.logger.debug(
      `Heating breakdown: Total=${heatingExpense.amount}, Consumption=${totalConsumptionCost}, Fixed=${fixedCosts}`,
    );

    // Distribute fixed costs by heating share percentage
    const heatingApartments = apartments.filter(apt => apt.heatingSharePercentage > 0);
    const totalHeatingShare = heatingApartments.reduce(
      (sum, apt) => sum + apt.heatingSharePercentage,
      0,
    );

    const fixedCostDistribution = new Map<string, number>();
    heatingApartments.forEach(apartment => {
      const fixedCost = (fixedCosts * apartment.heatingSharePercentage) / totalHeatingShare;
      fixedCostDistribution.set(apartment.id, fixedCost);
    });

    // Apply rounding to fixed costs
    const roundedFixedCosts = this.applyRoundingAdjustments(
      new Map(
        Array.from(fixedCostDistribution.entries()).map(([id, amount]) => [
          id,
          {
            sharePercentage: heatingApartments.find(a => a.id === id)?.heatingSharePercentage || 0,
            calculatedAmount: amount,
            finalAmount: this.roundToDecimal(amount, input.settings.decimalPlaces),
            roundingAdjustment: 0,
          },
        ]),
      ),
      fixedCosts,
      input.settings.roundingStrategy,
      input.settings.decimalPlaces,
    );

    // Combine consumption + fixed costs + previous balance
    consumptions.forEach(consumption => {
      const charge = apartmentCharges.get(consumption.apartmentId);
      if (!charge) {
        return;
      }

      const consumptionCost = consumptionCosts.get(consumption.apartmentId) || 0;
      const fixedCost = roundedFixedCosts.get(consumption.apartmentId);
      const fixedAmount = fixedCost ? fixedCost.finalAmount : 0;
      const fixedAdjustment = fixedCost ? fixedCost.roundingAdjustment : 0;

      const totalCalculated = consumptionCost + (fixedCost?.calculatedAmount || 0);
      const totalFinal = this.roundToDecimal(
        consumptionCost + fixedAmount,
        input.settings.decimalPlaces,
      );

      charge.heating = {
        consumption: consumption.consumption,
        unitPrice: consumption.unitPrice,
        totalCost: consumptionCost,
        sharePercentage: charge.heatingSharePercentage,
        calculatedAmount: totalCalculated,
        finalAmount: totalFinal,
        roundingAdjustment: fixedAdjustment,
        previousBalance: consumption.previousBalance,
      };
    });
  }

  /**
   * Calculate reserve fund contributions/withdrawals
   * 
   * Logic:
   * 1. Process contributions (distributed by method)
   * 2. Process withdrawals (reduce from reserve fund)
   * 3. Track balance (previous + contributions - withdrawals)
   */
  private calculateReserveFund(
    operations: ReserveFundOperationDto[],
    apartments: ApartmentDto[],
    apartmentCharges: Map<string, ApartmentChargeBreakdownDto>,
    input: CalculationInputDto,
  ): ReserveFundSummaryDto {
    let previousBalance = 0; // TODO: Get from database
    let totalContributions = 0;
    let totalWithdrawals = 0;

    operations.forEach(operation => {
      if (operation.type === 'CONTRIBUTION') {
        // Distribute contribution among apartments
        const distributionMethod =
          operation.distributionMethod || input.settings.reserveFundDistribution;

        // Create a virtual expense for contribution
        const virtualExpense: ExpenseItemDto = {
          id: `reserve-${operation.description}`,
          categoryId: 'reserve-fund',
          categoryName: 'Αποθεματικό',
          amount: operation.amount,
          distributionMethod,
          description: operation.description,
        };

        // Calculate distribution
        const distribution = this.calculateDistribution(
          virtualExpense,
          apartments,
          input.settings.decimalPlaces,
        );

        // Apply rounding
        const roundedDistribution = this.applyRoundingAdjustments(
          distribution,
          operation.amount,
          input.settings.roundingStrategy,
          input.settings.decimalPlaces,
        );

        // Add to apartment charges
        roundedDistribution.forEach((item, apartmentId) => {
          const charge = apartmentCharges.get(apartmentId);
          if (!charge) {
            return;
          }

          charge.reserveFund = {
            type: 'CONTRIBUTION',
            description: operation.description,
            sharePercentage: item.sharePercentage,
            calculatedAmount: item.calculatedAmount,
            finalAmount: item.finalAmount,
            roundingAdjustment: item.roundingAdjustment,
          };

          totalContributions += item.finalAmount;
        });
      } else if (operation.type === 'WITHDRAWAL') {
        // Withdrawal reduces reserve fund but doesn't charge apartments
        totalWithdrawals += operation.amount;
      }
    });

    return {
      previousBalance,
      contributions: totalContributions,
      withdrawals: totalWithdrawals,
      newBalance: previousBalance + totalContributions - totalWithdrawals,
    };
  }

  /**
   * Calculate category summaries
   */
  private calculateCategorySummaries(
    expenses: ExpenseItemDto[],
    apartmentCharges: ApartmentChargeBreakdownDto[],
  ): CategorySummaryDto[] {
    const categoriesMap = new Map<string, CategorySummaryDto>();

    expenses.forEach(expense => {
      if (!categoriesMap.has(expense.categoryId)) {
        categoriesMap.set(expense.categoryId, {
          categoryId: expense.categoryId,
          categoryName: expense.categoryName,
          distributionMethod: expense.distributionMethod,
          totalAmount: 0,
          expenseCount: 0,
          apartmentsCharged: 0,
          totalDistributed: 0,
          distributionVariance: 0,
        });
      }

      const summary = categoriesMap.get(expense.categoryId)!;
      summary.totalAmount += expense.amount;
      summary.expenseCount += 1;

      // Count apartments charged for this category
      const apartmentsSet = new Set<string>();
      apartmentCharges.forEach(charge => {
        const categoryExpenses = charge.expenses.filter(
          exp => exp.expenseId === expense.id,
        );
        if (categoryExpenses.length > 0) {
          apartmentsSet.add(charge.apartmentId);
          summary.totalDistributed += categoryExpenses.reduce(
            (sum, exp) => sum + exp.finalAmount,
            0,
          );
        }
      });
      summary.apartmentsCharged = Math.max(summary.apartmentsCharged, apartmentsSet.size);
    });

    // Calculate variances
    categoriesMap.forEach(summary => {
      summary.distributionVariance = summary.totalAmount - summary.totalDistributed;
    });

    return Array.from(categoriesMap.values());
  }

  /**
   * Validate calculation inputs
   */
  private validateInput(input: CalculationInputDto): string[] {
    const errors: string[] = [];

    if (!input.periodId) {
      errors.push('Period ID is required');
    }

    if (!input.apartments || input.apartments.length === 0) {
      errors.push('At least one apartment is required');
    }

    if (!input.expenses || input.expenses.length === 0) {
      errors.push('At least one expense is required');
    }

    // Validate share percentages
    const activeApartments = input.apartments.filter(apt => !apt.isExcluded);
    const totalGeneralShare = activeApartments.reduce(
      (sum, apt) => sum + apt.sharePercentage,
      0,
    );

    if (totalGeneralShare === 0) {
      errors.push('Total general share percentage cannot be zero');
    }

    // Validate expenses
    input.expenses.forEach((expense, index) => {
      if (expense.amount <= 0) {
        errors.push(`Expense ${index + 1}: Amount must be positive`);
      }
    });

    return errors;
  }

  /**
   * Generate hash of inputs for reproducibility
   */
  private generateInputHash(input: CalculationInputDto): string {
    const hashInput = {
      periodId: input.periodId,
      expenses: input.expenses.map(exp => ({
        id: exp.id,
        amount: exp.amount,
        categoryId: exp.categoryId,
        distributionMethod: exp.distributionMethod,
      })),
      apartments: input.apartments.map(apt => ({
        id: apt.id,
        sharePercentage: apt.sharePercentage,
        heatingSharePercentage: apt.heatingSharePercentage,
        isExcluded: apt.isExcluded,
      })),
      settings: input.settings,
    };

    return crypto
      .createHash('sha256')
      .update(JSON.stringify(hashInput))
      .digest('hex');
  }

  /**
   * Round to specified decimal places
   */
  private roundToDecimal(value: number, decimalPlaces: number): number {
    const multiplier = Math.pow(10, decimalPlaces);
    return Math.round(value * multiplier) / multiplier;
  }
}
