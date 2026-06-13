import {
  ExposureCell,
  ExposureMetric,
  ExposureResponse,
  ExposureSummary,
  NormalizedOptionContract,
  OptionChainPayload,
  OptionSide,
  WallLevel
} from '../types/options';
import { blackScholesVanna, daysToExpiration, uniqueSortedNumbers, uniqueSortedStrings } from './math';

const STALE_AFTER_MS = 15 * 60 * 1000;

export function calculateGex(contract: NormalizedOptionContract, spot: number): number {
  const sideSign = contract.optionType === 'call' ? 1 : -1;
  return contract.gamma * contract.openInterest * contract.contractSize * spot * spot * 0.01 * sideSign;
}

export function calculateVanna(
  contract: NormalizedOptionContract,
  spot: number,
  now = new Date(),
  riskFreeRate = 0.045
): number {
  if (Number.isFinite(contract.vanna)) {
    return contract.vanna ?? 0;
  }

  const yearsToExpiry = daysToExpiration(contract.expiration, now) / 365;
  return blackScholesVanna({
    spot,
    strike: contract.strike,
    yearsToExpiry,
    impliedVolatility: contract.impliedVolatility,
    riskFreeRate
  });
}

export function calculateVex(
  contract: NormalizedOptionContract,
  spot: number,
  now = new Date(),
  riskFreeRate = 0.045
): number {
  const sideSign = contract.optionType === 'call' ? 1 : -1;
  const vanna = calculateVanna(contract, spot, now, riskFreeRate);
  return vanna * contract.openInterest * contract.contractSize * spot * 0.01 * sideSign;
}

export function aggregateExposure(
  payload: OptionChainPayload,
  config: {
    metric: ExposureMetric;
    expirationCount: number;
    strikeRangePercent: number;
    now?: Date;
  }
): ExposureResponse {
  const now = config.now ?? new Date();
  const spot = payload.quote.price;
  const lowerStrike = spot * (1 - config.strikeRangePercent / 100);
  const upperStrike = spot * (1 + config.strikeRangePercent / 100);
  const expirations = uniqueSortedStrings(payload.contracts.map((contract) => contract.expiration)).slice(
    0,
    Math.max(config.expirationCount, 1)
  );
  const expirationSet = new Set(expirations);

  const contracts = payload.contracts.filter(
    (contract) =>
      expirationSet.has(contract.expiration) &&
      contract.strike >= lowerStrike &&
      contract.strike <= upperStrike &&
      contract.openInterest > 0 &&
      contract.contractSize > 0
  );

  const strikes = uniqueSortedNumbers(
    contracts.map((contract) => contract.strike),
    'desc'
  );
  const cellMap = new Map<string, ExposureCell>();

  for (const strike of strikes) {
    for (const expiration of expirations) {
      const key = makeCellKey(strike, expiration);
      cellMap.set(key, {
        key,
        strike,
        expiration,
        callGex: 0,
        putGex: 0,
        netGex: 0,
        callVex: 0,
        putVex: 0,
        netVex: 0,
        callOi: 0,
        putOi: 0,
        callGamma: 0,
        putGamma: 0,
        callVanna: 0,
        putVanna: 0,
        ivMid: 0,
        contractCount: 0,
        stale: false,
        source: payload.provider.name,
        updatedAt: payload.quote.updatedAt
      });
    }
  }

  for (const contract of contracts) {
    const key = makeCellKey(contract.strike, contract.expiration);
    const cell = cellMap.get(key);
    if (!cell) {
      continue;
    }

    const gex = calculateGex(contract, spot);
    const vanna = calculateVanna(contract, spot, now);
    const vex = calculateVex(contract, spot, now);
    const isCall = contract.optionType === 'call';

    if (isCall) {
      cell.callGex += gex;
      cell.callVex += vex;
      cell.callOi += contract.openInterest;
      cell.callGamma += contract.gamma * contract.openInterest;
      cell.callVanna += vanna * contract.openInterest;
    } else {
      cell.putGex += gex;
      cell.putVex += vex;
      cell.putOi += contract.openInterest;
      cell.putGamma += contract.gamma * contract.openInterest;
      cell.putVanna += vanna * contract.openInterest;
    }

    cell.ivMid += contract.impliedVolatility;
    cell.contractCount += 1;
    cell.source = contract.source;
    cell.updatedAt = newerTimestamp(cell.updatedAt, contract.updatedAt);
    cell.stale = cell.stale || now.getTime() - new Date(contract.updatedAt).getTime() > STALE_AFTER_MS;
  }

  const cells = Array.from(cellMap.values()).map((cell) => ({
    ...cell,
    netGex: cell.callGex + cell.putGex,
    netVex: cell.callVex + cell.putVex,
    callGamma: cell.callOi ? cell.callGamma / cell.callOi : 0,
    putGamma: cell.putOi ? cell.putGamma / cell.putOi : 0,
    callVanna: cell.callOi ? cell.callVanna / cell.callOi : 0,
    putVanna: cell.putOi ? cell.putVanna / cell.putOi : 0,
    ivMid: cell.contractCount ? cell.ivMid / cell.contractCount : 0
  }));

  return {
    quote: payload.quote,
    metric: config.metric,
    expirations,
    strikes,
    cells,
    summary: buildSummary(cells, config.metric),
    provider: payload.provider,
    generatedAt: now.toISOString(),
    assumptions: [
      'GEX is gamma * open interest * contract size * spot^2 * 0.01.',
      'Call exposure is signed positive and put exposure is signed negative.',
      'VEX uses provider vanna when present; otherwise it uses Black-Scholes vanna derived from IV and time to expiry.'
    ]
  };
}

