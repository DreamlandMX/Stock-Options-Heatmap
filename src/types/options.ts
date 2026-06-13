export type OptionSide = 'call' | 'put';
export type ExposureMetric = 'gex' | 'vex';
export type ProviderMode = 'auto' | 'demo' | 'moomoo';
export type DataMode = 'demo' | 'live';

export interface NormalizedOptionContract {
  id: string;
  underlying: string;
  optionSymbol: string;
  optionType: OptionSide;
  strike: number;
  expiration: string;
  openInterest: number;
  volume?: number;
  contractSize: number;
  impliedVolatility: number;
  gamma: number;
  delta?: number;
  vanna?: number;
  vega?: number;
  theta?: number;
  rho?: number;
  bid?: number;
  ask?: number;
  last?: number;
  source: string;
  updatedAt: string;
}

export interface UnderlyingQuote {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  updatedAt: string;
  source: string;
}

export interface OptionChainPayload {
  quote: UnderlyingQuote;
  contracts: NormalizedOptionContract[];
  provider: {
    requested: ProviderMode;
    mode: DataMode;
    name: string;
    warning?: string;
  };
}

export interface ExposureCell {
  key: string;
  strike: number;
  expiration: string;
  callGex: number;
  putGex: number;
  netGex: number;
  callVex: number;
  putVex: number;
  netVex: number;
  callOi: number;
  putOi: number;
  callGamma: number;
  putGamma: number;
  callVanna: number;
  putVanna: number;
  ivMid: number;
  contractCount: number;
  stale: boolean;
  source: string;
  updatedAt: string;
}

export interface WallLevel {
  strike: number;
  expiration?: string;
  value: number;
}

export interface ExposureSummary {
  totalGex: number;
  totalVex: number;
  zeroGammaEstimate: number;
  callWall: WallLevel;
  putWall: WallLevel;
  topExpiration: {
    expiration: string;
    value: number;
  };
  maxCell: WallLevel;
  minCell: WallLevel;
}

export interface ExposureResponse {
  quote: UnderlyingQuote;
  metric: ExposureMetric;
  expirations: string[];
  strikes: number[];
  cells: ExposureCell[];
  summary: ExposureSummary;
  provider: OptionChainPayload['provider'];
  generatedAt: string;
  assumptions: string[];
}

export interface ExposureRequest {
  ticker: string;
  provider: ProviderMode;
  metric: ExposureMetric;
  expirations: number;
  strikeRange: number;
}
