import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOptionChain } from './index';

vi.mock('./moomoo', () => ({
  fetchMoomooPayload: vi.fn(async () => {
    throw new Error('OpenD should not be called by default');
  })
}));

describe('provider routing', () => {
  afterEach(() => {
    delete process.env.MOOMOO_AUTO_CONNECT;
    vi.clearAllMocks();
  });

  it('does not try Moomoo when auto connect is not explicitly enabled', async () => {
    const { fetchMoomooPayload } = await import('./moomoo');

    const payload = await fetchOptionChain({
      ticker: 'SPY',
      provider: 'auto',
      metric: 'gex',
      expirations: 4,
      strikeRange: 10
    });

    expect(fetchMoomooPayload).not.toHaveBeenCalled();
    expect(payload.provider.mode).toBe('demo');
  });

  it('still tries Moomoo when explicitly requested', async () => {
    const { fetchMoomooPayload } = await import('./moomoo');

    const payload = await fetchOptionChain({
      ticker: 'SPY',
      provider: 'moomoo',
      metric: 'gex',
      expirations: 4,
      strikeRange: 10
    });

    expect(fetchMoomooPayload).toHaveBeenCalledOnce();
    expect(payload.provider.mode).toBe('demo');
    expect(payload.provider.warning).toContain('Moomoo OpenD unavailable');
  });
});
