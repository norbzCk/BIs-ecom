/**
 * Prisma's Decimal fields (price, unitPrice, subtotal, etc.) are decimal.js
 * instances. They stringify safely via toJSON, but the frontend expects
 * plain numbers to do arithmetic (formatting, totals). Money in this schema
 * never exceeds Number.MAX_SAFE_INTEGER, so the precision loss from
 * converting here is not a concern.
 */
export function decimalToNumber(
  value: { toNumber(): number } | number,
): number {
  return typeof value === 'number' ? value : value.toNumber();
}
