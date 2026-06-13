import { describe, expect, it } from 'vitest';
import { normalizeMoomooPayload, parsePythonJsonOutput } from './moomoo';

describe('Moomoo payload normalization', () => {
  it('normalizes common OpenD snapshot aliases', () => {
    const payload = normalizeMoomooPayload(
      {
        quote: {
          code: 'US.SPY',
          last_price: 539.71,
          prev_close_price: 537.5,
          change_rate: 0.0041,
          update_time: '2026-06-12T14:30:00Z'
        },
        contracts: [
          {
            code: 'US.SPY260619C00540000',
            option_type: 'CALL',
            strike_price: 540,
            strike_time: '2026-06-19',
            option_open_interest: 248734,
            option_contract_size: 100,
            option_implied_volatility: 18.35,
            option_gamma: 0.0231,
            option_vanna: 0.00485
          },
          {
            code: 'US.SPY260619P00540000',
            option_type: 'PUT',
            strike_price: 540,
            strike_time: '2026-06-19',
            option_open_interest: 52196,
            option_contract_size: 100,
            option_implied_volatility: 18.9,
            option_gamma: 0.0227
          }
        ]
      },
      'SPY'
    );

    expect(payload.quote.symbol).toBe('SPY');
    expect(payload.quote.price).toBe(539.71);
    expect(payload.quote.changePercent).toBeCloseTo(0.41);
    expect(payload.contracts).toHaveLength(2);
    expect(payload.contracts[0].optionType).toBe('call');
    expect(payload.contracts[0].impliedVolatility).toBeCloseTo(0.1835);
    expect(payload.contracts[1].optionType).toBe('put');
  });

  it('parses JSON from OpenD helper output mixed with SDK logs', () => {
    expect(
      parsePythonJsonOutput('2026-06-12 connect ready\n{"quote":{"price":1},"contracts":[]}\n2026-06-12 disconnected')
    ).toEqual({
      quote: {
        price: 1
      },
      contracts: []
    });
  });
});
