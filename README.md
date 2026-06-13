# Options GEX/VEX Heatmap

A local desktop web app for inspecting options gamma exposure (GEX) and model-derived vanna exposure (VEX) by strike and expiration.

The public default is demo-only sample data. Optional Moomoo/Futu OpenD support is still included for local use, but the app will not connect to OpenD unless you explicitly opt in.

## Quick Start

```powershell
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173`.

## Data Modes

- `demo`: deterministic sample chain data for SPY, QQQ, TSLA, VIX, and SPXW.
- `auto`: uses demo data by default. If `MOOMOO_AUTO_CONNECT=true` is set locally, it tries Moomoo/Futu OpenD and falls back to demo with a visible warning.
- `moomoo`: explicitly tries the local OpenD path and still falls back to demo so the app remains usable.

To try live data locally, create `.env.local` from `.env.example`, run Moomoo OpenD on your machine, and set `OPTIONS_PROVIDER=moomoo` or `MOOMOO_AUTO_CONNECT=true`. The Python environment named by `MOOMOO_PYTHON` must have `moomoo-api` installed.

Do not commit `.env.local`, `.venv/`, `node_modules/`, or `dist/`; they are local/generated files.

## Metrics

GEX is calculated per 1% underlying move:

```text
gamma * openInterest * contractSize * spot^2 * 0.01
```

Calls are treated as positive exposure and puts as negative exposure.

VEX is model-derived when provider vanna is absent. The app uses Black-Scholes vanna:

```text
vanna = -phi(d1) * d2 / iv
```

and scales it by open interest, contract size, spot, and a 1% volatility move. This is an exposure estimate, not a broker-certified metric.

## Disclaimer

This tool is for informational and research use only. It is not investment advice and does not place trades.
