/**
 * Common Charges Calculation - Output DTOs
 * 
 * Complete breakdown of calculation results.
 * Designed for auditability and reproducibility.
 */

import { DistributionMethod } from './calculation-input.dto';

/**
 * Single expense breakdown for one apartment
 */
export interface ExpenseBreakdownItemDto {
  /** Expense ID */
  expenseId: string;
  
  /** Expense category name */
  categoryName: string;
  
  /** Expense description */
  description: string;
  
  /** Total expense amount */
  totalAmount: number;
  
  /** Distribution method used */
  distributionMethod: DistributionMethod;
  
  /** Share percentage applied (if applicable) */
  sharePercentage?: number;
  
  /** Consumption amount (if consumption-based) */
  consumption?: number;
  
  /** Unit price (if consumption-based) */
  unitPrice?: number;
  
  /** Calculated amount for this apartment (before rounding) */
  calculatedAmount: number;
  
  /** Final amount (after rounding) */
  finalAmount: number;
  
  /** Rounding adjustment applied */
  roundingAdjustment: number;
  
  /** VAT amount (if applicable) */
  vatAmount?: number;
}

/**
 * Heating charge breakdown
 */
export interface HeatingBreakdownDto {
  /** Consumption in units */
  consumption: number;
  
  /** Unit price */
  unitPrice: number;
  
  /** Total cost (consumption × unitPrice) */
  totalCost: number;
  
  /** Share percentage */
  sharePercentage: number;
  
  /** Calculated amount */
  calculatedAmount: number;
  
  /** Final amount (after rounding) */
  finalAmount: number;
  
  /** Rounding adjustment */
  roundingAdjustment: number;
  
  /** Previous balance (if any) */
  previousBalance?: number;
}

/**
 * Reserve fund breakdown
 */
export interface ReserveFundBreakdownDto {
  /** Operation type */
  type: 'CONTRIBUTION' | 'WITHDRAWAL';
  
  /** Description */
  description: string;
  
  /** Share percentage (for contributions) */
  sharePercentage?: number;
  
  /** Calculated amount */
  calculatedAmount: number;
  
  /** Final amount (after rounding) */
  finalAmount: number;
  
  /** Rounding adjustment */
  roundingAdjustment: number;
}

/**
 * Complete breakdown for one apartment
 */
export interface ApartmentChargeBreakdownDto {
  /** Apartment ID */
  apartmentId: string;
  
  /** Apartment number */
  apartmentNumber: string;
  
  /** Floor */
  floor: string;
  
  /** General share percentage */
  sharePercentage: number;
  
  /** Heating share percentage */
  heatingSharePercentage: number;
  
  /** Was apartment excluded? */
  wasExcluded: boolean;
  
  /** Expense breakdowns */
  expenses: ExpenseBreakdownItemDto[];
  
  /** Heating breakdown (if applicable) */
  heating?: HeatingBreakdownDto;
  
  /** Reserve fund breakdown (if applicable) */
  reserveFund?: ReserveFundBreakdownDto;
  
  /** Previous balance */
  previousBalance: number;
  
  /** Subtotal of all charges (before previous balance) */
  subtotal: number;
  
  /** Total rounding adjustments */
  totalRoundingAdjustments: number;
  
  /** Final total */
  total: number;
}

/**
 * Summary by category
 */
export interface CategorySummaryDto {
  /** Category ID */
  categoryId: string;
  
  /** Category name */
  categoryName: string;
  
  /** Distribution method */
  distributionMethod: DistributionMethod;
  
  /** Total amount */
  totalAmount: number;
  
  /** Number of expenses in this category */
  expenseCount: number;
  
  /** Number of apartments charged */
  apartmentsCharged: number;
  
  /** Total distributed (should equal totalAmount) */
  totalDistributed: number;
  
  /** Distribution variance (should be 0) */
  distributionVariance: number;
}

/**
 * Reserve fund summary
 */
export interface ReserveFundSummaryDto {
  /** Previous balance */
  previousBalance: number;
  
  /** Total contributions this period */
  contributions: number;
  
  /** Total withdrawals this period */
  withdrawals: number;
  
  /** New balance */
  newBalance: number;
}

/**
 * Calculation metadata
 */
export interface CalculationMetadataDto {
  /** Calculation timestamp */
  calculatedAt: Date;
  
  /** Period ID */
  periodId: string;
  
  /** Building ID */
  buildingId: string;
  
  /** Period */
  period: {
    month: number;
    year: number;
  };
  
  /** Settings used */
  settings: {
    decimalPlaces: number;
    roundingStrategy: string;
    reserveFundPercentage: number;
  };
  
  /** Input hash (for reproducibility) */
  inputHash: string;
  
  /** Calculation version (algorithm version) */
  calculationVersion: string;
}

/**
 * Complete calculation output
 */
export interface CalculationOutputDto {
  /** Metadata */
  metadata: CalculationMetadataDto;
  
  /** Breakdown per apartment */
  apartmentCharges: ApartmentChargeBreakdownDto[];
  
  /** Summary by category */
  categorySummaries: CategorySummaryDto[];
  
  /** Reserve fund summary */
  reserveFundSummary?: ReserveFundSummaryDto;
  
  /** Total expenses (input) */
  totalExpenses: number;
  
  /** Total distributed (output) */
  totalDistributed: number;
  
  /** Distribution variance (should be 0 or very small) */
  distributionVariance: number;
  
  /** Total rounding adjustments */
  totalRoundingAdjustments: number;
  
  /** Validation errors (if any) */
  validationErrors: string[];
  
  /** Warnings (if any) */
  warnings: string[];
}
