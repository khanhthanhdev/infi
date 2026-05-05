/**
 * Format an ISO date string as a short human-readable date (e.g. "Jan 5, 2026").
 * Returns `fallback` when the value is falsy, or the original value when parsing fails.
 */
export function formatDate(value: string, fallback = "\u2014"): string {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * Format a number as currency (e.g. "$1,234" or "1,234.56 USD").
 * Falls back to a plain number + currency code when `Intl` rejects the currency.
 */
export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: Math.abs(value) >= 1000 ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(Math.abs(value) >= 1000 ? 0 : 2)} ${currency}`;
  }
}

/**
 * Format a number with up to 4 fractional digits.
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(value);
}
