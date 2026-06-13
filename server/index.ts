import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { aggregateExposure } from '../src/lib/exposure';
import { ExposureMetric, ExposureRequest, ProviderMode } from '../src/types/options';
import { fetchOptionChain } from './providers';

loadLocalEnv();

const app = express();
const port = Number(process.env.PORT ?? 8787);

const ExposureQuerySchema = z.object({
  ticker: z.string().trim().min(1).max(12).default('SPY'),
  provider: z.enum(['auto', 'demo', 'moomoo']).default('demo'),
  metric: z.enum(['gex', 'vex']).default('gex'),
  expirations: z.coerce.number().int().min(1).max(14).default(9),
  strikeRange: z.coerce.number().min(3).max(30).default(15)
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    provider: process.env.OPTIONS_PROVIDER ?? 'demo',
    time: new Date().toISOString()
  });
});

app.get('/api/exposure', async (request, response) => {
  const parsed = ExposureQuerySchema.safeParse({
    ticker: request.query.ticker ?? 'SPY',
    provider: request.query.provider ?? process.env.OPTIONS_PROVIDER ?? 'demo',
    metric: request.query.metric ?? 'gex',
    expirations: request.query.expirations ?? 9,
    strikeRange: request.query.strikeRange ?? 15
  });

  if (!parsed.success) {
    response.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const exposureRequest: ExposureRequest = {
    ticker: parsed.data.ticker.toUpperCase(),
    provider: parsed.data.provider as ProviderMode,
    metric: parsed.data.metric as ExposureMetric,
    expirations: parsed.data.expirations,
    strikeRange: parsed.data.strikeRange
  };

  try {
    const payload = await fetchOptionChain(exposureRequest);
    const result = aggregateExposure(payload, {
      metric: exposureRequest.metric,
      expirationCount: exposureRequest.expirations,
      strikeRangePercent: exposureRequest.strikeRange
    });
    response.json(result);
  } catch (error) {
    response.status(500).json({
      error: (error as Error).message
    });
  }
});

app.listen(port, '127.0.0.1', () => {
  console.log(`Options heatmap API listening on http://127.0.0.1:${port}`);
});

function loadLocalEnv() {
  const externalKeys = new Set(Object.keys(process.env));

  for (const fileName of ['.env', '.env.local']) {
    const filePath = path.resolve(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        continue;
      }

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || externalKeys.has(match[1])) {
        continue;
      }

      process.env[match[1]] = unquoteEnvValue(match[2].trim());
    }
  }
}

function unquoteEnvValue(value: string) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}
