import { useState } from 'react';
import { X } from 'lucide-react';
import { getCellMetric } from '../lib/exposure';
import { formatAge, formatDateShort, formatMoney, formatNumber, formatPercent } from '../lib/format';
import { ExposureCell, ExposureMetric, ExposureResponse } from '../types/options';

type DetailTab = 'summary' | 'breakdown';

interface DetailsPanelProps {
  data: ExposureResponse;
  cell?: ExposureCell;
  onClose: () => void;
}

export function DetailsPanel({ data, cell, onClose }: DetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<DetailTab>('summary');

  if (!cell) {
    return (
      <aside className="details-panel empty-panel">
        <div className="panel-title-row">
          <h2>Cell Details</h2>
        </div>
        <p>Select any heatmap cell to inspect contract-level exposure inputs.</p>
      </aside>
    );
  }

  const netValue = getCellMetric(cell, data.metric);
  const callValue = data.metric === 'gex' ? cell.callGex : cell.callVex;
  const putValue = data.metric === 'gex' ? cell.putGex : cell.putVex;
  const netClass = netValue >= 0 ? 'positive' : 'negative';

  return (
    <aside className="details-panel" aria-label="Selected cell details">
      <div className="panel-title-row">
        <h2>Cell Details</h2>
        <button className="icon-button panel-close" onClick={onClose} type="button" aria-label="Clear selected cell">
          <X size={18} />
        </button>
      </div>

      <div className="panel-tabs" role="tablist" aria-label="Cell detail tabs">
        <button
          aria-selected={activeTab === 'summary'}
          className={activeTab === 'summary' ? 'active' : ''}
          onClick={() => setActiveTab('summary')}
          role="tab"
          type="button"
        >
          Summary
        </button>
        <button
          aria-selected={activeTab === 'breakdown'}
          className={activeTab === 'breakdown' ? 'active' : ''}
          onClick={() => setActiveTab('breakdown')}
          role="tab"
          type="button"
        >
          Breakdown
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
        />
      ) : (
        <BreakdownTab cell={cell} data={data} />
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
}) {
  const { data, cell, netValue, callValue, putValue, netClass } = props;

  return (
    <>
      <CellOverview data={data} cell={cell} />

      <div className="net-card">
        <span>Net {data.metric.toUpperCase()}</span>
        <strong className={netClass}>{formatMoney(netValue, { signed: true })}</strong>
        <small>{data.metric === 'vex' ? 'model-derived per 1% vol move' : 'per 1% underlying move'}</small>
      </div>

      <div className="split-metrics">
        <div>
          <span>Call {data.metric.toUpperCase()}</span>
          <strong className={callValue >= 0 ? 'positive' : 'negative'}>{formatMoney(callValue, { signed: true })}</strong>
        </div>
        <div>
          <span>Put {data.metric.toUpperCase()}</span>
          <strong className={putValue >= 0 ? 'positive' : 'negative'}>{formatMoney(putValue, { signed: true })}</strong>
        </div>
      </div>

      <h3>Key Metrics</h3>
      <dl className="metric-list">
        <div>
          <dt>Call OI</dt>
          <dd>{formatNumber(cell.callOi, 0)}</dd>
        </div>
        <div>
          <dt>Put OI</dt>
          <dd>{formatNumber(cell.putOi, 0)}</dd>
        </div>
        <div>
          <dt>Gamma Call</dt>
          <dd>{cell.callGamma.toFixed(5)}</dd>
        </div>
        <div>
          <dt>Gamma Put</dt>
          <dd>{cell.putGamma.toFixed(5)}</dd>
        </div>
        <div>
          <dt>Vanna Call</dt>
          <dd>{cell.callVanna.toFixed(5)}</dd>
        </div>
        <div>
          <dt>Vanna Put</dt>
          <dd>{cell.putVanna.toFixed(5)}</dd>
        </div>
        <div>
          <dt>IV Mid</dt>
          <dd>{formatPercent(cell.ivMid * 100)}</dd>
        </div>
        <div>
          <dt>Contracts</dt>
          <dd>{cell.contractCount}</dd>
        </div>
      </dl>

      <SourceBlock cell={cell} />
    </>
  );
}

function BreakdownTab({ data, cell }: { data: ExposureResponse; cell: ExposureCell }) {
  const rows = [
    {
      side: 'Call',
      gex: cell.callGex,
      vex: cell.callVex,
      oi: cell.callOi,
      gamma: cell.callGamma,
      vanna: cell.callVanna
    },
    {
      side: 'Put',
      gex: cell.putGex,
      vex: cell.putVex,
      oi: cell.putOi,
      gamma: cell.putGamma,
      vanna: cell.putVanna
    }
  ];

  return (
    <div className="breakdown-stack">
      <CellOverview data={data} cell={cell} />

      <h3>Exposure Breakdown</h3>
      <div className="breakdown-table" role="table" aria-label="Call and put exposure breakdown">
        <div className="breakdown-row breakdown-head" role="row">
          <span role="columnheader">Side</span>
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
          <span role="cell">Net</span>
          <strong className={cell.netGex >= 0 ? 'positive' : 'negative'} role="cell">
            {formatMoney(cell.netGex, { signed: true })}
          </strong>
          <strong className={cell.netVex >= 0 ? 'positive' : 'negative'} role="cell">
            {formatMoney(cell.netVex, { signed: true })}
          </strong>
        </div>
      </div>

      <h3>Side Inputs</h3>
      <div className="side-input-grid">
        {rows.map((row) => (
          <section key={row.side} className="side-input-card">
            <strong>{row.side}</strong>
            <dl>
              <div>
                <dt>Open Interest</dt>
                <dd>{formatNumber(row.oi, 0)}</dd>
              </div>
              <div>
                <dt>Avg Gamma</dt>
                <dd>{row.gamma.toFixed(5)}</dd>
              </div>
              <div>
                <dt>Avg Vanna</dt>
                <dd>{row.vanna.toFixed(5)}</dd>
              </div>
            </dl>
          </section>
        ))}
      </div>

      <h3>Model Notes</h3>
      <ul className="assumption-list">
        {data.assumptions.map((assumption) => (
          <li key={assumption}>{assumption}</li>
        ))}
      </ul>

      <SourceBlock cell={cell} />
    </div>
  );
}

function CellOverview({ data, cell }: { data: ExposureResponse; cell: ExposureCell }) {
  return (
    <dl className="detail-list">
      <div>
        <dt>Strike</dt>
        <dd>{formatNumber(cell.strike, Number.isInteger(cell.strike) ? 0 : 1)}</dd>
      </div>
      <div>
        <dt>Expiration</dt>
        <dd>
          {cell.expiration} ({formatDateShort(cell.expiration)})
        </dd>
      </div>
      <div>
        <dt>Underlying</dt>
        <dd>
          {data.quote.symbol} {formatNumber(data.quote.price, 2)}
        </dd>
      </div>
    </dl>
  );
}

function SourceBlock({ cell }: { cell: ExposureCell }) {
  return (
    <div className="source-block">
      <div>
        <span>Source</span>
        <strong>{cell.source}</strong>
      </div>
      <div>
        <span>Data Updated</span>
        <strong>{formatAge(cell.updatedAt)}</strong>
      </div>
      {cell.stale ? <p className="warning-text">This cell has stale quote inputs.</p> : null}
    </div>
  );
}
