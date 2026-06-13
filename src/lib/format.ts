import { Language } from './i18n';

export function formatMoney(value: number, options: { signed?: boolean; decimals?: number } = {}): string {
  const signed = options.signed ?? false;
  const decimals = options.decimals ?? 1;
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : signed && value > 0 ? '+' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}$${(abs / 1_000_000_000).toFixed(decimals)}B`;
  }

  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(decimals)}M`;
  }

  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(decimals)}K`;
  }

  return `${sign}$${abs.toFixed(0)}`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value);
}

export function formatPercent(value: number, signed = false): string {
  const sign = signed && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDateShort(value: string, language: Language = 'en-US'): string {
  const date = new Date(`${value}T00:00:00`);
  return new Intl.DateTimeFormat(language, {
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

export function formatAge(value: string, now = new Date(), language: Language = 'en-US'): string {
  const date = new Date(value);
  const seconds = Math.max(Math.floor((now.getTime() - date.getTime()) / 1000), 0);

  if (seconds < 60) {
    if (language === 'zh-CN') {
      return `${seconds}秒前`;
    }
    return `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    if (language === 'zh-CN') {
      return `${minutes}分钟前`;
    }
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (language === 'zh-CN') {
    return `${hours}小时前`;
  }
  return `${hours}h ago`;
}
