import { buildDemoPayload } from '../../src/providers/demo';
import { ExposureRequest, OptionChainPayload } from '../../src/types/options';
import { fetchMoomooPayload } from './moomoo';

export async function fetchOptionChain(request: ExposureRequest): Promise<OptionChainPayload> {
  if (request.provider === 'demo') {
    return buildDemoPayload(request.ticker);
  }

  const shouldTryMoomoo =
    request.provider === 'moomoo' ||
    (request.provider === 'auto' && (process.env.MOOMOO_AUTO_CONNECT ?? 'false').toLowerCase() === 'true');

  if (shouldTryMoomoo) {
    try {
      return await fetchMoomooPayload({
        ticker: request.ticker,
        expirations: request.expirations,
        strikeRange: request.strikeRange
      });
    } catch (error) {
      const demo = buildDemoPayload(request.ticker);
      return {
        ...demo,
        provider: {
          requested: request.provider,
          mode: 'demo',
          name: 'Demo fallback',
          warning: `Moomoo OpenD unavailable, using demo data. ${(error as Error).message}`
        }
      };
    }
  }

  return buildDemoPayload(request.ticker);
}
