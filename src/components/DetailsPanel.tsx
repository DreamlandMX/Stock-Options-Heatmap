import { useState } from 'react';
import { X } from 'lucide-react';
import { getCellMetric } from '../lib/exposure';
import { formatAge, formatDateShort, formatMoney, formatNumber, formatPercent } from '../lib/format';
import { Language, localizeAssumption, localizeSourceName, TEXT } from '../lib/i18n';
import { ExposureCell, ExposureResponse } from '../types/options';

type DetailTab = 'summary' | 'breakdown';

interface DetailsPanelProps {
  data: ExposureResponse;
  cell?: ExposureCell;
  onClose: () => void;
  language: Language;
}

export function DetailsPanel({ data, cell, onClose, language }: DetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');
  const copy = TEXT[language];

  if (!cell) {
    return (
      <aside className="details-panel empty-panel">
        <div className="panel-title-row">
          <h2>{copy.details.cellDetails}</h2>
        </div>
        <p>{copy.details.emptyPrompt}</p>
      </aside>
    );
  }

  const netValue = getCellMetric(cell, data.metric);
  const callValue = data.metric === 'gex' ? cell.callGex : cell.callVex;
  const putValue = data.metric === 'gex' ? cell.putGex : cell.putVex;
  const netClass = netValue >= 0 ? 'positive' : 'negative';

  return (
    <aside className="details-panel" aria-label={copy.details.selectedCellDetails}>
      <div className="panel-title-row">
        <h2>{copy.details.cellDetails}</h2>
        <button className="icon-button panel-close" onClick={onClose} type="button" aria-label={copy.details.clearSelectedCell}>
          <X size={18} />
        </button>
      </div>

      <div className="panel-tabs" role="tablist" aria-label={copy.details.tabs}>
        <button
          aria-selected={activeTab === 'summary'}
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
          role="tab"
          type="button"
        >
          {copy.details.summary}
        </button>
        <button
          aria-selected={activeTab === 'breakdown'}
          className={activeTab === 'breakdown' ? 'active' : ''}
          onClick={() => setActiveTab('breakdown')}
          role="tab"
          type="button"
        >
          {copy.details.breakdown}
        </button>
      </div>

      {activeTab === 'summary' ? (
        <SummaryTab
          callValue={callValue}
          cell={cell}
          data={data}
          netClass={netClass}
          netValue={netValue}
          putValue={putValue}
          language={language}
        />
      ) : (
        <BreakdownTab cell={cell} data={data} language={language} />
      )}
    </aside>
  );
}

function SummaryTab(props: {
  data: ExposureResponse;
  cell: ExposureCell;
  netValue: number;
  callValue: number;
  putValue: number;
  netClass: string;
  language: Language;
}) {
  const { data, cell, netValue, callValue, putValue, netClass, language } = props;
  const copy = TEXT[language];
  const metric = data.metric.toUpperCase();

  return (
    <>
      <CellOverview data={data} cell={cell} language={language} />

      <div className="net-card">
        <span>{copy.details.netMetric(metric)}</span>
        <strong className={netClass}>{formatMoney(netValue, { signed: true })}</strong>
        <small>{data.metric === 'vex' ? copy.details.vexUnit : copy.details.gexUnit}</small>
      </div>

      <div className="split-metrics">
        <div>
          <span>{copy.details.callMetric(metric)}</span>
          <strong className={callValue >= 0 ? 'positive' : 'negative'}>{formatMoney(callValue, { signed: true })}</strong>
        </div>
        <div>
          <span>{copy.details.putMetric(metric)}</span>
          <strong className={putValue >= 0 ? 'positive' : 'negative'}>{formatMoney(putValue, { signed: true })}</strong>
        </div>
      </div>

      <h3>{copy.details.keyMetrics}</h3>
      <dl className="metric-list">
        <div>
          <dt>{copy.details.callOi}</dt>
          <dd>{formatNumber(cell.callOi, 0)}</dd>
        </div>
        <div>
          <dt>{copy.details.putOi}</dt>
          <dd>{formatNumber(cell.putOi, 0)}</dd>
        </div>
        <div>
          <dt>{copy.details.gammaCall}</dt>
          <dd>{cell.callGamma.toFixed(5)}</dd>
        </div>
        <div>
          <dt>{copy.details.gammaPut}</dt>
          <dd>{cell.putGamma.toFixed(5)}</dd>
        </div>
        <div>
          <dt>{copy.details.vannaCall}</dt>
          <dd>{cell.callVanna.toFixed(5)}</dd>
        </div>
        <div>
          <dt>{copy.details.vannaPut}</dt>
          <dd>{cell.putVanna.toFixed(5)}</dd>
        </div>
        <div>
          <dt>{copy.details.ivMid}</dt>
          <dd>{formatPercent(cell.ivMid * 100)}</dd>
        </div>
        <div>
          <dt>{copy.details.contracts}</dt>
          <dd>{cell.contractCount}</dd>
        </div>
      </dl>

      <SourceBlock cell={cell} language={language} />
    </>
  );
}

