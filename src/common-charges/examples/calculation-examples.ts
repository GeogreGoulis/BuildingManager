/**
 * Common Charges Calculation - Example Usage
 * 
 * This file demonstrates how to use the calculation service
 * with real-world examples and edge cases.
 */

import { CalculationInputDto, DistributionMethod } from '../dto/calculation-input.dto';

/**
 * Example 1: Simple Building with General Expenses Only
 * 
 * Building: 4 apartments
 * Period: January 2026
 * Expenses: Cleaning, electricity, maintenance
 */
export const example1_SimpleGeneralExpenses: CalculationInputDto = {
  periodId: 'period-2026-01',
  buildingId: 'building-123',
  period: {
    month: 1,
    year: 2026,
  },
  
  apartments: [
    {
      id: 'apt-1',
      number: 'A1',
      floor: '1st',
      sharePercentage: 25.0, // 25% share
      heatingSharePercentage: 25.0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-2',
      number: 'A2',
      floor: '1st',
      sharePercentage: 25.0,
      heatingSharePercentage: 25.0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-3',
      number: 'B1',
      floor: '2nd',
      sharePercentage: 30.0, // Larger apartment
      heatingSharePercentage: 30.0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-4',
      number: 'B2',
      floor: '2nd',
      sharePercentage: 20.0, // Smaller apartment
      heatingSharePercentage: 20.0,
      isOccupied: false, // Empty but still charged
      isExcluded: false,
    },
  ],
  
  expenses: [
    {
      id: 'exp-cleaning',
      categoryId: 'cat-cleaning',
      categoryName: 'Καθαριότητα',
      amount: 200.00,
      distributionMethod: DistributionMethod.GENERAL_SHARE,
      description: 'Καθαριότητα Ιανουαρίου 2026',
    },
    {
      id: 'exp-electricity',
      categoryId: 'cat-electricity',
      categoryName: 'Ηλεκτρικό Ρεύμα',
      amount: 150.00,
      distributionMethod: DistributionMethod.GENERAL_SHARE,
      description: 'ΔΕΗ κοινόχρηστων',
    },
    {
      id: 'exp-maintenance',
      categoryId: 'cat-maintenance',
      categoryName: 'Συντήρηση',
      amount: 350.00,
      distributionMethod: DistributionMethod.GENERAL_SHARE,
      description: 'Επισκευή κεντρικής εισόδου',
    },
  ],
  
  settings: {
    decimalPlaces: 2,
    roundingStrategy: 'DISTRIBUTE',
    reserveFundPercentage: 0,
    reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
    defaultVatPercentage: 24,
  },
};

/**
 * Expected Output for Example 1:
 * 
 * Total Expenses: €700.00
 * 
 * Apartment A1 (25%): €175.00
 *   - Cleaning: €50.00
 *   - Electricity: €37.50
 *   - Maintenance: €87.50
 * 
 * Apartment A2 (25%): €175.00
 *   - Cleaning: €50.00
 *   - Electricity: €37.50
 *   - Maintenance: €87.50
 * 
 * Apartment B1 (30%): €210.00
 *   - Cleaning: €60.00
 *   - Electricity: €45.00
 *   - Maintenance: €105.00
 * 
 * Apartment B2 (20%): €140.00
 *   - Cleaning: €40.00
 *   - Electricity: €30.00
 *   - Maintenance: €70.00
 * 
 * Verification: 175 + 175 + 210 + 140 = 700 ✓
 */

/**
 * Example 2: Elevator Charges (Special Category)
 * 
 * Building: 6 apartments (2 ground floor without elevator access)
 * Only apartments on floors 1-3 use elevator
 */
