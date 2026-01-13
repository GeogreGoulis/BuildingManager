import { CommonChargesCalculationService } from '../../src/common-charges/common-charges-calculation.service';
import { DistributionMethod } from '../../src/common-charges/dto/calculation-input.dto';

/**
 * Unit Tests for Reserve Fund
 * 
 * Tests reserve fund calculations:
 * - Contribution percentages
 * - Different distribution methods
 * - Withdrawals from reserve
 * - Combined contribution + withdrawal
 */

describe('CommonChargesCalculationService - Reserve Fund Tests', () => {
  let service: CommonChargesCalculationService;

  beforeEach(() => {
    service = new CommonChargesCalculationService();
  });

  describe('Reserve Fund Contributions', () => {
    /**
     * GIVEN: 10% reserve fund on total expenses
     * WHEN: Calculating charges
     * THEN: Each apartment pays additional 10% for reserve
     */
    it('should calculate reserve contributions as percentage of expenses', () => {
      const input = {
        periodId: 'period-reserve-1',
        buildingId: 'building-reserve-1',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-2',
            number: '2',
            floor: '2nd',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-1',
            categoryName: 'Cleaning',
            amount: 1000,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Monthly cleaning',
          },
        ],
        settings: {
          decimalPlaces: 2,
          roundingStrategy: 'DISTRIBUTE' as const,
          reserveFundPercentage: 10, // 10% reserve
          reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
          defaultVatPercentage: 24,
        },
        previousBalances: {},
      };

      const output = service.calculate(input);

      // Base expenses: €1000
      // Reserve: €1000 × 10% = €100
      // Total: €1100

      expect(output.totalExpenses).toBe(1000);
      expect(output.reserveFundSummary?.contributions).toBeCloseTo(100, 2);

      // Each apartment pays 50% of everything
      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1');
      const apt2 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '2');

      // apt-1: €500 (expenses) + €50 (reserve) = €550
      expect(apt1?.subtotal).toBeCloseTo(500, 2);
      expect(apt1?.reserveFund?.calculatedAmount).toBeCloseTo(50, 2);
      expect(apt1?.total).toBeCloseTo(550, 2);

      // apt-2: Same
      expect(apt2?.subtotal).toBeCloseTo(500, 2);
      expect(apt2?.reserveFund?.calculatedAmount).toBeCloseTo(50, 2);
      expect(apt2?.total).toBeCloseTo(550, 2);
    });

    it('should distribute reserve fund by EQUAL_SPLIT', () => {
      const input = {
        periodId: 'period-reserve-equal',
        buildingId: 'building-reserve-equal',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 60, // Different shares
            heatingSharePercentage: 60,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-2',
            number: '2',
            floor: '2nd',
            sharePercentage: 40,
            heatingSharePercentage: 40,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-1',
            categoryName: 'Test',
            amount: 1000,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Test expense',
          },
        ],
        settings: {
          decimalPlaces: 2,
          roundingStrategy: 'DISTRIBUTE' as const,
          reserveFundPercentage: 20, // 20% reserve
          reserveFundDistribution: DistributionMethod.EQUAL_SPLIT, // Equal split
          defaultVatPercentage: 24,
        },
        previousBalances: {},
      };

      const output = service.calculate(input);

      // Base expenses distributed by share:
      // apt-1: €600 (60%)
      // apt-2: €400 (40%)

      // Reserve: €1000 × 20% = €200
      // Equal split: €200 / 2 = €100 each

      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1');
      const apt2 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '2');

      // apt-1: €600 + €100 = €700
      expect(apt1?.subtotal).toBeCloseTo(600, 2);
      expect(apt1?.reserveFund?.calculatedAmount).toBeCloseTo(100, 2);
      expect(apt1?.total).toBeCloseTo(700, 2);

      // apt-2: €400 + €100 = €500
      expect(apt2?.subtotal).toBeCloseTo(400, 2);
      expect(apt2?.reserveFund?.calculatedAmount).toBeCloseTo(100, 2);
      expect(apt2?.total).toBeCloseTo(500, 2);
    });
  });

  describe('Reserve Fund Withdrawals', () => {
    /**
     * GIVEN: Reserve fund withdrawals
     * WHEN: Calculating charges
     * THEN: Withdrawals reduce total charges
     */
    it('should handle reserve fund withdrawals', () => {
      const input = {
        periodId: 'period-reserve-withdrawal',
        buildingId: 'building-reserve-withdrawal',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-2',
            number: '2',
            floor: '2nd',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-1',
            categoryName: 'Test',
            amount: 1000,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Test expense',
          },
        ],
        reserveFundOperations: [
          {
            type: 'WITHDRAWAL' as const,
            amount: 200,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Using reserve for repairs',
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

      // Base charges: €1000 (€500 each)
      // Withdrawal: €200 (€100 each)
      // Net: €800 (€400 each)

      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1');
      const apt2 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '2');

      expect(apt1?.subtotal).toBeCloseTo(500, 2);
      expect(apt1?.reserveFund?.calculatedAmount).toBeCloseTo(100, 2);
      expect(apt1?.total).toBeCloseTo(400, 2);

      expect(apt2?.subtotal).toBeCloseTo(500, 2);
      expect(apt2?.reserveFund?.calculatedAmount).toBeCloseTo(100, 2);
      expect(apt2?.total).toBeCloseTo(400, 2);

      // Total withdrawal should be €200
      expect(output.reserveFundSummary?.withdrawals).toBeCloseTo(200, 2);
    });

    it('should handle multiple withdrawals', () => {
      const input = {
        periodId: 'period-multi-withdrawal',
        buildingId: 'building-multi-withdrawal',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-2',
            number: '2',
            floor: '2nd',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-1',
            categoryName: 'Test',
            amount: 1000,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Test expense',
          },
        ],
        reserveFundOperations: [
          {
            type: 'WITHDRAWAL' as const,
            amount: 100,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'First withdrawal',
          },
          {
            type: 'WITHDRAWAL' as const,
            amount: 50,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Second withdrawal',
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

      // Base: €1000 (€500 each)
      // Total withdrawals: €150 (€75 each)
      // Net: €850 (€425 each)

      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1');

      expect(apt1?.reserveFund?.calculatedAmount).toBeCloseTo(75, 2);
      expect(apt1?.total).toBeCloseTo(425, 2);
    });
  });

  describe('Combined Contribution and Withdrawal', () => {
    /**
     * GIVEN: Both reserve contribution and withdrawal
     * WHEN: Calculating charges
     * THEN: Net reserve = contribution - withdrawal
     */
    it('should handle both contribution and withdrawal', () => {
      const input = {
        periodId: 'period-both',
        buildingId: 'building-both',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-2',
            number: '2',
            floor: '2nd',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-1',
            categoryName: 'Test',
            amount: 1000,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Test expense',
          },
        ],
        reserveFundOperations: [
          {
            type: 'WITHDRAWAL' as const,
            amount: 300,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Use reserve',
          },
        ],
        settings: {
          decimalPlaces: 2,
          roundingStrategy: 'DISTRIBUTE' as const,
          reserveFundPercentage: 10, // 10% contribution
          reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
          defaultVatPercentage: 24,
        },
        previousBalances: {},
      };

      const output = service.calculate(input);

      // Base: €1000 (€500 each)
      // Contribution: €100 (€50 each)
      // Withdrawal: €300 (€150 each)
      // Net reserve: -€200 (refund €100 each)

      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1');

      expect(apt1?.subtotal).toBeCloseTo(500, 2);
      // Net reserve effect: +€50 (contribution) - €150 (withdrawal) = -€100
      // This test expects combined contribution + withdrawal, checking final total

      // Total: €500 + €50 - €150 = €400
      expect(apt1?.total).toBeCloseTo(400, 2);
    });
  });

  describe('Zero Reserve Fund', () => {
    /**
     * GIVEN: No reserve fund configured
     * WHEN: Calculating charges
     * THEN: No reserve charges
     */
    it('should skip reserve when percentage is zero', () => {
      const input = {
        periodId: 'period-no-reserve',
        buildingId: 'building-no-reserve',
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
            amount: 1000,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Test',
          },
        ],
        settings: {
          decimalPlaces: 2,
          roundingStrategy: 'DISTRIBUTE' as const,
          reserveFundPercentage: 0, // No reserve
          reserveFundDistribution: DistributionMethod.GENERAL_SHARE,
          defaultVatPercentage: 24,
        },
        previousBalances: {},
      };

      const output = service.calculate(input);

      // No reserve fund
      expect(output.reserveFundSummary).toBeUndefined();

      const apt1 = output.apartmentCharges[0];
      expect(apt1.reserveFund).toBeUndefined();

      // Total = subtotal (no reserve)
      expect(apt1.total).toBe(apt1.subtotal);
    });
  });

  describe('Reserve Fund Distribution Methods', () => {
    it('should support CUSTOM distribution for reserve', () => {
      const input = {
        periodId: 'period-custom-reserve',
        buildingId: 'building-custom-reserve',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-2',
            number: '2',
            floor: '2nd',
            sharePercentage: 50,
            heatingSharePercentage: 50,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-1',
            categoryName: 'Test',
            amount: 1000,
            distributionMethod: DistributionMethod.GENERAL_SHARE,
            description: 'Test',
          },
        ],
        settings: {
          decimalPlaces: 2,
          roundingStrategy: 'DISTRIBUTE' as const,
          reserveFundPercentage: 10,
          reserveFundDistribution: DistributionMethod.CUSTOM,
          defaultVatPercentage: 24,
        },
        customReserveDistribution: {
          'apt-1': 30, // apt-1 pays 30%
          'apt-2': 70, // apt-2 pays 70%
        },
        previousBalances: {},
      };

      const output = service.calculate(input);

      // Reserve: €100
      // apt-1: €100 × 30% = €30
      // apt-2: €100 × 70% = €70

      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1');
      const apt2 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '2');

      expect(apt1?.reserveFund?.calculatedAmount).toBeCloseTo(30, 2);
      expect(apt2?.reserveFund?.calculatedAmount).toBeCloseTo(70, 2);
    });
  });
});
