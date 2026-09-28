/** Prisma's error code for a unique-constraint violation. */
export const UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

/**
 * Structural check rather than `instanceof PrismaClientKnownRequestError`, so it
 * works regardless of how the (generated) client is bundled and in unit tests
 * that reject with a plain `{ code, meta }` object.
 */
export function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code: unknown }).code === UNIQUE_CONSTRAINT_VIOLATION
  );
}

/** The column names named in a unique-constraint error, e.g. ['sku']. */
export function uniqueConstraintTargets(error: unknown): string[] {
  if (typeof error !== 'object' || error === null || !('meta' in error)) {
    return [];
  }
  const target = (error as { meta?: { target?: unknown } }).meta?.target;
  return Array.isArray(target) ? target.map(String) : [];
}
