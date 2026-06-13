import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DetailsPanel } from './components/DetailsPanel';
import { HeatmapGrid } from './components/HeatmapGrid';
import { SummaryStrip } from './components/SummaryStrip';
import { Toolbar } from './components/Toolbar';
import { useExposure } from './hooks/useExposure';
import { ExposureCell, ExposureMetric, ProviderMode } from './types/options';

const DEFAULT_TICKER = 'SPY';

export default function App() {
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [inputTicker, setInputTicker] = useState(DEFAULT_TICKER);
  const [metric, setMetric] = useState<ExposureMetric>('gex');
  const [provider, setProvider] = useState<ProviderMode>('demo');
  const [expirations, setExpirations] = useState(9);
  const [strikeRange, setStrikeRange] = useState(15);
  const [selectedCellKey, setSelectedCellKey] = useState<string | null | undefined>();

  const { data, error, loading, refresh } = useExposure({
    ticker,
    provider,
    metric,
    expirations,
    strikeRange
  });

  const selectedCell = useMemo(() => {
    if (!data || !selectedCellKey) {
      return undefined;
    }
    return data.cells.find((cell) => cell.key === selectedCellKey);
  }, [data, selectedCellKey]);

  useEffect(() => {
    if (!data || selectedCellKey !== undefined) {
      return;
    }
    const preferred = data.cells.find(
      (cell) => cell.strike === data.summary.maxCell.strike && cell.expiration === data.summary.maxCell.expiration
    );
    setSelectedCellKey(preferred?.key ?? data.cells[0]?.key ?? null);
  }, [data, selectedCellKey]);

  useEffect(() => {
    if (data && selectedCellKey && !data.cells.some((cell) => cell.key === selectedCellKey)) {
      setSelectedCellKey(undefined);
    }
  }, [data, selectedCellKey]);

  function submitTicker(nextTicker = inputTicker) {
    const normalized = nextTicker.trim().toUpperCase();
    if (normalized) {
      setInputTicker(normalized);
      setSelectedCellKey(undefined);
      setTicker(normalized);
    }
  }

  function selectCell(cell: ExposureCell) {
    setSelectedCellKey(cell.key);
  }

  const detailsOpen = data && selectedCellKey !== null;

  return (
    <div className="app-shell">
      <Toolbar
        inputTicker={inputTicker}
        onInputTickerChange={setInputTicker}
        onTickerSubmit={submitTicker}
        quote={data?.quote}
        metric={metric}
        onMetricChange={setMetric}
        provider={provider}
        onProviderChange={(nextProvider) => {
          setSelectedCellKey(undefined);
          setProvider(nextProvider);
        }}
        expirations={expirations}
        onExpirationsChange={(value) => {
          setSelectedCellKey(undefined);
          setExpirations(value);
        }}
        strikeRange={strikeRange}
        onStrikeRangeChange={(value) => {
          setSelectedCellKey(undefined);
          setStrikeRange(value);
        }}
        onRefresh={refresh}
        loading={loading}
        mode={data?.provider.mode}
        generatedAt={data?.generatedAt}
      />

      {data?.provider.warning ? (
        <div className="warning-banner" role="status">
          <AlertTriangle size={16} />
          <span>{data.provider.warning}</span>
        </div>
      ) : null}

      {error ? (
        <main className="error-state">
          <AlertTriangle size={28} />
          <h1>Could not load options exposure</h1>
          <p>{error}</p>
          <button className="action-button" onClick={refresh} type="button">
            Try again
          </button>
        </main>
      ) : (
        <main className={`dashboard-shell ${detailsOpen ? '' : 'details-hidden'}`}>
          <div className="main-region">
            {loading && !data ? <SkeletonHeatmap /> : null}
            {data ? (
              <HeatmapGrid
                data={data}
                selectedCellKey={selectedCellKey ?? undefined}
                onSelectCell={selectCell}
              />
            ) : null}
          </div>
          {detailsOpen ? <DetailsPanel data={data} cell={selectedCell} onClose={() => setSelectedCellKey(null)} /> : null}
        </main>
      )}

      {data ? <SummaryStrip data={data} /> : null}
      <footer className="risk-footer">
        Informational research tool only. VEX is model-derived when provider vanna is unavailable.
      </footer>
    </div>
  );
}

function SkeletonHeatmap() {
  return (
    <section className="heatmap-card skeleton" aria-label="Loading heatmap">
      <div className="skeleton-toolbar" />
      {Array.from({ length: 12 }).map((_, row) => (
        <div className="skeleton-row" key={row}>
          {Array.from({ length: 8 }).map((__, column) => (
            <span key={column} />
          ))}
        </div>
      ))}
    </section>
  );
}
