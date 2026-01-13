/**
 * Jest setup file
 * 
 * Global test configuration and utilities
 */

// Set precision for floating point comparisons
expect.extend({
  toBeWithinEpsilon(received: number, expected: number, epsilon = 0.01) {
    const pass = Math.abs(received - expected) < epsilon;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within ${epsilon} of ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within ${epsilon} of ${expected} (diff: ${Math.abs(received - expected)})`,
        pass: false,
      };
    }
  },
});

// Extend TypeScript definitions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinEpsilon(expected: number, epsilon?: number): R;
    }
  }
}

export {};
