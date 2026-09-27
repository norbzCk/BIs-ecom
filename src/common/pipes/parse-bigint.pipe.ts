import { Injectable, type PipeTransform } from '@nestjs/common';
import { toBigIntId } from '../serialization/to-bigint-id.js';

/**
 * Every id in this schema is a BigInt, serialized as a string in responses
 * (see bigint-json-replacer.ts). This pipe accepts that same string shape
 * back on the way in and turns it into a BigInt for Prisma calls, rejecting
 * anything that isn't a positive integer literal.
 */
@Injectable()
export class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string): bigint {
    return toBigIntId(value);
  }
}
