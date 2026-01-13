import { CommonChargesCalculationService } from '../../src/common-charges/common-charges-calculation.service';
import { DistributionMethod } from '../../src/common-charges/dto/calculation-input.dto';
import { example3_HeatingConsumption } from '../../src/common-charges/examples/calculation-examples';

/**
 * Unit Tests for Heating Calculation
 * 
 * Tests the CONSUMPTION_BASED distribution method:
 * - Fixed cost component (30% distributed by heating share)
 * - Variable cost component (70% distributed by consumption)
 * - Zero consumption scenarios
 * - Missing consumption data
 */

describe('CommonChargesCalculationService - Heating Tests', () => {
  let service: CommonChargesCalculationService;

  beforeEach(() => {
    service = new CommonChargesCalculationService();
  });

  describe('Consumption-Based Distribution', () => {
    /**
     * GIVEN: 4 apartments with actual consumption data
     * WHEN: Distributing €2000 in heating costs
     * THEN: 30% fixed by heating share + 70% by consumption
     */
    it('should distribute heating costs with 30/70 split', () => {
      const output = service.calculate(example3_HeatingConsumption);

      // Total should match
      expect(output.totalExpenses).toBe(2000.00);
      expect(output.totalDistributed).toBeCloseTo(2000.00, 2);

      // Get heating category
      const heating = output.categorySummaries.find(
        (s: any) => s.categoryName === 'Θέρμανση',
      );

      expect(heating?.totalAmount).toBe(2000.00);
      expect(heating?.totalDistributed).toBeCloseTo(2000.00, 2);
    });

    it('should calculate fixed component (30%) by heating share', () => {
      const output = service.calculate(example3_HeatingConsumption);

      // Fixed component = €2000 × 30% = €600
      // Each apartment has 25% heating share
      // Expected fixed charge per apartment = €600 × 25% = €150

      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1A');
      const heatingExpense = apt1?.expenses.find(
        (e: any) => e.categoryName === 'Θέρμανση',
      );

      // We can't directly check the breakdown, but we can verify
      // the total includes both components
      expect(heatingExpense).toBeDefined();
      expect(heatingExpense?.finalAmount).toBeGreaterThan(150); // More than just fixed
    });

    it('should distribute based on actual consumption', () => {
      const output = service.calculate(example3_HeatingConsumption);

      // Variable component = €2000 × 70% = €1400
      // Total consumption = 200 + 300 + 250 + 150 = 900 kWh
      // 1A: 200/900 × €1400 = €311.11
      // 2A: 300/900 × €1400 = €466.67
      // 3A: 250/900 × €1400 = €388.89
      // 3B: 150/900 × €1400 = €233.33

      // Plus fixed component of €150 each
      const apt1A = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1A');
      const apt2A = output.apartmentCharges.find((c: any) => c.apartmentNumber === '2A');
      const apt3A = output.apartmentCharges.find((c: any) => c.apartmentNumber === '3A');
      const apt3B = output.apartmentCharges.find((c: any) => c.apartmentNumber === '3B');

      // 1A: €150 + €311.11 ≈ €461.11
      expect(apt1A?.subtotal).toBeCloseTo(461.11, 1);

      // 2A: €150 + €466.67 ≈ €616.67
      expect(apt2A?.subtotal).toBeCloseTo(616.67, 1);

      // 3A: €150 + €388.89 ≈ €538.89
      expect(apt3A?.subtotal).toBeCloseTo(538.89, 1);

      // 3B: €150 + €233.33 ≈ €383.33
      expect(apt3B?.subtotal).toBeCloseTo(383.33, 1);
    });

    it('should conserve total heating amount', () => {
      const output = service.calculate(example3_HeatingConsumption);

      const totalHeatingCharged = output.apartmentCharges.reduce((sum: any, charge: any) => {
        const heatingExpense = charge.expenses.find(
          (e: any) => e.categoryName === 'Θέρμανση',
        );
        return sum + (heatingExpense?.finalAmount || 0);
      }, 0);

      expect(totalHeatingCharged).toBeCloseTo(2000.00, 2);
    });
  });

  describe('Zero Consumption', () => {
    /**
     * GIVEN: Some apartments with zero consumption
     * WHEN: Calculating heating charges
     * THEN: They still pay fixed component
     */
    it('should charge fixed component even with zero consumption', () => {
      const input = {
        periodId: 'period-zero-heat',
        buildingId: 'building-zero-heat',
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
            categoryId: 'cat-heating',
            categoryName: 'Heating',
            amount: 1000,
            distributionMethod: DistributionMethod.CONSUMPTION_BASED,
            description: 'Heating',
          },
        ],
        heatingConsumption: {
          'apt-1': 100, // Only apt-1 has consumption
          'apt-2': 0,   // apt-2 has zero
        },
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

      // Fixed component = €1000 × 30% = €300
      // Each apartment gets €150 fixed (50% share)

      // Variable component = €1000 × 70% = €700
      // apt-1 gets all €700 (100% of consumption)

      const apt1 = output.apartmentCharges.find((c) => c.apartmentNumber === '1');
      const apt2 = output.apartmentCharges.find((c) => c.apartmentNumber === '2');

      // apt-1: €150 + €700 = €850
      expect(apt1?.subtotal).toBeCloseTo(850, 2);

      // apt-2: €150 + €0 = €150
      expect(apt2?.subtotal).toBeCloseTo(150, 2);
    });
  });

  describe('Missing Consumption Data', () => {
    /**
     * GIVEN: No consumption data provided
     * WHEN: Using CONSUMPTION_BASED method
     * THEN: Should fallback to heating share (100% fixed)
     */
    it('should fallback to heating share when no consumption data', () => {
      const input = {
        periodId: 'period-no-consumption',
        buildingId: 'building-no-consumption',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 50,
            heatingSharePercentage: 60,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-2',
            number: '2',
            floor: '2nd',
            sharePercentage: 50,
            heatingSharePercentage: 40,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-heating',
            categoryName: 'Heating',
            amount: 1000,
            distributionMethod: DistributionMethod.CONSUMPTION_BASED,
            description: 'Heating without consumption data',
          },
        ],
        // No heatingConsumption provided
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

      // Should distribute by heating share
      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1');
      const apt2 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '2');

      // apt-1: €1000 × 60% = €600
      expect(apt1?.subtotal).toBeCloseTo(600, 2);

      // apt-2: €1000 × 40% = €400
      expect(apt2?.subtotal).toBeCloseTo(400, 2);
    });

    it('should handle partial consumption data', () => {
      const input = {
        periodId: 'period-partial-consumption',
        buildingId: 'building-partial-consumption',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 33.33,
            heatingSharePercentage: 33.33,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-2',
            number: '2',
            floor: '2nd',
            sharePercentage: 33.33,
            heatingSharePercentage: 33.33,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-3',
            number: '3',
            floor: '3rd',
            sharePercentage: 33.34,
            heatingSharePercentage: 33.34,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-heating',
            categoryName: 'Heating',
            amount: 1500,
            distributionMethod: DistributionMethod.CONSUMPTION_BASED,
            description: 'Heating',
          },
        ],
        heatingConsumption: {
          'apt-1': 100,
          // apt-2 missing
          'apt-3': 200,
        },
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

      // Fixed: €1500 × 30% = €450 (each ~€150)
      // Variable: €1500 × 70% = €1050
      // Total consumption: 100 + 200 = 300 (apt-2 excluded from variable)
      // apt-1 variable: 100/300 × €1050 = €350
      // apt-3 variable: 200/300 × €1050 = €700
      // apt-2 variable: €0 (no data)

      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1');
      const apt2 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '2');
      const apt3 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '3');

      // apt-1: ~€150 + €350 = ~€500
      expect(apt1?.subtotal).toBeCloseTo(500, 1);

      // apt-2: ~€150 + €0 = ~€150
      expect(apt2?.subtotal).toBeCloseTo(150, 1);

      // apt-3: ~€150 + €700 = ~€850
      expect(apt3?.subtotal).toBeCloseTo(850, 1);
    });
  });

  describe('Heating Share Distribution', () => {
    /**
     * GIVEN: Apartments with different heating shares
     * WHEN: Using HEATING_SHARE method
     * THEN: Distribute proportionally to heating share
     */
    it('should distribute by heating share percentage', () => {
      const input = {
        periodId: 'period-heating-share',
        buildingId: 'building-heating-share',
        period: { month: 1, year: 2026 },
        apartments: [
          {
            id: 'apt-1',
            number: '1',
            floor: '1st',
            sharePercentage: 50,
            heatingSharePercentage: 30,
            isOccupied: true,
            isExcluded: false,
          },
          {
            id: 'apt-2',
            number: '2',
            floor: '2nd',
            sharePercentage: 50,
            heatingSharePercentage: 70,
            isOccupied: true,
            isExcluded: false,
          },
        ],
        expenses: [
          {
            id: 'exp-1',
            categoryId: 'cat-heating',
            categoryName: 'Heating',
            amount: 1000,
            distributionMethod: DistributionMethod.HEATING_SHARE,
            description: 'Heating by share',
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

      const apt1 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '1');
      const apt2 = output.apartmentCharges.find((c: any) => c.apartmentNumber === '2');

      // apt-1: €1000 × 30% = €300
      expect(apt1?.subtotal).toBeCloseTo(300, 2);

      // apt-2: €1000 × 70% = €700
      expect(apt2?.subtotal).toBeCloseTo(700, 2);
    });
  });
});
