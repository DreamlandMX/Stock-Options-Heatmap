import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { z } from 'zod';
import { NormalizedOptionContract, OptionChainPayload, OptionSide, UnderlyingQuote } from '../../src/types/options';
import { toFiniteNumber } from '../../src/lib/math';

const RawContractSchema = z.record(z.string(), z.unknown());

const RawPayloadSchema = z.object({
  quote: z.record(z.string(), z.unknown()),
  contracts: z.array(RawContractSchema)
});

export interface MoomooFetchOptions {
  ticker: string;
  expirations: number;
  strikeRange: number;
}

export async function fetchMoomooPayload(options: MoomooFetchOptions): Promise<OptionChainPayload> {
  const helperPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../moomoo/futu_fetch.py');
  const python = process.env.MOOMOO_PYTHON || 'python';
  const host = process.env.MOOMOO_OPEND_HOST || '127.0.0.1';
  const port = process.env.MOOMOO_OPEND_PORT || '11111';
  const args = [
    helperPath,
    '--ticker',
    options.ticker,
    '--host',
    host,
    '--port',
    port,
    '--expirations',
    String(options.expirations),
    '--strike-range',
    String(options.strikeRange)
  ];

  const raw = await runPythonJson(python, args, 18_000);
  return normalizeMoomooPayload(raw, options.ticker);
}

export function normalizeMoomooPayload(rawPayload: unknown, requestedTicker: string): OptionChainPayload {
  const parsed = RawPayloadSchema.parse(rawPayload);
  const quote = normalizeQuote(parsed.quote, requestedTicker);
  const contracts = parsed.contracts
    .map((raw, index) => normalizeContract(raw, quote.symbol, index, quote.updatedAt))
    .filter((contract): contract is NormalizedOptionContract => Boolean(contract));

  if (contracts.length === 0) {
    throw new Error('Moomoo OpenD returned no usable option contracts.');
  }

  return {
    quote,
    contracts,
    provider: {
      requested: 'moomoo',
      mode: 'live',
      name: 'Moomoo OpenD'
    }
  };
}

function normalizeQuote(raw: Record<string, unknown>, requestedTicker: string): UnderlyingQuote {
  const symbol = String(valueByAlias(raw, ['symbol', 'code', 'ticker']) ?? requestedTicker).replace(/^US\./, '');
  const price = numberByAlias(raw, ['price', 'last_price', 'cur_price', 'close', 'last'], 0);
  const previousClose = numberByAlias(
    raw,
    ['previousClose', 'prev_close_price', 'prevClose', 'pre_close', 'prev_close'],
    price
  );
  const change = numberByAlias(raw, ['change', 'net_change'], price - previousClose);
  const changePercent = numberByAlias(
    raw,
    ['changePercent', 'change_rate', 'change_ratio', 'pct_chg'],
    previousClose ? (change / previousClose) * 100 : 0
  );
  const updatedAt = String(valueByAlias(raw, ['updatedAt', 'update_time', 'data_time']) ?? new Date().toISOString());

  if (price <= 0) {
    throw new Error('Moomoo OpenD returned an invalid underlying price.');
  }

  return {
    symbol,
    price,
    previousClose,
    change,
    changePercent: Math.abs(changePercent) > 1 && Math.abs(changePercent) < 100 ? changePercent : changePercent * 100,
    updatedAt: normalizeTimestamp(updatedAt),
    source: 'Moomoo OpenD'
  };
}

