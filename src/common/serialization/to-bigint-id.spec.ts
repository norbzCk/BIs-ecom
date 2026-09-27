import { BadRequestException } from '@nestjs/common';
import { toBigIntId } from './to-bigint-id.js';

describe('toBigIntId', () => {
  it('parses a numeric string into a BigInt', () => {
    expect(toBigIntId('42')).toBe(42n);
  });

  it('is lossless beyond Number.MAX_SAFE_INTEGER', () => {
    expect(toBigIntId('9007199254740993')).toBe(9007199254740993n);
  });

  it.each(['abc', '4.5', '-1', '', ' 1', '1 '])(
    'rejects non-integer input %j',
    (value) => {
      expect(() => toBigIntId(value)).toThrow(BadRequestException);
    },
  );

  it('includes the given label in the error message', () => {
    expect(() => toBigIntId('abc', 'productId')).toThrow(/productId/);
  });
});
