import { useState } from 'react';
import {
  Activity,
  ChevronDown,
  Menu,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Zap
} from 'lucide-react';
import { ExposureMetric, ProviderMode, UnderlyingQuote } from '../types/options';
import { formatAge, formatNumber, formatPercent } from '../lib/format';
import { LANGUAGE_OPTIONS, Language, TEXT } from '../lib/i18n';

type ActivePopover = 'menu' | 'settings' | 'filters' | null;

interface ToolbarProps {
  inputTicker: string;
  onInputTickerChange: (value: string) => void;
  onTickerSubmit: (value?: string) => void;
  quote?: UnderlyingQuote;
  metric: ExposureMetric;
  onMetricChange: (metric: ExposureMetric) => void;
  provider: ProviderMode;
  onProviderChange: (provider: ProviderMode) => void;
  expirations: number;
  onExpirationsChange: (value: number) => void;
  strikeRange: number;
  onStrikeRangeChange: (value: number) => void;
  onRefresh: () => void;
  loading: boolean;
  mode?: string;
  generatedAt?: string;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export function Toolbar(props: ToolbarProps) {
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const changeClass = props.quote && props.quote.change >= 0 ? 'positive' : 'negative';
  const copy = TEXT[props.language];
  const statusLabel = props.mode === 'live' ? copy.toolbar.openDLiveData : copy.toolbar.demoData;

  function togglePopover(popover: Exclude<ActivePopover, null>) {
    setActivePopover((current) => (current === popover ? null : popover));
  }

  function submitPresetTicker(symbol: string) {
    props.onTickerSubmit(symbol);
    setActivePopover(null);
  }

  return (
    <header className="toolbar">
      <div className="toolbar-left">
        <button
          className="icon-button"
          aria-controls="app-menu-popover"
          aria-expanded={activePopover === 'menu'}
          aria-label={copy.toolbar.openMenu}
          onClick={() => togglePopover('menu')}
          type="button"
        >
          <Menu size={22} />
        </button>
        <div className="brand">
          <span className="brand-title">{copy.toolbar.brandTitle}</span>
        </div>
        <form
          className="ticker-search"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            props.onTickerSubmit(String(formData.get('ticker') ?? props.inputTicker));
          }}
        >
          <Search size={17} />
          <input
            aria-label={copy.toolbar.ticker}
            name="ticker"
            value={props.inputTicker}
            onChange={(event) => props.onInputTickerChange(event.target.value.toUpperCase())}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                props.onTickerSubmit(event.currentTarget.value);
              }
            }}
            spellCheck={false}
          />
        </form>
        {props.quote ? (
          <div className="quote-chip" aria-label={copy.toolbar.underlyingQuote}>
            <span>{formatNumber(props.quote.price, props.quote.price > 1000 ? 2 : 2)}</span>
            <span className={changeClass}>
              {formatNumber(props.quote.change, 2)} ({formatPercent(props.quote.changePercent, true)})
            </span>
          </div>
        ) : null}
      </div>

      <div className="toolbar-right">
        <div className="data-status" aria-label={copy.toolbar.dataStatus}>
          <span className={props.mode === 'live' ? 'status-dot live' : 'status-dot demo'} />
          <span>{props.mode === 'live' ? copy.toolbar.liveStatus : copy.toolbar.demoStatus}</span>
        </div>
        {props.generatedAt ? (
          <div className="timestamp">{copy.toolbar.updated(formatAge(props.generatedAt, new Date(), props.language))}</div>
        ) : null}

        <label className="select-shell desktop-control">
          <span>{copy.toolbar.provider}</span>
          <select value={props.provider} onChange={(event) => props.onProviderChange(event.target.value as ProviderMode)}>
            <option value="auto">{copy.toolbar.auto}</option>
            <option value="demo">{copy.toolbar.demo}</option>
            <option value="moomoo">{copy.toolbar.moomoo}</option>
          </select>
          <ChevronDown size={15} />
        </label>

        <div className="metric-toggle desktop-control" aria-label={copy.toolbar.metricToggle}>
          <button
            className={props.metric === 'gex' ? 'active' : ''}
            onClick={() => props.onMetricChange('gex')}
            type="button"
          >
            <Zap size={15} />
            GEX
          </button>
          <button
            className={props.metric === 'vex' ? 'active' : ''}
            onClick={() => props.onMetricChange('vex')}
            type="button"
          >
            <Activity size={15} />
            VEX
          </button>
        </div>

        <label className="select-shell desktop-control">
          <span>{copy.toolbar.expirations}</span>
          <select value={props.expirations} onChange={(event) => props.onExpirationsChange(Number(event.target.value))}>
            {[4, 6, 9, 12, 14].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>

        <label className="select-shell desktop-control">
          <span>{copy.toolbar.strikeRange}</span>
          <select value={props.strikeRange} onChange={(event) => props.onStrikeRangeChange(Number(event.target.value))}>
            {[5, 10, 15, 20, 30].map((value) => (
              <option key={value} value={value}>
                +/-{value}%
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>

        <button className="action-button" onClick={props.onRefresh} type="button">
          <RefreshCw size={16} className={props.loading ? 'spin' : ''} />
          {copy.toolbar.refresh}
        </button>
        <div className="language-toggle" aria-label={copy.toolbar.languageToggle}>
          {LANGUAGE_OPTIONS.map((option) => (
            <button
              className={props.language === option.value ? 'active' : ''}
              key={option.value}
              onClick={() => props.onLanguageChange(option.value)}
              type="button"
              aria-pressed={props.language === option.value}
            >
              {option.shortLabel}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-controls="settings-popover"
          aria-expanded={activePopover === 'settings'}
          aria-label={copy.toolbar.settings}
          onClick={() => togglePopover('settings')}
          type="button"
        >
          <Settings size={18} />
        </button>
        <button
          className="icon-button compact-only"
          aria-controls="filters-popover"
          aria-expanded={activePopover === 'filters'}
          aria-label={copy.toolbar.filters}
          onClick={() => togglePopover('filters')}
          type="button"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {activePopover === 'menu' ? (
        <div className="toolbar-popover menu-popover" id="app-menu-popover" role="dialog" aria-label={copy.toolbar.appMenu}>
          <div className="popover-title-row">
            <strong>{copy.toolbar.appMenu}</strong>
            <span>{statusLabel}</span>
          </div>
          <div className="popover-section">
            <span className="popover-label">{copy.toolbar.quickSymbols}</span>
            <div className="symbol-grid">
              {['SPY', 'QQQ', 'TSLA', 'AMD', 'NVDA', 'VIX', 'SPXW'].map((symbol) => (
                <button key={symbol} onClick={() => submitPresetTicker(symbol)} type="button">
                  {symbol}
                </button>
              ))}
            </div>
          </div>
          <div className="popover-section two-column-actions">
            <button
              className={props.metric === 'gex' ? 'active' : ''}
              onClick={() => props.onMetricChange('gex')}
              type="button"
            >
              {copy.toolbar.gexView}
            </button>
            <button
              className={props.metric === 'vex' ? 'active' : ''}
              onClick={() => props.onMetricChange('vex')}
              type="button"
            >
              {copy.toolbar.vexView}
            </button>
          </div>
          <button className="popover-primary" onClick={props.onRefresh} type="button">
            {copy.toolbar.refreshData}
          </button>
        </div>
      ) : null}

      {activePopover === 'settings' ? (
        <div className="toolbar-popover settings-popover" id="settings-popover" role="dialog" aria-label={copy.toolbar.settings}>
          <div className="popover-title-row">
            <strong>{copy.toolbar.settings}</strong>
            <span>
              {props.generatedAt ? copy.toolbar.updated(formatAge(props.generatedAt, new Date(), props.language)) : statusLabel}
            </span>
          </div>
          <label className="popover-field">
            <span>{copy.toolbar.provider}</span>
            <select value={props.provider} onChange={(event) => props.onProviderChange(event.target.value as ProviderMode)}>
              <option value="auto">{copy.toolbar.auto}</option>
              <option value="demo">{copy.toolbar.demo}</option>
              <option value="moomoo">{copy.toolbar.moomoo}</option>
            </select>
          </label>
          <label className="popover-field">
            <span>{copy.toolbar.expirations}</span>
            <select value={props.expirations} onChange={(event) => props.onExpirationsChange(Number(event.target.value))}>
              {[4, 6, 9, 12, 14].map((value) => (
                <option key={value} value={value}>
                  {copy.toolbar.columns(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="popover-field">
            <span>{copy.toolbar.strikeRange}</span>
            <select value={props.strikeRange} onChange={(event) => props.onStrikeRangeChange(Number(event.target.value))}>
              {[5, 10, 15, 20, 30].map((value) => (
                <option key={value} value={value}>
                  +/-{value}%
                </option>
              ))}
            </select>
          </label>
          <button className="popover-primary" onClick={() => setActivePopover(null)} type="button">
            {copy.toolbar.done}
          </button>
        </div>
      ) : null}

      {activePopover === 'filters' ? (
        <div className="toolbar-popover filters-popover" id="filters-popover" role="dialog" aria-label={copy.toolbar.filters}>
          <div className="popover-title-row">
            <strong>{copy.toolbar.filters}</strong>
            <span>{props.metric.toUpperCase()}</span>
          </div>
          <div className="popover-section two-column-actions">
            <button
              className={props.metric === 'gex' ? 'active' : ''}
              onClick={() => props.onMetricChange('gex')}
              type="button"
            >
              GEX
            </button>
            <button
              className={props.metric === 'vex' ? 'active' : ''}
              onClick={() => props.onMetricChange('vex')}
              type="button"
            >
              VEX
            </button>
          </div>
          <label className="popover-field">
            <span>{copy.toolbar.expirations}</span>
            <select value={props.expirations} onChange={(event) => props.onExpirationsChange(Number(event.target.value))}>
              {[4, 6, 9, 12, 14].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="popover-field">
            <span>{copy.toolbar.strikeRange}</span>
            <select value={props.strikeRange} onChange={(event) => props.onStrikeRangeChange(Number(event.target.value))}>
              {[5, 10, 15, 20, 30].map((value) => (
                <option key={value} value={value}>
                  +/-{value}%
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}
    </header>
  );
}
