import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { aggregateExposure } from './lib/exposure';
import { LANGUAGE_STORAGE_KEY } from './lib/i18n';
import { buildDemoPayload } from './providers/demo';
import { ExposureMetric } from './types/options';

const NOW = new Date('2026-06-12T14:30:00Z');

function responseFor(url: string) {
  const parsed = new URL(url, 'http://127.0.0.1:5173');
  const ticker = parsed.searchParams.get('ticker') ?? 'SPY';
  const metric = (parsed.searchParams.get('metric') ?? 'gex') as ExposureMetric;
  return aggregateExposure(buildDemoPayload(ticker, NOW), {
    metric,
    expirationCount: Math.min(Number(parsed.searchParams.get('expirations') ?? 4), 2),
    strikeRangePercent: Math.min(Number(parsed.searchParams.get('strikeRange') ?? 5), 4),
    now: NOW
  });
}

describe('App', () => {
  beforeEach(() => {
    const storage = new Map<string, string>();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => storage.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
        removeItem: vi.fn((key: string) => storage.delete(key)),
        clear: vi.fn(() => storage.clear())
      },
      configurable: true
    });
    document.documentElement.lang = 'en';
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => ({
        ok: true,
        json: async () => responseFor(url)
      }))
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders the heatmap and selected cell detail panel', async () => {
    render(<App />);

    expect(await screen.findByText('期权热力图')).toBeInTheDocument();
    expect(await screen.findByRole('grid', { name: /GEX 热力图/i })).toBeInTheDocument();
    expect(await screen.findByText(/演示数据为确定性样本数据/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('provider=demo'), expect.any(Object));

    const cells = await screen.findAllByRole('gridcell');
    await userEvent.click(cells[0]);

    expect(screen.getByRole('complementary', { name: /已选单元格详情/i })).toBeInTheDocument();
    expect(screen.getByText('净 GEX')).toBeInTheDocument();
  });

  it('switches the cell detail panel to the breakdown tab', async () => {
    render(<App />);

    const cells = await screen.findAllByRole('gridcell');
    await userEvent.click(cells[0]);

    const panel = screen.getByRole('complementary', { name: /已选单元格详情/i });
    await userEvent.click(within(panel).getByRole('tab', { name: /拆分/i }));

    expect(within(panel).getByRole('table', { name: /Call 和 Put 敞口拆分/i })).toBeInTheDocument();
    expect(within(panel).getByText('模型说明')).toBeInTheDocument();
  });

  it('closes and reopens the cell detail panel', async () => {
    render(<App />);

    const cells = await screen.findAllByRole('gridcell');
    await userEvent.click(cells[0]);

    await userEvent.click(screen.getByRole('button', { name: /清除已选单元格/i }));
    expect(screen.queryByRole('complementary', { name: /已选单元格详情/i })).not.toBeInTheDocument();

    await userEvent.click(cells[1]);
    expect(screen.getByRole('complementary', { name: /已选单元格详情/i })).toBeInTheDocument();
  });

  it('switches to VEX and requests model-derived VEX data', async () => {
    render(<App />);

    const metricToggle = await screen.findByLabelText('指标切换');
    await userEvent.click(within(metricToggle).getByRole('button', { name: /VEX/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('metric=vex'), expect.any(Object));
    });
    expect(await screen.findByRole('grid', { name: /VEX 热力图/i })).toBeInTheDocument();
  });

  it('submits a new ticker from the search box', async () => {
    render(<App />);

    const input = await screen.findByLabelText('Ticker 代码');
    fireEvent.change(input, { target: { value: 'TSLA' } });
    await waitFor(() => expect(input).toHaveValue('TSLA'));
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ticker=TSLA'), expect.any(Object));
    });
  });

  it('opens toolbar menu and submits a quick symbol', async () => {
    render(<App />);

    await screen.findByRole('grid', { name: /GEX 热力图/i });
    await userEvent.click(screen.getByRole('button', { name: /打开菜单/i }));
    const menu = screen.getByRole('dialog', { name: /应用菜单/i });
    await userEvent.click(within(menu).getByRole('button', { name: 'AMD' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ticker=AMD'), expect.any(Object));
    });
  });

  it('opens settings and applies strike range changes', async () => {
    render(<App />);

    await screen.findByRole('grid', { name: /GEX 热力图/i });
    await userEvent.click(screen.getByRole('button', { name: /设置/i }));
    const settings = screen.getByRole('dialog', { name: /设置/i });
    fireEvent.change(within(settings).getByLabelText('行权价范围'), { target: { value: '30' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('strikeRange=30'), expect.any(Object));
    });
  });

  it('switches to English and persists the language choice', async () => {
    render(<App />);

    const languageToggle = await screen.findByLabelText('语言切换');
    await userEvent.click(within(languageToggle).getByRole('button', { name: 'EN' }));

    expect(await screen.findByText('Options Heatmap')).toBeInTheDocument();
    expect(await screen.findByRole('grid', { name: /GEX heatmap/i })).toBeInTheDocument();
    expect(screen.getByText(/Demo data is deterministic sample data/)).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('en-US');
      expect(document.documentElement.lang).toBe('en-US');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Settings' }));
    const settings = screen.getByRole('dialog', { name: 'Settings' });
    const languageSelect = within(settings).getByLabelText('Language / 语言');
    expect(languageSelect).toHaveValue('en-US');

    fireEvent.change(languageSelect, { target: { value: 'zh-CN' } });
    await waitFor(() => {
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('zh-CN');
      expect(document.documentElement.lang).toBe('zh-CN');
    });
  });
});
