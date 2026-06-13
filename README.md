# Options GEX/VEX Heatmap

A local desktop web app for inspecting options gamma exposure (GEX) and model-derived vanna exposure (VEX) by strike and expiration.

The public default is demo-only sample data. Optional Moomoo/Futu OpenD support is still included for local use, but the app will not connect to OpenD unless you explicitly opt in.

## Requirements

- Node.js 20 or newer.
- npm, included with Node.js.
- No brokerage account is required for the default demo mode.
- A Moomoo/Futu account is required only if you want to use local live OpenD data.

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

## Optional Live Data With Moomoo/Futu OpenD

Live data is optional and runs through your own local Moomoo/Futu OpenD gateway. This repository does not include your account credentials or API keys.

Before enabling live data:

1. Create or use an existing Moomoo/Futu account that has access to the market data you want to view.
2. Download and install Moomoo OpenD from the official OpenAPI download page: `https://www.moomoo.com/download/OpenAPI`.
3. Start OpenD locally and log in inside OpenD with your Moomoo/Futu account.
4. Install the Python SDK in the Python environment you want the app to use:

```powershell
pip install moomoo-api
```

5. Copy `.env.example` to `.env.local`, then set the local OpenD options:

```env
OPTIONS_PROVIDER=moomoo
MOOMOO_OPEND_HOST=127.0.0.1
MOOMOO_OPEND_PORT=11111
MOOMOO_PYTHON=python
MOOMOO_AUTO_CONNECT=false
```

Use `OPTIONS_PROVIDER=moomoo` when you explicitly want live OpenD data. Keep `MOOMOO_AUTO_CONNECT=false` unless you want `auto` mode to try OpenD before falling back to demo.

OpenD is a local gateway used by Moomoo/Futu API programs. The Python SDK connects to that gateway on the configured host and port. Account login and permissions are handled by OpenD, not by this repository.

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
