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
}

export function Toolbar(props: ToolbarProps) {
  const [activePopover, setActivePopover] = useState<ActivePopover>(null);
  const changeClass = props.quote && props.quote.change >= 0 ? 'positive' : 'negative';
  const statusLabel = props.mode === 'live' ? 'OpenD live data' : 'Demo data';

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
          aria-label="Open menu"
          onClick={() => togglePopover('menu')}
          type="button"
        >
          <Menu size={22} />
        </button>
        <div className="brand">
          <span className="brand-title">Options Heatmap</span>
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
            aria-label="Ticker"
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
          <div className="quote-chip" aria-label="Underlying quote">
            <span>{formatNumber(props.quote.price, props.quote.price > 1000 ? 2 : 2)}</span>
            <span className={changeClass}>
              {formatNumber(props.quote.change, 2)} ({formatPercent(props.quote.changePercent, true)})
            </span>
          </div>
        ) : null}
      </div>

      <div className="toolbar-right">
        <div className="data-status" aria-label="Data status">
          <span className={props.mode === 'live' ? 'status-dot live' : 'status-dot demo'} />
          <span>{props.mode === 'live' ? 'OpenD' : 'Demo'}</span>
        </div>
        {props.generatedAt ? <div className="timestamp">Updated {formatAge(props.generatedAt)}</div> : null}

        <label className="select-shell desktop-control">
          <span>Provider</span>
          <select value={props.provider} onChange={(event) => props.onProviderChange(event.target.value as ProviderMode)}>
            <option value="auto">Auto</option>
            <option value="demo">Demo</option>
            <option value="moomoo">Moomoo</option>
          </select>
          <ChevronDown size={15} />
        </label>

        <div className="metric-toggle desktop-control" aria-label="Metric toggle">
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
          <span>Expirations</span>
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
          <span>Strike Range</span>
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
          Refresh
        </button>
        <button
          className="icon-button"
          aria-controls="settings-popover"
          aria-expanded={activePopover === 'settings'}
          aria-label="Settings"
          onClick={() => togglePopover('settings')}
          type="button"
        >
          <Settings size={18} />
        </button>
        <button
          className="icon-button compact-only"
          aria-controls="filters-popover"
          aria-expanded={activePopover === 'filters'}
          aria-label="Filters"
          onClick={() => togglePopover('filters')}
          type="button"
        >
          <SlidersHorizontal size={18} />
        </button>
      </div>

      {activePopover === 'menu' ? (
        <div className="toolbar-popover menu-popover" id="app-menu-popover" role="dialog" aria-label="App menu">
          <div className="popover-title-row">
            <strong>App Menu</strong>
            <span>{statusLabel}</span>
          </div>
          <div className="popover-section">
            <span className="popover-label">Quick Symbols</span>
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
              GEX View
            </button>
            <button
              className={props.metric === 'vex' ? 'active' : ''}
              onClick={() => props.onMetricChange('vex')}
              type="button"
            >
              VEX View
            </button>
          </div>
          <button className="popover-primary" onClick={props.onRefresh} type="button">
            Refresh data
          </button>
        </div>
      ) : null}

      {activePopover === 'settings' ? (
        <div className="toolbar-popover settings-popover" id="settings-popover" role="dialog" aria-label="Settings">
          <div className="popover-title-row">
            <strong>Settings</strong>
            <span>{props.generatedAt ? `Updated ${formatAge(props.generatedAt)}` : statusLabel}</span>
          </div>
          <label className="popover-field">
            <span>Provider</span>
            <select value={props.provider} onChange={(event) => props.onProviderChange(event.target.value as ProviderMode)}>
              <option value="auto">Auto</option>
              <option value="demo">Demo</option>
              <option value="moomoo">Moomoo</option>
            </select>
          </label>
          <label className="popover-field">
            <span>Expirations</span>
            <select value={props.expirations} onChange={(event) => props.onExpirationsChange(Number(event.target.value))}>
              {[4, 6, 9, 12, 14].map((value) => (
                <option key={value} value={value}>
                  {value} columns
                </option>
              ))}
            </select>
          </label>
          <label className="popover-field">
            <span>Strike Range</span>
            <select value={props.strikeRange} onChange={(event) => props.onStrikeRangeChange(Number(event.target.value))}>
              {[5, 10, 15, 20, 30].map((value) => (
                <option key={value} value={value}>
                  +/-{value}%
                </option>
              ))}
            </select>
          </label>
          <button className="popover-primary" onClick={() => setActivePopover(null)} type="button">
            Done
          </button>
        </div>
      ) : null}

      {activePopover === 'filters' ? (
        <div className="toolbar-popover filters-popover" id="filters-popover" role="dialog" aria-label="Filters">
          <div className="popover-title-row">
            <strong>Filters</strong>
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
            <span>Expirations</span>
            <select value={props.expirations} onChange={(event) => props.onExpirationsChange(Number(event.target.value))}>
              {[4, 6, 9, 12, 14].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="popover-field">
            <span>Strike Range</span>
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