function BreakdownTab({ data, cell, language }: { data: ExposureResponse; cell: ExposureCell; language: Language }) {
  const copy = TEXT[language];
  const rows = [
    {
      side: copy.details.call,
      gex: cell.callGex,
      vex: cell.callVex,
      oi: cell.callOi,
      gamma: cell.callGamma,
      vanna: cell.callVanna
    },
    {
      side: copy.details.put,
      gex: cell.putGex,
      vex: cell.putVex,
      oi: cell.putOi,
      gamma: cell.putGamma,
      vanna: cell.putVanna
    }
  ];

  return (
    <div className="breakdown-stack">
      <CellOverview data={data} cell={cell} language={language} />

      <h3>{copy.details.exposureBreakdown}</h3>
      <div className="breakdown-table" role="table" aria-label={copy.details.callPutBreakdown}>
        <div className="breakdown-row breakdown-head" role="row">
          <span role="columnheader">{copy.details.side}</span>
          <span role="columnheader">GEX</span>
          <span role="columnheader">VEX</span>
        </div>
        {rows.map((row) => (
          <div className="breakdown-row" role="row" key={row.side}>
            <span role="cell">{row.side}</span>
            <strong className={row.gex >= 0 ? 'positive' : 'negative'} role="cell">
              {formatMoney(row.gex, { signed: true })}
            </strong>
            <strong className={row.vex >= 0 ? 'positive' : 'negative'} role="cell">
              {formatMoney(row.vex, { signed: true })}
            </strong>
          </div>
        ))}
        <div className="breakdown-row net" role="row">
          <span role="cell">{copy.details.net}</span>
          <strong className={cell.netGex >= 0 ? 'positive' : 'negative'} role="cell">
            {formatMoney(cell.netGex, { signed: true })}
          </strong>
          <strong className={cell.netVex >= 0 ? 'positive' : 'negative'} role="cell">
            {formatMoney(cell.netVex, { signed: true })}
          </strong>
        </div>
      </div>

      <h3>{copy.details.sideInputs}</h3>
      <div className="side-input-grid">
        {rows.map((row) => (
          <section key={row.side} className="side-input-card">
            <strong>{row.side}</strong>
            <dl>
              <div>
                <dt>{copy.details.openInterest}</dt>
                <dd>{formatNumber(row.oi, 0)}</dd>
              </div>
              <div>
                <dt>{copy.details.avgGamma}</dt>
                <dd>{row.gamma.toFixed(5)}</dd>
              </div>
              <div>
                <dt>{copy.details.avgVanna}</dt>
                <dd>{row.vanna.toFixed(5)}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>

      <h3>{copy.details.modelNotes}</h3>
      <ul className="assumption-list">
        {data.assumptions.map((assumption) => (
          <li key={assumption}>{localizeAssumption(assumption, language)}</li>
        ))}
      </ul>

      <SourceBlock cell={cell} language={language} />
    </div>
  );
}

function CellOverview({ data, cell, language }: { data: ExposureResponse; cell: ExposureCell; language: Language }) {
  const copy = TEXT[language];

  return (
    <dl className="detail-list">
      <div>
        <dt>{copy.details.strike}</dt>
        <dd>{formatNumber(cell.strike, Number.isInteger(cell.strike) ? 0 : 1)}</dd>
      </div>
      <div>
        <dt>{copy.details.expiration}</dt>
        <dd>
          {cell.expiration} ({formatDateShort(cell.expiration, language)})
        </dd>
      </div>
      <div>
        <dt>{copy.details.underlying}</dt>
        <dd>
          {data.quote.symbol} {formatNumber(data.quote.price, 2)}
        </dd>
      </div>
    </dl>
  );
}

function SourceBlock({ cell, language }: { cell: ExposureCell; language: Language }) {
  const copy = TEXT[language];

  return (
    <div className="source-block">
      <div>
        <span>{copy.details.source}</span>
        <strong>{localizeSourceName(cell.source, language)}</strong>
      </div>
      <div>
        <span>{copy.details.dataUpdated}</span>
        <strong>{formatAge(cell.updatedAt, new Date(), language)}</strong>
      </div>
      {cell.stale ? <p className="warning-text">{copy.details.staleWarning}</p> : null}
    </div>
  );
}