export const example2_ElevatorCharges: CalculationInputDto = {
  periodId: 'period-2026-01-elev',
  buildingId: 'building-456',
  period: {
    month: 1,
    year: 2026,
  },
  
  apartments: [
    // Ground floor - no elevator
    {
      id: 'apt-g1',
      number: 'G1',
      floor: 'Ground',
      sharePercentage: 20.0,
      heatingSharePercentage: 20.0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-g2',
      number: 'G2',
      floor: 'Ground',
      sharePercentage: 20.0,
      heatingSharePercentage: 20.0,
      isOccupied: true,
      isExcluded: false,
    },
    // Upper floors - use elevator
    {
      id: 'apt-1a',
      number: '1A',
      floor: '1st',
      sharePercentage: 15.0,
      heatingSharePercentage: 15.0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-2a',
      number: '2A',
      floor: '2nd',
      sharePercentage: 15.0,
      heatingSharePercentage: 15.0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-3a',
      number: '3A',
      floor: '3rd',
      sharePercentage: 15.0,
      heatingSharePercentage: 15.0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-3b',
      number: '3B',
      floor: '3rd',
      sharePercentage: 15.0,
      heatingSharePercentage: 15.0,
      isOccupied: true,
      isExcluded: false,
    },
  ],
  
  expenses: [
    // General expense - all apartments
    {
      id: 'exp-cleaning',
      categoryId: 'cat-cleaning',
      categoryName: 'Καθαριότητα',
      amount: 300.00,
      distributionMethod: DistributionMethod.GENERAL_SHARE,
      description: 'Καθαριότητα κοινόχρηστων',
    },
    // Elevator - only upper floors
    {
      id: 'exp-elevator',
      categoryId: 'cat-elevator',
      categoryName: 'Ανελκυστήρας',
      amount: 200.00,
      distributionMethod: DistributionMethod.GENERAL_SHARE,
      includedApartmentIds: ['apt-1a', 'apt-2a', 'apt-3a', 'apt-3b'],
      description: 'Συντήρηση ανελκυστήρα',
    },
  ],
  
  settings: {
    decimalPlaces: 2,
    roundingStrategy: 'DISTRIBUTE',
    reserveFundPercentage: 0,
    reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
    defaultVatPercentage: 24,
  },
};

/**
 * Expected Output for Example 2:
 * 
 * Ground Floor Apartments (NO elevator charge):
 * - G1: €60.00 (cleaning only: 300 × 20%)
 * - G2: €60.00 (cleaning only: 300 × 20%)
 * 
 * Upper Floor Apartments (WITH elevator):
 * - 1A: €95.00 (cleaning: €45.00 + elevator: €50.00)
 * - 2A: €95.00 (cleaning: €45.00 + elevator: €50.00)
 * - 3A: €95.00 (cleaning: €45.00 + elevator: €50.00)
 * - 3B: €95.00 (cleaning: €45.00 + elevator: €50.00)
 * 
 * Note: Elevator cost (€200) is distributed equally among 4 apartments
 * using general share, which are all 15% each = 25% effective share each.
 */

/**
 * Example 3: Heating with Consumption
 * 
 * Building with central heating and individual meters
 */
export const example3_HeatingConsumption: CalculationInputDto = {
  periodId: 'period-2026-01-heat',
  buildingId: 'building-789',
  period: {
    month: 1,
    year: 2026,
  },
  
  apartments: [
    {
      id: 'apt-a',
      number: 'A',
      floor: '1st',
      sharePercentage: 33.33,
      heatingSharePercentage: 35.0, // Higher heating share
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-b',
      number: 'B',
      floor: '2nd',
      sharePercentage: 33.33,
      heatingSharePercentage: 30.0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-c',
      number: 'C',
      floor: '3rd',
      sharePercentage: 33.34,
      heatingSharePercentage: 35.0,
      isOccupied: false, // Empty - zero consumption
      isExcluded: false,
    },
  ],
  
  expenses: [
    {
      id: 'exp-oil',
      categoryId: 'cat-heating',
      categoryName: 'Πετρέλαιο Θέρμανσης',
      amount: 1500.00,
      distributionMethod: DistributionMethod.CONSUMPTION_BASED,
      description: 'Πετρέλαιο Ιανουαρίου',
    },
  ],
  
  heatingConsumptions: [
    {
      apartmentId: 'apt-a',
      consumption: 500, // liters
      unitPrice: 1.20, // €1.20 per liter
      previousBalance: 0,
    },
    {
      apartmentId: 'apt-b',
      consumption: 400, // liters
      unitPrice: 1.20,
      previousBalance: -50, // Credit from previous period
    },
    {
      apartmentId: 'apt-c',
      consumption: 0, // Empty apartment
      unitPrice: 1.20,
      previousBalance: 120, // Debt from previous period
    },
  ],
  
  settings: {
    decimalPlaces: 2,
    roundingStrategy: 'LARGEST_SHARE',
    reserveFundPercentage: 0,
    reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
    defaultVatPercentage: 24,
  },
};

