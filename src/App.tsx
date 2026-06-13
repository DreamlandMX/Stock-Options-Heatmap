import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { DetailsPanel } from './components/DetailsPanel';
import { HeatmapGrid } from './components/HeatmapGrid';
import { SummaryStrip } from './components/SummaryStrip';
import { Toolbar } from './components/Toolbar';
import { useExposure } from './hooks/useExposure';
import {
  DEFAULT_LANGUAGE,
  isLanguage,
  LANGUAGE_STORAGE_KEY,
  Language,
  localizeRuntimeMessage,
  TEXT
} from './lib/i18n';
import { ExposureCell, ExposureMetric, ProviderMode } from './types/options';

const DEFAULT_TICKER = 'SPY';

export default function App() {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_LANGUAGE;
    }

    const savedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(savedLanguage) ? savedLanguage : DEFAULT_LANGUAGE;
  });
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
  const copy = TEXT[language];

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

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = TEXT[language].toolbar.brandTitle;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }, [language]);

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
        language={language}
        onLanguageChange={setLanguage}
      />

      {data?.provider.warning ? (
        <div className="warning-banner" role="status">
          <AlertTriangle size={16} />
          <span>{localizeRuntimeMessage(data.provider.warning, language)}</span>
        </div>
      ) : null}

      {error ? (
        <main className="error-state">
          <AlertTriangle size={28} />
          <h1>{copy.app.errorTitle}</h1>
          <p>{localizeRuntimeMessage(error, language)}</p>
          <button className="action-button" onClick={refresh} type="button">
            {copy.app.tryAgain}
          </button>
        </main>
      ) : (
        <main className={`dashboard-shell ${detailsOpen ? '' : 'details-hidden'}`}>
          <div className="main-region">
            {loading && !data ? <SkeletonHeatmap language={language} /> : null}
            {data ? (
              <HeatmapGrid
                data={data}
                selectedCellKey={selectedCellKey ?? undefined}
                onSelectCell={selectCell}
                language={language}
              />
            ) : null}
          </div>
          {detailsOpen ? (
            <DetailsPanel data={data} cell={selectedCell} onClose={() => setSelectedCellKey(null)} language={language} />
          ) : null}
        </main>
      )}

      {data ? <SummaryStrip data={data} language={language} /> : null}
      <footer className="risk-footer">{copy.app.riskFooter}</footer>
    </div>
  );
}

function SkeletonHeatmap({ language }: { language: Language }) {
  const copy = TEXT[language];

  return (
    <section className="heatmap-card skeleton" aria-label={copy.app.loadingHeatmap}>
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