export function getCellMetric(cell: ExposureCell, metric: ExposureMetric): number {
  return metric === 'gex' ? cell.netGex : cell.netVex;
}

export function makeCellKey(strike: number, expiration: string): string {
  return `${strike.toFixed(4)}|${expiration}`;
}

function buildSummary(cells: ExposureCell[], metric: ExposureMetric): ExposureSummary {
  const valueFor = (cell: ExposureCell) => getCellMetric(cell, metric);
  const totalGex = cells.reduce((sum, cell) => sum + cell.netGex, 0);
  const totalVex = cells.reduce((sum, cell) => sum + cell.netVex, 0);
  const maxCell = cells.reduce<ExposureCell | undefined>(
    (winner, cell) => (!winner || valueFor(cell) > valueFor(winner) ? cell : winner),
    undefined
  );
  const minCell = cells.reduce<ExposureCell | undefined>(
    (winner, cell) => (!winner || valueFor(cell) < valueFor(winner) ? cell : winner),
    undefined
  );

  const byStrike = new Map<number, number>();
  const byExpiration = new Map<string, number>();
  const byCallStrike = new Map<number, number>();
  const byPutStrike = new Map<number, number>();

  for (const cell of cells) {
    byStrike.set(cell.strike, (byStrike.get(cell.strike) ?? 0) + valueFor(cell));
    byExpiration.set(cell.expiration, (byExpiration.get(cell.expiration) ?? 0) + valueFor(cell));
    byCallStrike.set(
      cell.strike,
      (byCallStrike.get(cell.strike) ?? 0) + (metric === 'gex' ? cell.callGex : cell.callVex)
    );
    byPutStrike.set(
      cell.strike,
      (byPutStrike.get(cell.strike) ?? 0) + (metric === 'gex' ? cell.putGex : cell.putVex)
    );
  }

  const topExpiration = maxMapEntryByAbs(byExpiration);
  const callWall = maxMapEntry(byCallStrike);
  const putWall = minMapEntry(byPutStrike);

  return {
    totalGex,
    totalVex,
    zeroGammaEstimate: estimateZeroCrossing(byStrike),
    callWall: {
      strike: callWall.key,
      value: callWall.value
    },
    putWall: {
      strike: putWall.key,
      value: putWall.value
    },
    topExpiration: {
      expiration: topExpiration.key,
      value: topExpiration.value
    },
    maxCell: toWall(maxCell, valueFor(maxCell ?? emptyCell())),
    minCell: toWall(minCell, valueFor(minCell ?? emptyCell()))
  };
}

function estimateZeroCrossing(byStrike: Map<number, number>): number {
  const points = Array.from(byStrike.entries()).sort((a, b) => a[0] - b[0]);
  if (points.length === 0) {
    return 0;
  }

  let closest = points[0];
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];

    if (Math.abs(current[1]) < Math.abs(closest[1])) {
      closest = current;
    }

    if ((prev[1] <= 0 && current[1] >= 0) || (prev[1] >= 0 && current[1] <= 0)) {
      const range = current[1] - prev[1];
      if (range === 0) {
        return current[0];
      }

      const weight = Math.abs(prev[1] / range);
      return prev[0] + (current[0] - prev[0]) * weight;
    }
  }

  return closest[0];
}

function maxMapEntry(map: Map<number, number>): { key: number; value: number } {
  return Array.from(map.entries()).reduce(
    (winner, [key, value]) => (value > winner.value ? { key, value } : winner),
    { key: 0, value: Number.NEGATIVE_INFINITY }
  );
}

function minMapEntry(map: Map<number, number>): { key: number; value: number } {
  return Array.from(map.entries()).reduce(
    (winner, [key, value]) => (value < winner.value ? { key, value } : winner),
    { key: 0, value: Number.POSITIVE_INFINITY }
  );
}

function maxMapEntryByAbs(map: Map<string, number>): { key: string; value: number } {
  return Array.from(map.entries()).reduce(
    (winner, [key, value]) => (Math.abs(value) > Math.abs(winner.value) ? { key, value } : winner),
    { key: '', value: 0 }
  );
}

function toWall(cell: ExposureCell | undefined, value: number): WallLevel {
  if (!cell) {
    return { strike: 0, expiration: undefined, value: 0 };
  }

  return { strike: cell.strike, expiration: cell.expiration, value };
}

function newerTimestamp(current: string, next: string): string {
  return new Date(next).getTime() > new Date(current).getTime() ? next : current;
}

function emptyCell(): ExposureCell {
  return {
    key: '',
    strike: 0,
    expiration: '',
    callGex: 0,
    putGex: 0,
    netGex: 0,
    callVex: 0,
    putVex: 0,
    netVex: 0,
    callOi: 0,
    putOi: 0,
    callGamma: 0,
    putGamma: 0,
    callVanna: 0,
    putVanna: 0,
    ivMid: 0,
    contractCount: 0,
    stale: false,
    source: '',
    updatedAt: ''
  };
}
