import { BadRequestException } from '@nestjs/common';
import { ParseBigIntPipe } from './parse-bigint.pipe.js';

describe('ParseBigIntPipe', () => {
  const pipe = new ParseBigIntPipe();

  it('transforms a numeric string into a BigInt', () => {
    expect(pipe.transform('7')).toBe(7n);
  });

  it('rejects non-numeric input', () => {
    expect(() => pipe.transform('not-a-number')).toThrow(BadRequestException);
  });
});
