const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function relativeTime(date: Date, now: Date = new Date()): string {
  const diff = now.getTime() - date.getTime();
  if (diff < MINUTE) return "just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`;
  return date.toISOString().slice(0, 10);
}

const k = (n: number): string =>
  n >= 1000 && n % 1000 === 0 ? `${n / 1000}k` : n.toLocaleString("en-US");

const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string {
  if (min === null && max === null) return "—";
  const sym = (currency && CURRENCY_SYMBOL[currency]) ?? (currency ? `${currency} ` : "$");
  if (min !== null && max !== null) {
    return min === max ? `${sym}${k(min)}` : `${sym}${k(min)}–${sym}${k(max)}`;
  }
  // Exactly one bound is set here (both-null and both-set returned above).
  // Narrow each side to a non-null number explicitly — no non-null assertion.
  if (min !== null) return `${sym}${k(min)}+`;
  if (max !== null) return `up to ${sym}${k(max)}`;
  return "—";
}

/** '2026-06' → 'JUN 2026' */
export function formatMonth(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const names = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];
  const name = names[(m ?? 1) - 1] ?? "—";
  return `${name} ${y ?? ""}`;
}
