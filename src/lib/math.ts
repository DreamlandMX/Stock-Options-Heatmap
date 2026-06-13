const INV_SQRT_2PI = 1 / Math.sqrt(2 * Math.PI);

export function normalPdf(value: number): number {
  return INV_SQRT_2PI * Math.exp(-0.5 * value * value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function uniqueSortedNumbers(values: number[], direction: 'asc' | 'desc' = 'asc'): number[] {
  const sorted = Array.from(new Set(values.filter(Number.isFinite))).sort((a, b) => a - b);
  return direction === 'asc' ? sorted : sorted.reverse();
}

export function uniqueSortedStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b));
}

export function daysToExpiration(expiration: string, now = new Date()): number {
  const expiry = new Date(`${expiration}T20:00:00Z`);
  const millis = expiry.getTime() - now.getTime();
  return Math.max(millis / 86_400_000, 1 / 24);
}

export function blackScholesD1D2(params: {
  spot: number;
  strike: number;
  yearsToExpiry: number;
  impliedVolatility: number;
  riskFreeRate?: number;
}): { d1: number; d2: number } {
  const riskFreeRate = params.riskFreeRate ?? 0.045;
  const sigma = Math.max(params.impliedVolatility, 0.0001);
  const t = Math.max(params.yearsToExpiry, 1 / 365 / 24);
  const numerator = Math.log(params.spot / params.strike) + (riskFreeRate + 0.5 * sigma * sigma) * t;
  const denominator = sigma * Math.sqrt(t);
  const d1 = numerator / denominator;
  return { d1, d2: d1 - denominator };
}

export function blackScholesVanna(params: {
  spot: number;
  strike: number;
  yearsToExpiry: number;
  impliedVolatility: number;
  riskFreeRate?: number;
}): number {
  if (params.spot <= 0 || params.strike <= 0 || params.impliedVolatility <= 0) {
    return 0;
  }

  const { d1, d2 } = blackScholesD1D2(params);
  return (-normalPdf(d1) * d2) / Math.max(params.impliedVolatility, 0.0001);
}
