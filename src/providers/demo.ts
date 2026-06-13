import { NormalizedOptionContract, OptionChainPayload, OptionSide, UnderlyingQuote } from '../types/options';

const UNDERLYINGS: Record<string, { price: number; previousClose: number; iv: number }> = {
  SPY: { price: 539.71, previousClose: 537.5, iv: 0.18 },
  QQQ: { price: 701.68, previousClose: 716.05, iv: 0.22 },
  TSLA: { price: 403.74, previousClose: 399.15, iv: 0.48 },
  VIX: { price: 20.41, previousClose: 18.92, iv: 0.78 },
  SPXW: { price: 7339.64, previousClose: 7405.54, iv: 0.16 }
};

const EXPIRY_OFFSETS = [0, 1, 3, 5, 6, 8, 9, 13, 16, 22, 35, 50, 70, 95];

export function buildDemoPayload(ticker: string, now = new Date()): OptionChainPayload {
  const normalizedTicker = ticker.trim().toUpperCase() || 'SPY';
  const meta = UNDERLYINGS[normalizedTicker] ?? {
    price: 120 + seededNoise(normalizedTicker, 0) * 80,
    previousClose: 118 + seededNoise(normalizedTicker, 1) * 80,
    iv: 0.28
  };
  const updatedAt = now.toISOString();
  const quote: UnderlyingQuote = {
    symbol: normalizedTicker,
    price: meta.price,
    previousClose: meta.previousClose,
    change: meta.price - meta.previousClose,
    changePercent: ((meta.price - meta.previousClose) / meta.previousClose) * 100,
    updatedAt,
    source: 'Demo'
  };

  return {
    quote,
    contracts: buildDemoContracts(normalizedTicker, meta.price, meta.iv, updatedAt, now),
    provider: {
      requested: 'demo',
      mode: 'demo',
      name: 'Demo',
      warning: 'Demo data is deterministic sample data. Configure Moomoo OpenD for live chain snapshots.'
    }
  };
}

function buildDemoContracts(
  ticker: string,
  spot: number,
  baseIv: number,
  updatedAt: string,
  now: Date
): NormalizedOptionContract[] {
  const step = chooseStrikeStep(spot);
  const minStrike = Math.floor((spot * 0.82) / step) * step;
  const maxStrike = Math.ceil((spot * 1.18) / step) * step;
  const expirations = EXPIRY_OFFSETS.map((offset) => addDays(now, offset));
  const contracts: NormalizedOptionContract[] = [];

  for (const expiration of expirations) {
    const dte = Math.max(daysBetween(now, expiration), 0.35);
    for (let strike = minStrike; strike <= maxStrike; strike += step) {
      for (const optionType of ['call', 'put'] as OptionSide[]) {
        contracts.push(
          createDemoContract({
            ticker,
            spot,
            strike: roundStrike(strike),
            expiration,
            optionType,
            baseIv,
            dte,
            updatedAt
          })
        );
      }
    }
  }

  return contracts;
}

function createDemoContract(params: {
  ticker: string;
  spot: number;
  strike: number;
  expiration: string;
  optionType: OptionSide;
  baseIv: number;
  dte: number;
  updatedAt: string;
}): NormalizedOptionContract {
  const moneyness = (params.strike - params.spot) / params.spot;
  const nearMoney = Math.exp(-Math.pow(moneyness / 0.08, 2));
  const dteWeight = 1 / Math.sqrt(Math.max(params.dte, 1));
  const pinWall = wallBoost(params.ticker, params.strike, params.spot, params.expiration, params.optionType);
  const noise = seededNoise(`${params.ticker}-${params.expiration}-${params.strike}-${params.optionType}`, 7);
  const openInterest = Math.max(
    25,
    Math.round((900 + 8500 * nearMoney + pinWall + 1400 * noise) * (1.4 / Math.sqrt(params.dte + 1)))
  );
  const gamma = Math.max(0.00001, (0.0025 + nearMoney * 0.065 * dteWeight) / Math.sqrt(params.spot));
  const impliedVolatility = Math.max(
    0.05,
    params.baseIv + Math.abs(moneyness) * 0.42 + seededNoise(params.expiration, params.strike) * 0.035
  );
  const deltaShape = 1 / (1 + Math.exp((params.strike - params.spot) / (params.spot * 0.025)));
  const delta = params.optionType === 'call' ? deltaShape : deltaShape - 1;
  const optionSymbol = `${params.ticker}${params.expiration.replaceAll('-', '').slice(2)}${
    params.optionType === 'call' ? 'C' : 'P'
  }${Math.round(params.strike * 1000).toString().padStart(8, '0')}`;

  return {
    id: optionSymbol,
    underlying: params.ticker,
    optionSymbol,
    optionType: params.optionType,
    strike: params.strike,
    expiration: params.expiration,
    openInterest,
    volume: Math.round(openInterest * (0.05 + noise * 0.18)),
    contractSize: params.ticker === 'VIX' ? 100 : 100,
    impliedVolatility,
    gamma,
    delta,
    vega: nearMoney * Math.sqrt(params.dte / 365) * params.spot * 0.35,
    theta: -nearMoney * 0.03,
    rho: delta * 0.02,
    bid: Math.max(0.01, Math.abs(params.spot - params.strike) * 0.02),
    ask: Math.max(0.02, Math.abs(params.spot - params.strike) * 0.02 + 0.08),
    last: Math.max(0.01, Math.abs(params.spot - params.strike) * 0.02 + 0.04),
    source: 'Demo',
    updatedAt: params.updatedAt
  };
}

function wallBoost(ticker: string, strike: number, spot: number, expiration: string, optionType: OptionSide): number {
  const roundedSpot = Math.round(spot / chooseStrikeStep(spot)) * chooseStrikeStep(spot);
  const callWall = roundedSpot + chooseStrikeStep(spot) * (ticker === 'TSLA' ? 3 : 1);
  const putWall = roundedSpot - chooseStrikeStep(spot) * (ticker === 'VIX' ? 1 : 2);
  const sameMonth = Number(expiration.slice(-2)) % 2 === 0 ? 1.2 : 1;

  if (optionType === 'call') {
    return 32_000 * sameMonth * Math.exp(-Math.pow((strike - callWall) / (chooseStrikeStep(spot) * 1.1), 2));
  }

  return 28_000 * sameMonth * Math.exp(-Math.pow((strike - putWall) / (chooseStrikeStep(spot) * 1.1), 2));
}

function chooseStrikeStep(spot: number): number {
  if (spot < 30) return 0.5;
  if (spot < 150) return 1;
  if (spot < 700) return 2.5;
  if (spot < 1500) return 5;
  return 10;
}

function roundStrike(value: number): number {
  return Math.round(value * 100) / 100;
}

function addDays(now: Date, offset: number): string {
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function daysBetween(now: Date, expiration: string): number {
  const expiry = new Date(`${expiration}T20:00:00Z`);
  return Math.max((expiry.getTime() - now.getTime()) / 86_400_000, 0.35);
}

function seededNoise(seed: string | number, salt: number): number {
  const input = `${seed}:${salt}`;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4_294_967_295;
}
