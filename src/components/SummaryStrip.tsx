import { formatDateShort, formatMoney, formatNumber } from '../lib/format';
import { Language, TEXT } from '../lib/i18n';
import { ExposureMetric, ExposureResponse } from '../types/options';

interface SummaryStripProps {
  data: ExposureResponse;
  language: Language;
}

export function SummaryStrip({ data, language }: SummaryStripProps) {
  const metric = data.metric;
  const copy = TEXT[language];
  const cards = [
    {
      label: copy.summary.totalGex,
      value: formatMoney(data.summary.totalGex, { signed: true }),
      sublabel: copy.summary.perOneMove
    },
    {
      label: copy.summary.totalVex,
      value: formatMoney(data.summary.totalVex, { signed: true }),
      sublabel: copy.summary.modelDerived
    },
    {
      label: copy.summary.zeroGamma,
      value: formatNumber(data.summary.zeroGammaEstimate, 2),
      sublabel: copy.summary.spot(formatNumber(data.quote.price, 2))
    },
    {
      label: copy.summary.callWall,
      value: formatWall(data.summary.callWall.strike),
      sublabel: `${metricLabel(metric)} ${formatMoney(data.summary.callWall.value, { signed: true })}`
    },
    {
      label: copy.summary.putWall,
      value: formatWall(data.summary.putWall.strike),
      sublabel: `${metricLabel(metric)} ${formatMoney(data.summary.putWall.value, { signed: true })}`
    },
    {
      label: copy.summary.topExpiration,
      value: data.summary.topExpiration.expiration ? formatDateShort(data.summary.topExpiration.expiration, language) : '-',
      sublabel: formatMoney(data.summary.topExpiration.value, { signed: true })
    }
  ];

  return (
    <section className="summary-strip" aria-label={copy.summary.exposureSummary}>
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
