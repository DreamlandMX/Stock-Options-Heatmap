import { describe, expect, it } from 'vitest';
import { aggregateExposure, calculateGex, calculateVex } from './exposure';
import { NormalizedOptionContract, OptionChainPayload } from '../types/options';

const NOW = new Date('2026-06-12T14:30:00Z');

function contract(overrides: Partial<NormalizedOptionContract>): NormalizedOptionContract {
  return {
    id: 'contract',
    underlying: 'SPY',
    optionSymbol: 'SPY260612C00100000',
    optionType: 'call',
    strike: 100,
    expiration: '2026-06-19',
    openInterest: 10,
    contractSize: 100,
    impliedVolatility: 0.2,
    gamma: 0.01,
    source: 'Test',
    updatedAt: NOW.toISOString(),
    ...overrides
  };
}

function payload(contracts: NormalizedOptionContract[]): OptionChainPayload {
  return {
    quote: {
      symbol: 'SPY',
      price: 100,
      previousClose: 99,
      change: 1,
      changePercent: 1.01,
      updatedAt: NOW.toISOString(),
      source: 'Test'
    },
    contracts,
    provider: {
      requested: 'demo',
      mode: 'demo',
      name: 'Test'
    }
  };
}

describe('exposure calculations', () => {
  it('signs call GEX positive and put GEX negative per 1% underlying move', () => {
    const call = contract({ optionType: 'call', gamma: 0.01, openInterest: 10 });
    const put = contract({ optionType: 'put', gamma: 0.02, openInterest: 5 });

    expect(calculateGex(call, 100)).toBe(1000);
    expect(calculateGex(put, 100)).toBe(-1000);
  });

  it('uses provider vanna when present for VEX', () => {
    const call = contract({ optionType: 'call', vanna: 0.5, openInterest: 10 });
    const put = contract({ optionType: 'put', vanna: 0.5, openInterest: 10 });

    expect(calculateVex(call, 100, NOW)).toBe(500);
    expect(calculateVex(put, 100, NOW)).toBe(-500);
  });

  it('falls back to model-derived vanna when provider vanna is absent', () => {
    const call = contract({ optionType: 'call', strike: 105, vanna: undefined, openInterest: 100 });

    expect(Number.isFinite(calculateVex(call, 100, NOW))).toBe(true);
    expect(calculateVex(call, 100, NOW)).not.toBe(0);
  });

  it('aggregates by strike and expiration and finds wall levels', () => {
    const result = aggregateExposure(
      payload([
        contract({ id: 'c100', optionType: 'call', strike: 100, openInterest: 100, gamma: 0.02 }),
        contract({ id: 'p95', optionType: 'put', strike: 95, openInterest: 80, gamma: 0.025 }),
        contract({ id: 'c105', optionType: 'call', strike: 105, openInterest: 12, gamma: 0.01 })
      ]),
      { metric: 'gex', expirationCount: 1, strikeRangePercent: 10, now: NOW }
    );

    expect(result.cells).toHaveLength(3);
    expect(result.summary.callWall.strike).toBe(100);
    expect(result.summary.putWall.strike).toBe(95);
    expect(result.summary.maxCell.strike).toBe(100);
    expect(result.summary.minCell.strike).toBe(95);
  });
});
