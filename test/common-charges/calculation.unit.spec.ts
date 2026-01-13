import { CommonChargesCalculationService } from '../../src/common-charges/common-charges-calculation.service';
import { DistributionMethod } from '../../src/common-charges/dto/calculation-input.dto';
import {
  example1_SimpleGeneralExpenses,
  example2_ElevatorCharges,
  example4_RoundingChallenges,
  example5_ExcludedApartment,
} from '../../src/common-charges/examples/calculation-examples';

/**
 * Unit Tests for Common Charges Calculation
 * 
 * These tests verify specific scenarios with known inputs and expected outputs.
 * They serve as:
 * - Regression tests (golden datasets)
 * - Documentation of expected behavior
 * - Edge case coverage
 */

describe('CommonChargesCalculationService - Unit Tests', () => {
  let service: CommonChargesCalculationService;

  beforeEach(() => {
    service = new CommonChargesCalculationService();
  });

  describe('General Expenses Distribution', () => {
    /**
     * GIVEN: 4 apartments with different share percentages
     * WHEN: Distributing €700 in expenses
     * THEN: Each apartment receives charges proportional to their share
     */
    it('should distribute general expenses correctly by share percentage', () => {
      const output = service.calculate(example1_SimpleGeneralExpenses);

      // Total should match input
      expect(output.totalExpenses).toBe(700.00);
      expect(output.totalDistributed).toBeCloseTo(700.00, 2);

      // Verify individual apartment charges
      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === 'A1');
      const apt2 = output.apartmentCharges.find((c: any) => c.apartmentNumber === 'A2');
      const apt3 = output.apartmentCharges.find((c: any) => c.apartmentNumber === 'B1');
      const apt4 = output.apartmentCharges.find((c: any) => c.apartmentNumber === 'B2');

      // A1 and A2 (25% each) should get €175
      expect(apt1?.subtotal).toBeCloseTo(175.00, 2);
      expect(apt2?.subtotal).toBeCloseTo(175.00, 2);

      // B1 (30%) should get €210
      expect(apt3?.subtotal).toBeCloseTo(210.00, 2);

      // B2 (20%) should get €140
      expect(apt4?.subtotal).toBeCloseTo(140.00, 2);

      // Conservation check
      const total = [apt1, apt2, apt3, apt4].reduce(
        (sum, apt) => sum + (apt?.subtotal || 0),
        0,
      );
      expect(total).toBeCloseTo(700.00, 2);
    });

    it('should create correct expense breakdowns per apartment', () => {
      const output = service.calculate(example1_SimpleGeneralExpenses);

      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === 'A1');

      expect(apt1?.expenses).toHaveLength(3);

      // Verify cleaning expense (€200 × 25% = €50)
      const cleaningExpense = apt1?.expenses.find(
        (e: any) => e.categoryName === 'Καθαριότητα',
      );
      expect(cleaningExpense?.finalAmount).toBeCloseTo(50.00, 2);

      // Verify electricity (€150 × 25% = €37.50)
      const electricityExpense = apt1?.expenses.find(
        (e: any) => e.categoryName === 'Ηλεκτρικό Ρεύμα',
      );
      expect(electricityExpense?.finalAmount).toBeCloseTo(37.50, 2);

      // Verify maintenance (€350 × 25% = €87.50)
      const maintenanceExpense = apt1?.expenses.find(
        (e: any) => e.categoryName === 'Συντήρηση',
      );
      expect(maintenanceExpense?.finalAmount).toBeCloseTo(87.50, 2);
    });
  });

  describe('Special Categories (Elevator)', () => {
    /**
     * GIVEN: 6 apartments, only 4 use elevator
     * WHEN: Distributing general + elevator expenses
     * THEN: Ground floor apartments don't pay for elevator
     */
    it('should exclude ground floor apartments from elevator charges', () => {
      const output = service.calculate(example2_ElevatorCharges);

      // Ground floor apartments
      const g1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === 'G1');
      const g2 = output.apartmentCharges.find((c: any) => c.apartmentNumber === 'G2');

      // Should only have cleaning expense (no elevator)
      expect(g1?.expenses).toHaveLength(1);
      expect(g2?.expenses).toHaveLength(1);

      expect(g1?.expenses[0].categoryName).toBe('Καθαριότητα');
      expect(g2?.expenses[0].categoryName).toBe('Καθαριότητα');

      // Upper floor apartments
      const apt1A = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1A');
      const apt2A = output.apartmentCharges.find((c: any) => c.apartmentNumber === '2A');

      // Should have both cleaning and elevator
      expect(apt1A?.expenses).toHaveLength(2);
      expect(apt2A?.expenses).toHaveLength(2);

      const elevator1A = apt1A?.expenses.find(
        (e: any) => e.categoryName === 'Ανελκυστήρας',
      );
      expect(elevator1A).toBeDefined();
      expect(elevator1A?.finalAmount).toBeGreaterThan(0);
    });

    it('should distribute elevator cost only among upper floors', () => {
      const output = service.calculate(example2_ElevatorCharges);

      // Get upper floor apartments
      const upperFloors = output.apartmentCharges.filter((c: any) =>
        ['1A', '2A', '3A', '3B'].includes(c.apartmentNumber),
      );

      // Sum elevator charges
      const totalElevatorCharged = upperFloors.reduce((sum: any, apt: any) => {
        const elevatorExpense = apt.expenses.find(
          (e: any) => e.categoryName === 'Ανελκυστήρας',
        );
        return sum + (elevatorExpense?.finalAmount || 0);
      }, 0);

      // Should equal total elevator expense (€200)
      expect(totalElevatorCharged).toBeCloseTo(200.00, 2);
    });
  });

  describe('Rounding and Adjustments', () => {
    /**
     * GIVEN: Small amount (€10) split among 3 apartments with fractional shares
     * WHEN: Rounding to 2 decimal places
     * THEN: Total should still be exactly €10 (no cent lost)
     */
    it('should handle rounding challenges without losing cents', () => {
      const output = service.calculate(example4_RoundingChallenges);

      // Total should be exactly €10
      expect(output.totalExpenses).toBe(10.00);
      expect(output.totalDistributed).toBeCloseTo(10.00, 2);

      // Variance should be minimal
      expect(Math.abs(output.distributionVariance)).toBeLessThan(0.01);

      // Sum of apartment charges
      const total = output.apartmentCharges.reduce(
        (sum: any, c: any) => sum + c.subtotal,
        0,
      );
      expect(total).toBeCloseTo(10.00, 2);
    });

    it('should apply rounding adjustments correctly', () => {
      const output = service.calculate(example4_RoundingChallenges);

      // At least one apartment should have rounding adjustment
      const hasAdjustment = output.apartmentCharges.some(
        (charge: any) => charge.totalRoundingAdjustments !== 0,
      );

      // With 33.33% shares, we expect adjustments
      expect(hasAdjustment).toBe(true);

      // Total adjustments should be small
      expect(Math.abs(output.totalRoundingAdjustments)).toBeLessThan(0.1);
    });
  });

  describe('Excluded Apartments', () => {
    /**
     * GIVEN: 2 apartments, 1 excluded
     * WHEN: Calculating charges
     * THEN: Excluded apartment gets nothing, other gets 100%
     */
    it('should not charge excluded apartments', () => {
      const output = service.calculate(example5_ExcludedApartment);

      // Should only have 1 apartment charged (apt-1)
      expect(output.apartmentCharges).toHaveLength(1);

      const apt1 = output.apartmentCharges[0];
      expect(apt1.apartmentNumber).toBe('1');

      // Should get 100% of expenses (€100)
      expect(apt1.subtotal).toBeCloseTo(100.00, 2);

      // Excluded apartment should not appear
      const excluded = output.apartmentCharges.find(
        (c: any) => c.apartmentNumber === '2',
      );
      expect(excluded).toBeUndefined();
    });
  });

  describe('Category Summaries', () => {
    it('should generate accurate category summaries', () => {
      const output = service.calculate(example1_SimpleGeneralExpenses);

      expect(output.categorySummaries).toHaveLength(3);

      // Cleaning category
      const cleaning = output.categorySummaries.find(
        (s: any) => s.categoryName === 'Καθαριότητα',
      );
      expect(cleaning?.totalAmount).toBe(200.00);
      expect(cleaning?.totalDistributed).toBeCloseTo(200.00, 2);
      expect(cleaning?.apartmentsCharged).toBe(4);

      // Variance should be zero
      expect(Math.abs(cleaning?.distributionVariance || 0)).toBeLessThan(0.01);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single apartment building', () => {
      const input = {
        periodId: 'period-single',
        buildingId: 'building-single',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 100,
            heatingSharePercentage: 100,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-1',
            categoryName: 'Test',
            amount: 500,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Test',
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

      // Single apartment gets everything
      expect(output.apartmentCharges).toHaveLength(1);
      expect(output.apartmentCharges[0].subtotal).toBe(500);

      // No rounding issues
      expect(output.distributionVariance).toBe(0);
    });

    it('should handle large number of apartments', () => {
      const apartmentCount = 100;
      const totalExpense = 10000;

      const input = {
        periodId: 'period-large',
        buildingId: 'building-large',
        period: { month: 1, year: 2026 },
        apartments: Array.from({ length: apartmentCount }, (_, i) => ({
          id: `apt-${i}`,
          number: `${i + 1}`,
          floor: `${Math.floor(i / 10) + 1}th`,
          sharePercentage: 100 / apartmentCount,
          heatingSharePercentage: 100 / apartmentCount,
          isOccupied: true,
          isExcluded: false,
        })),
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-1',
            categoryName: 'Test',
            amount: totalExpense,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Large building expense',
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

      // Should complete without errors
      expect(output.apartmentCharges).toHaveLength(apartmentCount);

      // Total should be conserved
      const total = output.apartmentCharges.reduce(
        (sum: any, c: any) => sum + c.subtotal,
        0,
      );
      expect(Math.abs(total - totalExpense)).toBeLessThan(0.01);
    });
  });

  describe('Metadata and Auditability', () => {
    it('should generate consistent input hash', () => {
      const output1 = service.calculate(example1_SimpleGeneralExpenses);
      const output2 = service.calculate(example1_SimpleGeneralExpenses);

      expect(output1.metadata.inputHash).toBe(output2.metadata.inputHash);
    });

    it('should include calculation version in metadata', () => {
      const output = service.calculate(example1_SimpleGeneralExpenses);

      expect(output.metadata.calculationVersion).toBeDefined();
      expect(output.metadata.calculationVersion).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should include all required metadata fields', () => {
      const output = service.calculate(example1_SimpleGeneralExpenses);

      expect(output.metadata.calculatedAt).toBeInstanceOf(Date);
      expect(output.metadata.periodId).toBeDefined();
      expect(output.metadata.buildingId).toBeDefined();
      expect(output.metadata.period).toEqual({ month: 1, year: 2026 });
      expect(output.metadata.settings).toBeDefined();
    });
  });
});