/**
 * Expected Output for Example 3:
 * 
 * Total Oil Cost: €1,500
 * Total Consumption: 900 liters
 * 
 * Apartment A:
 *   - Consumption: 500L × €1.20 = €600.00
 *   - Previous balance: €0.00
 *   - Total: €600.00
 * 
 * Apartment B:
 *   - Consumption: 400L × €1.20 = €480.00
 *   - Previous balance: -€50.00 (credit)
 *   - Total: €430.00
 * 
 * Apartment C:
 *   - Consumption: 0L × €1.20 = €0.00
 *   - Previous balance: €120.00 (debt)
 *   - Total: €120.00
 * 
 * Note: Total distributed (€600 + €480 + €0) = €1,080
 * Missing €420 needs to be distributed (fixed cost / base charge)
 */

/**
 * Example 4: Rounding Challenges
 * 
 * Small amounts with many apartments - tests rounding logic
 */
export const example4_RoundingChallenges: CalculationInputDto = {
  periodId: 'period-2026-01-round',
  buildingId: 'building-999',
  period: {
    month: 1,
    year: 2026,
  },
  
  apartments: [
    {
      id: 'apt-1',
      number: '1',
      floor: '1st',
      sharePercentage: 33.33,
      heatingSharePercentage: 0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-2',
      number: '2',
      floor: '2nd',
      sharePercentage: 33.33,
      heatingSharePercentage: 0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-3',
      number: '3',
      floor: '3rd',
      sharePercentage: 33.34,
      heatingSharePercentage: 0,
      isOccupied: true,
      isExcluded: false,
    },
  ],
  
  expenses: [
    {
      id: 'exp-small',
      categoryId: 'cat-misc',
      categoryName: 'Λοιπά',
      amount: 10.00, // Small amount
      distributionMethod: DistributionMethod.GENERAL_SHARE,
      description: 'Μικρό έξοδο',
    },
  ],
  
  settings: {
    decimalPlaces: 2,
    roundingStrategy: 'DISTRIBUTE',
    reserveFundPercentage: 0,
    reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
    defaultVatPercentage: 24,
  },
};

/**
 * Expected Output for Example 4:
 * 
 * Total: €10.00
 * 
 * Without rounding adjustment:
 * - Apt 1: 10 × 33.33% = €3.333 → €3.33
 * - Apt 2: 10 × 33.33% = €3.333 → €3.33
 * - Apt 3: 10 × 33.34% = €3.334 → €3.33
 * Sum: €9.99 (missing €0.01!)
 * 
 * With rounding adjustment (DISTRIBUTE strategy):
 * - Apt 1: €3.33
 * - Apt 2: €3.33
 * - Apt 3: €3.34 (+€0.01 adjustment)
 * Sum: €10.00 ✓
 */

/**
 * Example 5: Excluded Apartment
 * 
 * One apartment is excluded from charges (e.g., renovation)
 */
export const example5_ExcludedApartment: CalculationInputDto = {
  periodId: 'period-2026-01-excl',
  buildingId: 'building-excluded',
  period: {
    month: 1,
    year: 2026,
  },
  
  apartments: [
    {
      id: 'apt-1',
      number: '1',
      floor: '1st',
      sharePercentage: 50.0,
      heatingSharePercentage: 50.0,
      isOccupied: true,
      isExcluded: false,
    },
    {
      id: 'apt-2',
      number: '2',
      floor: '2nd',
      sharePercentage: 50.0,
      heatingSharePercentage: 50.0,
      isOccupied: false,
      isExcluded: true, // Excluded - under renovation
    },
  ],
  
  expenses: [
    {
      id: 'exp-total',
      categoryId: 'cat-general',
      categoryName: 'Γενικά',
      amount: 100.00,
      distributionMethod: DistributionMethod.GENERAL_SHARE,
      description: 'Έξοδα περιόδου',
    },
  ],
  
  settings: {
    decimalPlaces: 2,
    roundingStrategy: 'FIRST_APARTMENT',
    reserveFundPercentage: 0,
    reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
    defaultVatPercentage: 24,
  },
};

/**
 * Expected Output for Example 5:
 * 
 * Total: €100.00
 * 
 * Apartment 1: €100.00 (100% since apt-2 is excluded)
 * Apartment 2: €0.00 (excluded)
 * 
 * Important: Excluded apartments don't participate in distribution,
 * but their data is preserved for audit purposes.
 */
