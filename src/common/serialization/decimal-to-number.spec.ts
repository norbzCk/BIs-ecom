import { decimalToNumber } from './decimal-to-number.js';

describe('decimalToNumber', () => {
  it('converts a Decimal-like value via toNumber()', () => {
    const decimal = { toNumber: () => 19.99 };
    expect(decimalToNumber(decimal)).toBe(19.99);
  });

  it('passes plain numbers through unchanged', () => {
    expect(decimalToNumber(42)).toBe(42);
  });
});
