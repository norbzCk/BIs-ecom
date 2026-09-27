import { BadRequestException } from '@nestjs/common';

/** Parses an id string (as sent in JSON bodies) into a BigInt, or throws 400. */
export function toBigIntId(value: string, label = 'id'): bigint {
  if (!/^\d+$/.test(value)) {
    throw new BadRequestException(`Invalid ${label}: ${value}`);
  }
  return BigInt(value);
}