function normalizeContract(
  raw: Record<string, unknown>,
  underlying: string,
  index: number,
  fallbackUpdatedAt: string
): NormalizedOptionContract | null {
  const optionSymbol = String(valueByAlias(raw, ['optionSymbol', 'option_symbol', 'code', 'symbol']) ?? '');
  const optionType = normalizeOptionType(valueByAlias(raw, ['optionType', 'option_type', 'type', 'call_put']));
  const strike = numberByAlias(raw, ['strike', 'strike_price', 'exercise_price'], Number.NaN);
  const expiration = String(valueByAlias(raw, ['expiration', 'strike_time', 'expiry', 'maturity_date']) ?? '');
  const openInterest = numberByAlias(raw, ['openInterest', 'open_interest', 'option_open_interest', 'oi'], 0);
  const contractSize = numberByAlias(raw, ['contractSize', 'contract_size', 'option_contract_size', 'lot_size'], 100);
  const impliedVolatilityRaw = numberByAlias(
    raw,
    ['impliedVolatility', 'implied_volatility', 'option_implied_volatility', 'iv'],
    0
  );
  const impliedVolatility = impliedVolatilityRaw > 3 ? impliedVolatilityRaw / 100 : impliedVolatilityRaw;
  const gamma = numberByAlias(raw, ['gamma', 'option_gamma'], 0);
  const updatedAt = String(valueByAlias(raw, ['updatedAt', 'update_time', 'data_time']) ?? fallbackUpdatedAt);

  if (!optionType || !expiration || !Number.isFinite(strike) || strike <= 0) {
    return null;
  }

  return {
    id: optionSymbol || `${underlying}-${expiration}-${optionType}-${strike}-${index}`,
    underlying,
    optionSymbol: optionSymbol || `${underlying}-${expiration}-${optionType}-${strike}`,
    optionType,
    strike,
    expiration: normalizeExpiration(expiration),
    openInterest,
    volume: numberByAlias(raw, ['volume', 'option_volume'], 0),
    contractSize,
    impliedVolatility,
    gamma,
    delta: numberByAlias(raw, ['delta', 'option_delta'], undefined),
    vanna: numberByAlias(raw, ['vanna', 'option_vanna'], undefined),
    vega: numberByAlias(raw, ['vega', 'option_vega'], undefined),
    theta: numberByAlias(raw, ['theta', 'option_theta'], undefined),
    rho: numberByAlias(raw, ['rho', 'option_rho'], undefined),
    bid: numberByAlias(raw, ['bid', 'bid_price'], undefined),
    ask: numberByAlias(raw, ['ask', 'ask_price'], undefined),
    last: numberByAlias(raw, ['last', 'last_price', 'cur_price'], undefined),
    source: 'Moomoo OpenD',
    updatedAt: normalizeTimestamp(updatedAt)
  };
}

function runPythonJson(python: string, args: string[], timeoutMs: number): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(python, args, {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`Moomoo OpenD helper timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Moomoo OpenD helper exited with code ${code}.`));
        return;
      }

      try {
        resolve(parsePythonJsonOutput(stdout));
      } catch (error) {
        reject(new Error(`Moomoo OpenD helper returned invalid JSON: ${(error as Error).message}`));
      }
    });
  });
}

export function parsePythonJsonOutput(stdout: string): unknown {
  const trimmed = stdout.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new Error('No JSON object found in helper output.');
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function valueByAlias(raw: Record<string, unknown>, aliases: string[]): unknown {
  for (const alias of aliases) {
    if (raw[alias] !== undefined && raw[alias] !== null && raw[alias] !== '') {
      return raw[alias];
    }
  }
  return undefined;
}

function numberByAlias(raw: Record<string, unknown>, aliases: string[], fallback: number | undefined): number;
function numberByAlias(raw: Record<string, unknown>, aliases: string[], fallback: undefined): number | undefined;
function numberByAlias(
  raw: Record<string, unknown>,
  aliases: string[],
  fallback: number | undefined
): number | undefined {
  const value = valueByAlias(raw, aliases);
  if (value === undefined) {
    return fallback;
  }

  const parsed = toFiniteNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeOptionType(value: unknown): OptionSide | null {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized.includes('call') || normalized === 'c' || normalized === '1') {
    return 'call';
  }
  if (normalized.includes('put') || normalized === 'p' || normalized === '2') {
    return 'put';
  }
  return null;
}

function normalizeExpiration(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const compact = value.replaceAll('/', '-');
  const date = new Date(compact);
  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

function normalizeTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}
