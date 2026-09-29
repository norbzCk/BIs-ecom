/**
 * Single source of truth for money formatting.
 *
 * Every price on the storefront routes through here so the currency can't
 * drift between pages. TZS is the Tanzanian shilling; it has no minor unit in
 * practice, but the backend stores prices as decimals so we keep two decimal
 * places on totals and none on headline prices unless asked.
 */

const LOCALE = 'en-TZ'

export const CURRENCY = 'TZS'

/** Narrow no-break space is what CLDR puts between "TSh" and the digits. */
export const SYMBOL = 'TSh'

const format = (min: number, max: number) =>
  new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  })

const noDecimals = format(0, 0)
const withDecimals = format(2, 2)

/** Headline price, e.g. "TSh 1,699" */
export function money(value: number): string {
  return noDecimals.format(value)
}

/** Totals and line items, e.g. "TSh 4,297.00" */
export function moneyExact(value: number): string {
  return withDecimals.format(value)
}

/**
 * Splits a formatted amount into symbol and digits so it can be laid out with
 * the symbol de-emphasised, e.g. a big number with a small "TSh" above it.
 */
export function moneyParts(
  value: number,
  decimals: 0 | 2 = 0,
): { symbol: string; amount: string } {
  const text = decimals === 2 ? moneyExact(value) : money(value)
  // CLDR separates the symbol from the digits with U+00A0, not a plain space.
  const [symbol, amount = ''] = text.split(/[\s  ]/, 2)
  return { symbol, amount }
}

/** Compact form for dense rows, e.g. "TSh 1.7M" */
export function moneyCompact(value: number): string {
  if (Math.abs(value) < 1_000_000) return money(value)
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: CURRENCY,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}
