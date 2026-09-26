import { bigintJsonReplacer } from './bigint-json-replacer.js';

describe('bigintJsonReplacer', () => {
  it('converts bigint to a string', () => {
    expect(bigintJsonReplacer('id', 42n)).toBe('42');
  });

  it('is lossless beyond Number.MAX_SAFE_INTEGER', () => {
    const big = 9007199254740993n;
    const serialized = bigintJsonReplacer('id', big) as string;

    expect(serialized).toBe('9007199254740993');
    expect(BigInt(serialized)).toBe(big);

    // Converting to a number instead would corrupt this value.
    expect(String(Number(big))).not.toBe(big.toString());
  });

  it('leaves every other value untouched', () => {
    const decimal = { toJSON: () => '19.99' };
    const date = new Date('2026-01-01T00:00:00.000Z');

    expect(bigintJsonReplacer('n', 1)).toBe(1);
    expect(bigintJsonReplacer('s', 'x')).toBe('x');
    expect(bigintJsonReplacer('b', true)).toBe(true);
    expect(bigintJsonReplacer('nul', null)).toBeNull();
    expect(bigintJsonReplacer('u', undefined)).toBeUndefined();
    expect(bigintJsonReplacer('d', decimal)).toBe(decimal);
    expect(bigintJsonReplacer('at', date)).toBe(date);
  });
});
