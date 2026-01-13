import * as fc from 'fast-check';
import { CommonChargesCalculationService } from '../../src/common-charges/common-charges-calculation.service';
import {
  calculationInputArbitrary,
  smallCalculationInputArbitrary,
  difficultRoundingCaseArbitrary,
  inputWithRoundingStrategyArbitrary,
} from '../generators/calculation-input.generators';
import { CalculationInputDto, DistributionMethod } from '../../src/common-charges/dto/calculation-input.dto';

/**
 * Property-Based Tests for Common Charges Calculation
 * 
 * These tests verify mathematical properties that MUST hold
 * for ANY valid input, regardless of specific values.
 * 
 * Properties tested:
 * 1. Conservation of money (sum of charges = sum of expenses)
 * 2. Non-negativity (no negative charges for standard cases)
 * 3. Determinism (same input → same output)
 * 4. Distribution correctness (shares sum to 100%)
 * 5. Rounding precision (variance within tolerance)
 */

describe('CommonChargesCalculationService - Property-Based Tests', () => {
  let service: CommonChargesCalculationService;

  beforeEach(() => {
    service = new CommonChargesCalculationService();
  });

  /**
   * PROPERTY 1: Conservation of Money
   * 
   * The sum of all apartment charges MUST equal the sum of all expenses.
   * No money is created or lost in the system.
   * 
   * This is the MOST CRITICAL property.
   */
  describe('Property: Conservation of Money', () => {
    it('should distribute exactly the total expense amount (no money created/lost)', () => {
      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (input: CalculationInputDto) => {
          const output = service.calculate(input);

          const totalExpenses = input.expenses.reduce(
            (sum: number, exp: any) => sum + exp.amount,
            0,
          );
          const totalDistributed = output.apartmentCharges.reduce(
            (sum: number, charge: any) => sum + charge.subtotal,
            0,
          );

          // Allow tiny floating point difference (epsilon)
          const variance = Math.abs(totalExpenses - totalDistributed);
          expect(variance).toBeLessThan(0.01);

          // Also check the output's own variance tracking
          expect(output.distributionVariance).toBeLessThan(0.01);
        }),
        { numRuns: 100 },
      );
    });

    it('should maintain conservation with difficult rounding cases', () => {
      fc.assert(
        fc.property(difficultRoundingCaseArbitrary(), (input: CalculationInputDto) => {
          const output = service.calculate(input);

          const totalExpenses = input.expenses.reduce(
            (sum: number, exp: any) => sum + exp.amount,
            0,
          );
          const totalDistributed = output.apartmentCharges.reduce(
            (sum: number, charge: any) => sum + charge.subtotal,
            0,
          );

          expect(Math.abs(totalExpenses - totalDistributed)).toBeLessThan(0.01);
        }),
        { numRuns: 50 },
      );
    });
  });

  /**
   * PROPERTY 2: Non-Negativity
   * 
   * No apartment should have negative charges (unless previous balance is negative).
   * Standard expenses always result in positive or zero charges.
   */
  describe('Property: Non-Negativity', () => {
    it('should never produce negative charges for positive expenses', () => {
      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (input: CalculationInputDto) => {
          const output = service.calculate(input);

          output.apartmentCharges.forEach((charge: any) => {
            // Subtotal (current period) should be non-negative
            expect(charge.subtotal).toBeGreaterThanOrEqual(0);

            // Individual expense charges should be non-negative
            charge.expenses.forEach((exp: any) => {
              expect(exp.finalAmount).toBeGreaterThanOrEqual(0);
            });
          });
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * PROPERTY 3: Determinism
   * 
   * The same input MUST produce the same output every time.
   * This is critical for reproducibility and auditability.
   */
  describe('Property: Determinism', () => {
    it('should produce identical results for identical inputs', () => {
      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (input: CalculationInputDto) => {
          const output1 = service.calculate(input);
          const output2 = service.calculate(input);

          // Same input hash
          expect(output1.metadata.inputHash).toBe(output2.metadata.inputHash);

          // Same totals
          expect(output1.totalDistributed).toBe(output2.totalDistributed);

          // Same apartment charges
          output1.apartmentCharges.forEach((charge1: any, index: number) => {
            const charge2 = output2.apartmentCharges[index];
            expect(charge1.total).toBe(charge2.total);
            expect(charge1.subtotal).toBe(charge2.subtotal);
          });
        }),
        { numRuns: 50 },
      );
    });

    it('should produce same hash for same inputs across multiple runs', () => {
      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (input: CalculationInputDto) => {
          const hashes = Array.from({ length: 5 }, () =>
            service.calculate(input).metadata.inputHash,
          );

          // All hashes should be identical
          const uniqueHashes = new Set(hashes);
          expect(uniqueHashes.size).toBe(1);
        }),
        { numRuns: 20 },
      );
    });
  });

  /**
   * PROPERTY 4: Share Percentage Invariant
   * 
   * If all apartments have equal shares, they should get equal charges.
   */
  describe('Property: Equal Shares → Equal Charges', () => {
    it('should distribute equally when all apartments have equal shares', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }),
          fc.float({ min: 100, max: 1000 }),
          (apartmentCount, expenseAmount) => {
            const equalShare = 100 / apartmentCount;

            const input = {
              periodId: 'test-period',
              buildingId: 'test-building',
              period: { month: 1, year: 2026 },
              apartments: Array.from({ length: apartmentCount }, (_, i) => ({
                id: `apt-${i}`,
                number: `${i + 1}`,
                floor: '1st',
                sharePercentage: equalShare,
                heatingSharePercentage: equalShare,
                isOccupied: true,
                isExcluded: false,
              })),
              expenses: [
                {
                  id: 'exp-1',
                  categoryId: 'cat-1',
                  categoryName: 'Test',
                  amount: Math.round(expenseAmount * 100) / 100,
                  distributionMethod: DistributionMethod.GENERAL_SHARE,
                  description: 'Test expense',
                },
              ],
              settings: {
                decimalPlaces: 2,
                roundingStrategy: 'DISTRIBUTE' as const,
                reserveFundPercentage: 0,
                reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
                defaultVatPercentage: 24,
              },
              previousBalances: {},
            };

            const output = service.calculate(input);

            // Calculate expected charge per apartment
            const expectedPerApartment = expenseAmount / apartmentCount;

            // All apartments should have approximately equal charges
            output.apartmentCharges.forEach((charge: any) => {
              expect(charge.subtotal).toBeCloseTo(expectedPerApartment, 1);
            });

            // Verify total is still conserved
            const total = output.apartmentCharges.reduce(
              (sum: number, c: any) => sum + c.subtotal,
              0,
            );
            expect(Math.abs(total - expenseAmount)).toBeLessThan(0.01);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * PROPERTY 5: Zero Input → Zero Output
   * 
   * If total expenses are zero, all charges should be zero.
   */
  describe('Property: Zero Expenses → Zero Charges', () => {
    it('should produce minimal charges with minimal expenses', () => {
      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (input: CalculationInputDto) => {
          // Use very small expenses (€0.01 each)
          const minimalInput: CalculationInputDto = {
            ...input,
            expenses: input.expenses.map((exp: any) => ({
              ...exp,
              amount: 0.01,
            })),
          };

          const output = service.calculate(minimalInput);

          // Total should equal sum of minimal expenses
          const totalExpenses = minimalInput.expenses.length * 0.01;
          expect(Math.abs(output.totalDistributed - totalExpenses)).toBeLessThan(0.01);

          // All charges should be very small
          output.apartmentCharges.forEach((charge: any) => {
            expect(charge.subtotal).toBeGreaterThanOrEqual(0);
            expect(charge.subtotal).toBeLessThan(1); // Less than €1
          });
        }),
        { numRuns: 20 },
      );
    });
  });

  /**
   * PROPERTY 6: Rounding Strategy Independence
   * 
   * Different rounding strategies should still conserve total amount.
   */
  describe('Property: Rounding Strategy Independence', () => {
    it('should conserve money regardless of rounding strategy', () => {
      const strategies = ['DISTRIBUTE', 'FIRST_APARTMENT', 'LARGEST_SHARE'] as const;

      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (baseInput: CalculationInputDto) => {
          const totalExpenses = baseInput.expenses.reduce(
            (sum: number, exp: any) => sum + exp.amount,
            0,
          );

          strategies.forEach((strategy: any) => {
            const input: CalculationInputDto = {
              ...baseInput,
              settings: {
                ...baseInput.settings,
                roundingStrategy: strategy,
              },
            };

            const output = service.calculate(input);
            const totalDistributed = output.apartmentCharges.reduce(
              (sum: number, charge: any) => sum + charge.subtotal,
              0,
            );

            expect(Math.abs(totalExpenses - totalDistributed)).toBeLessThan(0.01);
          });
        }),
        { numRuns: 30 },
      );
    });
  });

  /**
   * PROPERTY 7: Excluded Apartments
   * 
   * Excluded apartments should not receive charges.
   */
  describe('Property: Excluded Apartments', () => {
    it('should not charge excluded apartments', () => {
      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (baseInput: CalculationInputDto) => {
          // Exclude first apartment
          const input: CalculationInputDto = {
            ...baseInput,
            apartments: baseInput.apartments.map((apt: any, index: number) => ({
              ...apt,
              isExcluded: index === 0,
            })),
          };

          const output = service.calculate(input);

          // First apartment should have zero charges (if excluded)
          if (input.apartments.length > 0 && input.apartments[0].isExcluded) {
            const excludedCharge = output.apartmentCharges.find(
              (c: any) => c.apartmentId === input.apartments[0].id,
            );

            // Excluded apartments are filtered out, so shouldn't appear
            expect(excludedCharge).toBeUndefined();
          }
        }),
        { numRuns: 30 },
      );
    });
  });

  /**
   * PROPERTY 8: Category Variance
   * 
   * Each category's distributed amount should equal the category's total.
   */
  describe('Property: Category Distribution Correctness', () => {
    it('should distribute each category exactly', () => {
      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (input: CalculationInputDto) => {
          const output = service.calculate(input);

          output.categorySummaries.forEach((summary: any) => {
            // Distributed amount should equal total amount for this category
            expect(Math.abs(summary.distributionVariance)).toBeLessThan(0.01);
          });
        }),
        { numRuns: 100 },
      );
    });
  });

  /**
   * PROPERTY 9: Idempotence
   * 
   * Calculating twice should not change the result.
   */
  describe('Property: Idempotence', () => {
    it('should be idempotent (multiple calculations produce same result)', () => {
      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (input: CalculationInputDto) => {
          const results = Array.from({ length: 3 }, () => service.calculate(input));

          // All results should be identical
          for (let i = 1; i < results.length; i++) {
            expect(results[i].totalDistributed).toBe(results[0].totalDistributed);
            expect(results[i].metadata.inputHash).toBe(results[0].metadata.inputHash);

            results[i].apartmentCharges.forEach((charge: any, j: number) => {
              expect(charge.total).toBe(results[0].apartmentCharges[j].total);
            });
          }
        }),
        { numRuns: 30 },
      );
    });
  });

  /**
   * PROPERTY 10: Precision Invariant
   * 
   * Rounding adjustments should be minimal and bounded.
   */
  describe('Property: Rounding Adjustments Are Minimal', () => {
    it('should have total rounding adjustments close to zero', () => {
      fc.assert(
        fc.property(smallCalculationInputArbitrary(), (input: CalculationInputDto) => {
          const output = service.calculate(input);

          // Total rounding adjustments should be very small
          // (ideally zero, but can be small due to distribution)
          expect(Math.abs(output.totalRoundingAdjustments)).toBeLessThan(1.0);

          // Individual adjustments should be tiny
          output.apartmentCharges.forEach((charge: any) => {
            charge.expenses.forEach((exp: any) => {
              expect(Math.abs(exp.roundingAdjustment)).toBeLessThan(0.1);
            });
          });
        }),
        { numRuns: 50 },
      );
    });
  });
});
