import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExposureMetric, ExposureResponse, ProviderMode } from '../types/options';

export interface ExposureQueryState {
  ticker: string;
  provider: ProviderMode;
  metric: ExposureMetric;
  expirations: number;
  strikeRange: number;
}

export function useExposure(query: ExposureQueryState) {
  const [data, setData] = useState<ExposureResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshToken, setRefreshToken] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      ticker: query.ticker,
      provider: query.provider,
      metric: query.metric,
      expirations: String(query.expirations),
      strikeRange: String(query.strikeRange)
    });
    return params.toString();
  }, [query.expirations, query.metric, query.provider, query.strikeRange, query.ticker]);

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`/api/exposure?${queryString}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || `Request failed with ${response.status}`);
        }
        return response.json() as Promise<ExposureResponse>;
      })
      .then((nextData) => {
        setData(nextData);
      })
      .catch((nextError) => {
        if ((nextError as Error).name !== 'AbortError') {
          setError((nextError as Error).message);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [queryString, refreshToken]);

  return { data, error, loading, refresh };
}
