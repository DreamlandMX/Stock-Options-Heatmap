import { Filter } from 'lucide-react';
import { getCellMetric } from '../lib/exposure';
import { formatDateShort, formatMoney, formatNumber } from '../lib/format';
import { Language, TEXT } from '../lib/i18n';
import { ExposureCell, ExposureMetric, ExposureResponse } from '../types/options';

interface HeatmapGridProps {
  data: ExposureResponse;
  selectedCellKey?: string;
  onSelectCell: (cell: ExposureCell) => void;
  language: Language;
}

export function HeatmapGrid({ data, selectedCellKey, onSelectCell, language }: HeatmapGridProps) {
  const cellMap = new Map(data.cells.map((cell) => [cell.key, cell]));
  const maxAbs = Math.max(...data.cells.map((cell) => Math.abs(getCellMetric(cell, data.metric))), 1);
  const nearestStrike = findNearestStrike(data.strikes, data.quote.price);
  const copy = TEXT[language];
  const heatmapLabel = copy.heatmap.heatmapLabel(data.metric.toUpperCase());

  return (
    <section className="heatmap-card" aria-label={heatmapLabel}>
      <div
        className="heatmap-grid"
        role="grid"
        aria-label={heatmapLabel}
        style={{ gridTemplateColumns: `112px repeat(${data.expirations.length}, minmax(104px, 1fr))` }}
      >
        <div className="grid-header strike-header">
          <span>{copy.heatmap.strike}</span>
          <Filter size={15} />
        </div>
        {data.expirations.map((expiration) => (
          <div className="grid-header expiry-header" key={expiration}>
            <span>{formatDateShort(expiration, language)}</span>
            <small>{daysToExpiryLabel(expiration, data.generatedAt)}</small>
          </div>
        ))}

        {data.strikes.map((strike) => (
          <StrikeRow
            key={strike}
            strike={strike}
            expirations={data.expirations}
            metric={data.metric}
            nearestStrike={nearestStrike}
            currentPrice={data.quote.price}
            cellMap={cellMap}
            maxAbs={maxAbs}
            selectedCellKey={selectedCellKey}
            onSelectCell={onSelectCell}
            language={language}
          />
        ))}
      </div>
      <HeatmapLegend metric={data.metric} language={language} />
    </section>
  );
}

function StrikeRow(props: {
  strike: number;
  expirations: string[];
  metric: ExposureMetric;
  nearestStrike: number;
  currentPrice: number;
  cellMap: Map<string, ExposureCell>;
  maxAbs: number;
  selectedCellKey?: string;
  onSelectCell: (cell: ExposureCell) => void;
  language: Language;
}) {
  const isCurrent = props.strike === props.nearestStrike;
  const copy = TEXT[props.language];

  return (
    <>
      <div className={`strike-cell ${isCurrent ? 'current' : ''}`}>
        {isCurrent ? <span className="price-arrow" /> : null}
        <span>{isCurrent ? formatNumber(props.currentPrice, 2) : formatStrike(props.strike)}</span>
      </div>
      {props.expirations.map((expiration) => {
        const cell = props.cellMap.get(`${props.strike.toFixed(4)}|${expiration}`);
        if (!cell) {
          return (
            <div className="heat-cell empty" key={expiration}>
              -
            </div>
          );
        }

        const value = getCellMetric(cell, props.metric);
        const selected = cell.key === props.selectedCellKey;
        return (
          <button
            className={`heat-cell ${selected ? 'selected' : ''} ${Math.abs(value) >= props.maxAbs * 0.96 ? 'wall' : ''}`}
            key={cell.key}
            style={{ background: heatColor(value, props.maxAbs) }}
            onClick={() => props.onSelectCell(cell)}
            type="button"
            role="gridcell"
            aria-label={copy.heatmap.cellLabel(
              props.metric.toUpperCase(),
              formatMoney(value, { signed: true }),
              props.strike,
              expiration
            )}
          >
            <span>{formatMoney(value, { signed: true })}</span>
          </button>
        );
      })}
    </>
  );
}

function HeatmapLegend({ metric, language }: { metric: ExposureMetric; language: Language }) {
  const copy = TEXT[language];

  return (
    <footer className="heatmap-legend">
      <span>{metric === 'gex' ? copy.heatmap.exposurePerUnderlyingMove : copy.heatmap.exposurePerVolMove}</span>
      <div className="legend-ramp" aria-hidden="true" />
      <div className="legend-labels">
        <span>-10M</span>
        <span>-1M</span>
        <span>0</span>
        <span>+1M</span>
        <span>+10M</span>
      </div>
      <span className="legend-wall">{copy.heatmap.highestAbsoluteWall}</span>
    </footer>
  );
}

function heatColor(value: number, maxAbs: number): string {
  const ratio = Math.min(Math.abs(value) / maxAbs, 1);
  const eased = Math.pow(ratio, 0.55);

  if (ratio > 0.96) {
    return value >= 0
      ? `linear-gradient(90deg, rgba(250, 225, 34, 0.96), rgba(97, 210, 68, 0.92))`
      : `linear-gradient(90deg, rgba(239, 210, 34, 0.95), rgba(124, 13, 98, 0.92))`;
  }

  if (value >= 0) {
    return `rgba(${Math.round(20 + eased * 33)}, ${Math.round(74 + eased * 155)}, ${Math.round(
      82 + eased * 78
    )}, ${0.26 + eased * 0.72})`;
  }

  return `rgba(${Math.round(68 + eased * 100)}, ${Math.round(36 - eased * 8)}, ${Math.round(
    106 + eased * 58
  )}, ${0.3 + eased * 0.68})`;
}

function findNearestStrike(strikes: number[], spot: number): number {
  return strikes.reduce((winner, strike) => (Math.abs(strike - spot) < Math.abs(winner - spot) ? strike : winner), strikes[0]);
}

function daysToExpiryLabel(expiration: string, generatedAt: string): string {
  const generated = new Date(generatedAt);
  const expiry = new Date(`${expiration}T20:00:00Z`);
  const days = Math.max(Math.ceil((expiry.getTime() - generated.getTime()) / 86_400_000), 0);
  return days === 0 ? '0DTE' : `${days}DTE`;
}

function formatStrike(strike: number): string {
  return Number.isInteger(strike) ? String(strike) : strike.toFixed(1);
}
