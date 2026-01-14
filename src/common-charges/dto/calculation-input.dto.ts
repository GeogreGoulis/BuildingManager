/**
 * Common Charges Calculation - Input DTOs
 * 
 * Pure data structures for calculation inputs.
 * No business logic, only data validation.
 */

/**
 * Distribution method for expense categories
 */
export enum DistributionMethod {
  /** Distribute by general share percentage */
  GENERAL_SHARE = 'GENERAL_SHARE',
  
  /** Distribute by heating share percentage */
  HEATING_SHARE = 'HEATING_SHARE',
  
  /** Distribute equally among selected apartments */
  EQUAL_SPLIT = 'EQUAL_SPLIT',
  
  /** Distribute by custom percentages */
  CUSTOM = 'CUSTOM',
  
  /** Distribute by actual consumption (e.g., oil heating) */
  CONSUMPTION_BASED = 'CONSUMPTION_BASED',
}

/**
 * Single expense item for calculation
 */
export interface ExpenseItemDto {
  /** Expense ID for traceability */
  id: string;
  
  /** Expense category ID */
  categoryId: string;
  
  /** Category name (for audit trail) */
  categoryName: string;
  
  /** Expense amount */
  amount: number;
  
  /** Distribution method for this expense */
  distributionMethod: DistributionMethod;
  
  /** 
   * Apartment IDs to include (null = all apartments)
   * Used for special categories (e.g., only ground floor)
   */
  includedApartmentIds?: string[] | null;
  
  /** Custom percentages per apartment (for CUSTOM method) */
  customDistribution?: Record<string, number> | null;
  
  /** VAT percentage (if applicable) */
  vatPercentage?: number;
  
  /** Description for audit trail */
  description: string;
  
  /** Is this a direct charge to a specific apartment? */
  isDirectCharge?: boolean;
  
  /** The apartment ID to charge directly (if isDirectCharge=true) */
  chargedApartmentId?: string | null;
}

/**
 * Apartment data for calculation
 */
export interface ApartmentDto {
  /** Apartment ID */
  id: string;
  
  /** Apartment number (for display) */
  number: string;
  
  /** Floor (for display) */
  floor: string;
  
  /** General share percentage (χιλιοστά) */
  sharePercentage: number;
  
  /** Heating share percentage (χιλιοστά θέρμανσης) */
  heatingSharePercentage: number;
  
  /** Is apartment occupied (affects some distributions) */
  isOccupied: boolean;
  
  /** Is apartment excluded from this period */
  isExcluded: boolean;

  /** Owner name (for display) */
  ownerName?: string;

  /** Square meters */
  squareMeters?: number;

  /** Common share */
  shareCommon?: number;

  /** Elevator share */
  shareElevator?: number;

  /** Heating share */
  shareHeating?: number;

  /** Other share */
  shareOther?: number;
}

/**
 * Heating consumption data
 */
export interface HeatingConsumptionDto {
  /** Apartment ID */
  apartmentId: string;
  
  /** Consumption in units (e.g., oil liters, kWh) */
  consumption: number;
  
  /** Unit price for this period */
  unitPrice: number;
  
  /** Previous balance (if any) */
  previousBalance?: number;
}

/**
 * Building settings for calculation
 */
export interface BuildingCalculationSettingsDto {
  /** Decimal places for rounding */
  decimalPlaces: number;
  
  /** How to handle rounding remainder */
  roundingStrategy: 'DISTRIBUTE' | 'FIRST_APARTMENT' | 'LARGEST_SHARE';
  
  /** Reserve fund percentage (0-100) */
  reserveFundPercentage: number;
  
  /** Reserve fund distribution method */
  reserveFundDistribution: DistributionMethod;
  
  /** Default VAT percentage */
  defaultVatPercentage: number;
}

/**
 * Reserve fund operation
 */
export interface ReserveFundOperationDto {
  /** Type of operation */
  type: 'CONTRIBUTION' | 'WITHDRAWAL';
  
  /** Amount */
  amount: number;
  
  /** Description */
  description: string;
  
  /** Distribution method (for contributions) */
  distributionMethod?: DistributionMethod;
}

/**
 * Complete calculation input
 */
export interface CalculationInputDto {
  /** Period ID for traceability */
  periodId: string;
  
  /** Building ID */
  buildingId: string;
  
  /** Period info (for display) */
  period: {
    month: number;
    year: number;
  };
  
  /** List of expenses to distribute */
  expenses: ExpenseItemDto[];
  
  /** Apartments participating in this period */
  apartments: ApartmentDto[];
  
  /** Heating consumption data (if applicable) */
  heatingConsumptions?: HeatingConsumptionDto[];
  
  /** Building calculation settings */
  settings: BuildingCalculationSettingsDto;
  
  /** Reserve fund operations (if any) */
  reserveFundOperations?: ReserveFundOperationDto[];
  
  /** Previous period balance per apartment */
  previousBalances?: Record<string, number>;
}
