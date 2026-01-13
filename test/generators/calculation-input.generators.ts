import * as fc from 'fast-check';
import {
  CalculationInputDto,
  DistributionMethod,
  ApartmentDto,
  ExpenseItemDto,
} from '../../src/common-charges/dto/calculation-input.dto';

/**
 * Input Generators for Property-Based Testing
 * 
 * These generators create realistic, valid inputs for the calculation service.
 * They ensure:
 * - Share percentages sum to 100%
 * - Amounts are positive
 * - IDs are unique
 * - Data is consistent
 */

/**
 * Generate valid share percentages that sum to 100%
 * 
 * Algorithm:
 * 1. Generate n random numbers
 * 2. Normalize to sum to 100
 * 3. Round to specified decimal places
 * 4. Adjust last value to ensure exact sum
 */
export const sharePercentagesArbitrary = (
  apartmentCount: number,
  decimalPlaces = 2,
): fc.Arbitrary<number[]> => {
  return fc
    .array(fc.float({ min: Math.fround(1), max: Math.fround(100), noNaN: true, noDefaultInfinity: true }), {
      minLength: apartmentCount,
      maxLength: apartmentCount,
    })
    .map((shares) => {
      // Filter out any invalid values
      const validShares = shares.filter(s => !isNaN(s) && isFinite(s) && s > 0);
      if (validShares.length === 0) {
        // Fallback to equal shares
        return Array(apartmentCount).fill(100 / apartmentCount);
      }
      
      // Normalize to sum to 100
      const sum = validShares.reduce((a, b) => a + b, 0);
      const normalized = validShares.map((s) => (s / sum) * 100);

      // Round to decimal places
      const multiplier = Math.pow(10, decimalPlaces);
      const rounded = normalized.map((s) =>
        Math.round(s * multiplier) / multiplier,
      );

      // Adjust last value to ensure sum = 100
      const roundedSum = rounded.reduce((a, b) => a + b, 0);
      rounded[rounded.length - 1] += 100 - roundedSum;

      return rounded;
    });
};

/**
 * Generate apartment with valid data
 */
export const apartmentArbitrary = (
  id: string,
  number: string,
  sharePercentage: number,
): fc.Arbitrary<ApartmentDto> => {
  return fc.record({
    id: fc.constant(id),
    number: fc.constant(number),
    floor: fc.oneof(
      fc.constant('Ground'),
      fc.constant('1st'),
      fc.constant('2nd'),
      fc.constant('3rd'),
      fc.integer({ min: 1, max: 10 }).map((n) => `${n}th`),
    ),
    sharePercentage: fc.constant(sharePercentage),
    heatingSharePercentage: fc.constant(sharePercentage), // Same as general for simplicity
    isOccupied: fc.boolean(),
    isExcluded: fc.boolean().map(excluded => excluded && Math.random() < 0.3), // Only 30% chance of exclusion
  });
};

/**
 * Generate list of apartments with valid share percentages
 */
export const apartmentsArbitrary = (
  minApartments = 2,
  maxApartments = 20,
): fc.Arbitrary<ApartmentDto[]> => {
  return fc
    .integer({ min: minApartments, max: maxApartments })
    .chain((count) => {
      return sharePercentagesArbitrary(count).chain((shares) => {
        const apartmentArbitraries = shares.map((share, index) =>
          apartmentArbitrary(`apt-${index + 1}`, `${index + 1}`, share),
        );
        return fc.tuple(...apartmentArbitraries).map((apts) => {
          // Ensure at least one apartment is not excluded and has valid share
          const validApts = apts.filter(apt => !apt.isExcluded && apt.sharePercentage > 0);
          if (validApts.length === 0 && apts.length > 0) {
            // Make first apartment valid
            apts[0].isExcluded = false;
            if (apts[0].sharePercentage === 0 || isNaN(apts[0].sharePercentage)) {
              apts[0].sharePercentage = 100 / apts.length;
              apts[0].heatingSharePercentage = 100 / apts.length;
            }
          }
          // Ensure all shares are valid numbers
          apts.forEach(apt => {
            if (isNaN(apt.sharePercentage) || !isFinite(apt.sharePercentage)) {
              apt.sharePercentage = 0;
              apt.heatingSharePercentage = 0;
              apt.isExcluded = true;
            }
          });
          return apts;
        });
      });
    });
};

/**
 * Generate expense with valid data
 */
export const expenseArbitrary = (
  id: string,
  categoryName: string,
  distributionMethod: DistributionMethod,
): fc.Arbitrary<ExpenseItemDto> => {
  return fc.record({
    id: fc.constant(id),
    categoryId: fc.constant(`cat-${categoryName.toLowerCase()}`),
    categoryName: fc.constant(categoryName),
    amount: fc.float({ min: Math.fround(10), max: Math.fround(5000), noNaN: true, noDefaultInfinity: true }).map((n) => {
      const rounded = Math.round(n * 100) / 100;
      return isFinite(rounded) && rounded > 0 ? rounded : 10;
    }),
    distributionMethod: fc.constant(distributionMethod),
    description: fc.constant(`${categoryName} expense`),
    includedApartmentIds: fc.constant(null),
    customDistribution: fc.constant(null),
  });
};

/**
 * Generate list of expenses
 */
