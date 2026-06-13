import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { aggregateExposure } from './lib/exposure';
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

    expect(await screen.findByText('Options Heatmap')).toBeInTheDocument();
    expect(await screen.findByRole('grid', { name: /GEX heatmap/i })).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('provider=demo'), expect.any(Object));

    const cells = await screen.findAllByRole('gridcell');
    await userEvent.click(cells[0]);

    expect(screen.getByRole('complementary', { name: /selected cell details/i })).toBeInTheDocument();
    expect(screen.getByText('Net GEX')).toBeInTheDocument();
  });

  it('switches the cell detail panel to the breakdown tab', async () => {
    render(<App />);

    const cells = await screen.findAllByRole('gridcell');
    await userEvent.click(cells[0]);

    const panel = screen.getByRole('complementary', { name: /selected cell details/i });
    await userEvent.click(within(panel).getByRole('tab', { name: /Breakdown/i }));

    expect(within(panel).getByRole('table', { name: /call and put exposure breakdown/i })).toBeInTheDocument();
    expect(within(panel).getByText('Model Notes')).toBeInTheDocument();
  });

  it('closes and reopens the cell detail panel', async () => {
    render(<App />);

    const cells = await screen.findAllByRole('gridcell');
    await userEvent.click(cells[0]);

    await userEvent.click(screen.getByRole('button', { name: /Clear selected cell/i }));
    expect(screen.queryByRole('complementary', { name: /selected cell details/i })).not.toBeInTheDocument();

    await userEvent.click(cells[1]);
    expect(screen.getByRole('complementary', { name: /selected cell details/i })).toBeInTheDocument();
  });

  it('switches to VEX and requests model-derived VEX data', async () => {
    render(<App />);

    const metricToggle = await screen.findByLabelText('Metric toggle');
    await userEvent.click(within(metricToggle).getByRole('button', { name: /VEX/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('metric=vex'), expect.any(Object));
    });
    expect(await screen.findByRole('grid', { name: /VEX heatmap/i })).toBeInTheDocument();
  });

  it('submits a new ticker from the search box', async () => {
    render(<App />);

    const input = await screen.findByLabelText('Ticker');
    fireEvent.change(input, { target: { value: 'TSLA' } });
    await waitFor(() => expect(input).toHaveValue('TSLA'));
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ticker=TSLA'), expect.any(Object));
    });
  });

  it('opens toolbar menu and submits a quick symbol', async () => {
    render(<App />);

    await screen.findByRole('grid', { name: /GEX heatmap/i });
    await userEvent.click(screen.getByRole('button', { name: /Open menu/i }));
    const menu = screen.getByRole('dialog', { name: /App menu/i });
    await userEvent.click(within(menu).getByRole('button', { name: 'AMD' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('ticker=AMD'), expect.any(Object));
    });
  });

  it('opens settings and applies strike range changes', async () => {
    render(<App />);

    await screen.findByRole('grid', { name: /GEX heatmap/i });
    await userEvent.click(screen.getByRole('button', { name: /Settings/i }));
    const settings = screen.getByRole('dialog', { name: /Settings/i });
    fireEvent.change(within(settings).getByLabelText('Strike Range'), { target: { value: '30' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('strikeRange=30'), expect.any(Object));
    });
  });
});
