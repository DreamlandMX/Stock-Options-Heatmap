import { describe, expect, it } from 'vitest';
import { formatAge, formatMoney, formatPercent } from './format';

describe('format helpers', () => {
  it('formats signed money in compact units', () => {
    expect(formatMoney(1_250_000, { signed: true })).toBe('+$1.3M');
    expect(formatMoney(-485_800, { signed: true })).toBe('-$485.8K');
  });

  it('formats signed percent values', () => {
    expect(formatPercent(1.15, true)).toBe('+1.15%');
    expect(formatPercent(-0.89, true)).toBe('-0.89%');
  });

  it('formats data age', () => {
    expect(formatAge('2026-06-12T14:29:45Z', new Date('2026-06-12T14:30:00Z'))).toBe('15s ago');
  });
});
