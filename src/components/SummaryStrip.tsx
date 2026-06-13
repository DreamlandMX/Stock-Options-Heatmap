import { formatDateShort, formatMoney, formatNumber } from '../lib/format';
import { ExposureMetric, ExposureResponse } from '../types/options';

interface SummaryStripProps {
  data: ExposureResponse;
}

export function SummaryStrip({ data }: SummaryStripProps) {
  const metric = data.metric;
  const cards = [
    {
      label: 'Total GEX',
      value: formatMoney(data.summary.totalGex, { signed: true }),
      sublabel: 'per 1% move'
    },
    {
      label: 'Total VEX',
      value: formatMoney(data.summary.totalVex, { signed: true }),
      sublabel: 'model-derived'
    },
    {
      label: 'Zero Gamma Est.',
      value: formatNumber(data.summary.zeroGammaEstimate, 2),
      sublabel: `Spot ${formatNumber(data.quote.price, 2)}`
    },
    {
      label: 'Call Wall',
      value: formatWall(data.summary.callWall.strike),
      sublabel: `${metricLabel(metric)} ${formatMoney(data.summary.callWall.value, { signed: true })}`
    },
    {
      label: 'Put Wall',
      value: formatWall(data.summary.putWall.strike),
      sublabel: `${metricLabel(metric)} ${formatMoney(data.summary.putWall.value, { signed: true })}`
    },
    {
      label: 'Top Expiration',
      value: data.summary.topExpiration.expiration ? formatDateShort(data.summary.topExpiration.expiration) : '-',
      sublabel: formatMoney(data.summary.topExpiration.value, { signed: true })
    }
  ];

  return (
    <section className="summary-strip" aria-label="Exposure summary">
      {cards.map((card) => (
        <article className="summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong className={card.value.startsWith('-') ? 'negative' : 'positive'}>{card.value}</strong>
          <small>{card.sublabel}</small>
        </article>
      ))}
    </section>
  );
}

function formatWall(strike: number): string {
  if (!strike) {
    return '-';
  }
  return Number.isInteger(strike) ? `$${strike}` : `$${strike.toFixed(1)}`;
}

function metricLabel(metric: ExposureMetric): string {
  return metric.toUpperCase();
}
