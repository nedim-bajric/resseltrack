export const CURRENCY_CODE = 'BAM';
export const CURRENCY_SYMBOL = 'KM';
export const CURRENCY_LOCALE = 'bs-BA';

/**
 * Format a number as BAM currency
 * Example: 12.50 → "12,50 KM"
 * Example: 1234.50 → "1.234,50 KM"
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return `0,00 ${CURRENCY_SYMBOL}`;
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + ` ${CURRENCY_SYMBOL}`;
}

/**
 * Format currency for chart tooltips — shorter version
 */
export function formatCurrencyShort(value: number): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value) + ` ${CURRENCY_SYMBOL}`;
}

/**
 * Format currency for input fields (raw number string)
 */
export function formatCurrencyInput(value: number): string {
  return value.toFixed(2);
}

/**
 * Parse a currency string back to number
 */
export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,-]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