export const expensesArbitrary = (
  minExpenses = 1,
  maxExpenses = 10,
): fc.Arbitrary<ExpenseItemDto[]> => {
  return fc
    .integer({ min: minExpenses, max: maxExpenses })
    .chain((count) => {
      const categories = [
        'Cleaning',
        'Electricity',
        'Water',
        'Maintenance',
        'Insurance',
        'Security',
      ];
      const expenseArbitraries = Array.from({ length: count }, (_, index) =>
        expenseArbitrary(
          `exp-${index + 1}`,
          categories[index % categories.length],
          DistributionMethod.GENERAL_SHARE,
        ),
      );
      return fc.tuple(...expenseArbitraries).map((exps) => exps);
    });
};

/**
 * Generate complete calculation input
 */
export const calculationInputArbitrary = (): fc.Arbitrary<CalculationInputDto> => {
  return fc.record({
    periodId: fc.uuid().map((id) => `period-${id}`),
    buildingId: fc.uuid().map((id) => `building-${id}`),
    period: fc.record({
      month: fc.integer({ min: 1, max: 12 }),
      year: fc.integer({ min: 2020, max: 2030 }),
    }),
    apartments: apartmentsArbitrary(2, 10),
    expenses: expensesArbitrary(1, 5),
    settings: fc.record({
      decimalPlaces: fc.constant(2),
      roundingStrategy: fc.constantFrom(
        'DISTRIBUTE' as const,
        'FIRST_APARTMENT' as const,
        'LARGEST_SHARE' as const,
      ),
      reserveFundPercentage: fc.constant(0),
      reserveFundDistribution: fc.constant(DistributionMethod.GENERAL_SHARE),
      defaultVatPercentage: fc.constant(24),
    }),
    previousBalances: fc.constant({}),
  });
};

/**
 * Generate small calculation input (for faster tests)
 */
export const smallCalculationInputArbitrary = (): fc.Arbitrary<CalculationInputDto> => {
  return fc.record({
    periodId: fc.constant('period-test'),
    buildingId: fc.constant('building-test'),
    period: fc.constant({ month: 1, year: 2026 }),
    apartments: apartmentsArbitrary(2, 4),
    expenses: expensesArbitrary(1, 3),
    settings: fc.constant({
      decimalPlaces: 2,
      roundingStrategy: 'DISTRIBUTE' as const,
      reserveFundPercentage: 0,
      reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
      defaultVatPercentage: 24,
    }),
    previousBalances: fc.constant({}),
  });
};

/**
 * Generate expense with specific distribution method
 */
export const expenseWithMethodArbitrary = (
  method: DistributionMethod,
): fc.Arbitrary<ExpenseItemDto> => {
  return fc.record({
    id: fc.uuid().map((id) => `exp-${id}`),
    categoryId: fc.constant('cat-test'),
    categoryName: fc.constant('Test'),
    amount: fc.float({ min: 100, max: 1000, noNaN: true }).map((n) =>
      Math.round(n * 100) / 100,
    ),
    distributionMethod: fc.constant(method),
    description: fc.constant(`Test expense for ${method}`),
    includedApartmentIds: fc.constant(null),
    customDistribution: fc.constant(null),
  });
};

/**
 * Generate calculation input with specific rounding strategy
 */
export const inputWithRoundingStrategyArbitrary = (
  strategy: 'DISTRIBUTE' | 'FIRST_APARTMENT' | 'LARGEST_SHARE',
): fc.Arbitrary<CalculationInputDto> => {
  return smallCalculationInputArbitrary().map((input) => ({
    ...input,
    settings: {
      ...input.settings,
      roundingStrategy: strategy,
    },
  }));
};

/**
 * Generate difficult rounding case (odd amounts with many apartments)
 */
export const difficultRoundingCaseArbitrary = (): fc.Arbitrary<CalculationInputDto> => {
  return fc.record({
    periodId: fc.constant('period-rounding-test'),
    buildingId: fc.constant('building-test'),
    period: fc.constant({ month: 1, year: 2026 }),
    apartments: apartmentsArbitrary(5, 15), // Many apartments increase rounding complexity
    expenses: fc
      .array(
        fc.record({
          id: fc.uuid().map((id) => `exp-${id}`),
          categoryId: fc.constant('cat-test'),
          categoryName: fc.constant('Test'),
          amount: fc
            .integer({ min: 10, max: 100 })
            .map((n) => n + 0.33), // Odd amounts
          distributionMethod: fc.constant(DistributionMethod.GENERAL_SHARE),
          description: fc.constant('Rounding test expense'),
          includedApartmentIds: fc.constant(null),
          customDistribution: fc.constant(null),
        }),
        { minLength: 1, maxLength: 3 },
      ),
    settings: fc.record({
      decimalPlaces: fc.constant(2),
      roundingStrategy: fc.constantFrom(
        'DISTRIBUTE' as const,
        'FIRST_APARTMENT' as const,
        'LARGEST_SHARE' as const,
      ),
      reserveFundPercentage: fc.constant(0),
      reserveFundDistribution: fc.constant(DistributionMethod.GENERAL_SHARE),
      defaultVatPercentage: fc.constant(24),
    }),
    previousBalances: fc.constant({}),
  });
};
