import { formatCurrency, formatNumber, formatPercentage } from '../formatting';

describe('Formatting Utilities', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers as currency', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format negative numbers with proper sign', () => {
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56');
      expect(formatCurrency(-0.99)).toBe('-$0.99');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle undefined and null', () => {
      expect(formatCurrency(undefined as any)).toBe('$0.00');
      expect(formatCurrency(null as any)).toBe('$0.00');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with commas', () => {
      expect(formatNumber(1234567)).toBe('1,234,567');
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(999)).toBe('999');
    });

    it('should handle decimals properly', () => {
      expect(formatNumber(1234.5678, 2)).toBe('1,234.57');
      expect(formatNumber(0.123456, 4)).toBe('0.1235');
    });

    it('should handle edge cases', () => {
      expect(formatNumber(0)).toBe('0');
      expect(formatNumber(-1234)).toBe('-1,234');
    });
  });

  describe('formatPercentage', () => {
    it('should format percentages correctly', () => {
      expect(formatPercentage(0.1234)).toBe('12.34%');
      expect(formatPercentage(1)).toBe('100.00%');
      expect(formatPercentage(0)).toBe('0.00%');
    });

    it('should handle custom decimal places', () => {
      expect(formatPercentage(0.12345, 1)).toBe('12.3%');
      expect(formatPercentage(0.12345, 3)).toBe('12.345%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-0.1234)).toBe('-12.34%');
    });
  });
});