import argparse
import datetime as dt
import json
import sys
from typing import Any, Iterable


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch option chain data from Moomoo/Futu OpenD.")
    parser.add_argument("--ticker", required=True)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=11111)
    parser.add_argument("--expirations", type=int, default=9)
    parser.add_argument("--strike-range", type=float, default=15)
    args = parser.parse_args()

    try:
        from moomoo import OpenQuoteContext, RET_OK
    except Exception as exc:
        raise SystemExit(
            "Python package moomoo-api is not installed. Install it in MOOMOO_PYTHON with: pip install moomoo-api"
        ) from exc

    quote_ctx = OpenQuoteContext(host=args.host, port=args.port)
    try:
        stock_code = normalize_stock_code(args.ticker)
        quote = fetch_underlying_quote(quote_ctx, stock_code)
        chain_rows = fetch_option_chain(quote_ctx, stock_code, args.expirations)
        filtered_rows = filter_chain(chain_rows, quote["price"], args.expirations, args.strike_range)
        option_codes = [row.get("code") for row in filtered_rows if row.get("code")]
        snapshots = fetch_snapshots(quote_ctx, option_codes)
        contracts = [normalize_contract(row, snapshots.get(row.get("code"), {}), quote) for row in filtered_rows]
        print(json.dumps({"quote": quote, "contracts": contracts}, ensure_ascii=False))
    finally:
        quote_ctx.close()

    return 0


def fetch_underlying_quote(quote_ctx: Any, stock_code: str) -> dict[str, Any]:
    ret, data = quote_ctx.get_market_snapshot([stock_code])
    if ret != 0:
        raise RuntimeError(str(data))
    rows = dataframe_records(data)
    if not rows:
        raise RuntimeError(f"No underlying snapshot returned for {stock_code}")

    row = rows[0]
    price = number_by_alias(row, ["last_price", "cur_price", "price", "close"])
    prev_close = number_by_alias(row, ["prev_close_price", "prev_close", "pre_close"], price)
    change = number_by_alias(row, ["change", "net_change"], price - prev_close)
    change_pct = number_by_alias(row, ["change_rate", "change_ratio", "pct_chg"], (change / prev_close) if prev_close else 0)

    return {
        "symbol": stock_code,
        "price": price,
        "previousClose": prev_close,
        "change": change,
        "changePercent": change_pct * 100 if abs(change_pct) <= 1 else change_pct,
        "updatedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
    }


def fetch_option_chain(quote_ctx: Any, stock_code: str, expirations: int) -> list[dict[str, Any]]:
    today = dt.date.today()
    max_days = min(365, max(30, expirations * 14))
    final_end = today + dt.timedelta(days=max_days)
    window_start = today
    rows: list[dict[str, Any]] = []
    seen_codes: set[str] = set()
    seen_expirations: set[str] = set()

    while window_start <= final_end and len(seen_expirations) < expirations:
        window_end = min(window_start + dt.timedelta(days=29), final_end)
        try:
            ret, data = quote_ctx.get_option_chain(
                stock_code,
                start=window_start.isoformat(),
                end=window_end.isoformat(),
            )
        except TypeError:
            ret, data = quote_ctx.get_option_chain(stock_code, window_start.isoformat(), window_end.isoformat())
        if ret != 0:
            raise RuntimeError(str(data))

        for row in dataframe_records(data):
            code = str(row.get("code") or "")
            if code and code in seen_codes:
                continue
            if code:
                seen_codes.add(code)
            rows.append(row)
            seen_expirations.add(normalize_expiration(value_by_alias(row, ["strike_time", "expiration", "expiry"])))

        window_start = window_end + dt.timedelta(days=1)

    return rows


def fetch_snapshots(quote_ctx: Any, codes: list[str]) -> dict[str, dict[str, Any]]:
    snapshots: dict[str, dict[str, Any]] = {}
    for chunk in chunks(codes, 300):
        ret, data = quote_ctx.get_market_snapshot(chunk)
        if ret != 0:
            continue
        for row in dataframe_records(data):
            code = row.get("code")
            if code:
                snapshots[str(code)] = row
    return snapshots


def filter_chain(rows: list[dict[str, Any]], spot: float, expiration_count: int, strike_range: float) -> list[dict[str, Any]]:
    lower = spot * (1 - strike_range / 100)
    upper = spot * (1 + strike_range / 100)
    expirations = sorted({normalize_expiration(value_by_alias(row, ["strike_time", "expiration", "expiry"])) for row in rows})
    allowed_expirations = set(expirations[:expiration_count])

    filtered = []
    for row in rows:
        expiration = normalize_expiration(value_by_alias(row, ["strike_time", "expiration", "expiry"]))
        strike = number_by_alias(row, ["strike_price", "strike", "exercise_price"], 0)
        if expiration in allowed_expirations and lower <= strike <= upper:
            filtered.append(row)
    return filtered


def normalize_contract(row: dict[str, Any], snapshot: dict[str, Any], quote: dict[str, Any]) -> dict[str, Any]:
    merged = {**row, **snapshot}
    option_type = normalize_option_type(value_by_alias(merged, ["option_type", "type", "call_put"]))
    expiration = normalize_expiration(value_by_alias(merged, ["strike_time", "expiration", "expiry"]))
    iv = number_by_alias(merged, ["option_implied_volatility", "implied_volatility", "iv"], 0)
    if iv > 3:
        iv = iv / 100

    return {
        "optionSymbol": value_by_alias(merged, ["code", "option_symbol", "symbol"]),
        "optionType": option_type,
        "strike": number_by_alias(merged, ["strike_price", "strike", "exercise_price"], 0),
        "expiration": expiration,
        "openInterest": number_by_alias(merged, ["option_open_interest", "open_interest", "oi"], 0),
        "volume": number_by_alias(merged, ["volume", "option_volume"], 0),
        "contractSize": number_by_alias(merged, ["option_contract_size", "contract_size", "lot_size"], 100),
        "impliedVolatility": iv,
        "gamma": number_by_alias(merged, ["option_gamma", "gamma"], 0),
        "delta": number_by_alias(merged, ["option_delta", "delta"], 0),
        "vanna": number_by_alias(merged, ["option_vanna", "vanna"], None),
        "vega": number_by_alias(merged, ["option_vega", "vega"], None),
        "theta": number_by_alias(merged, ["option_theta", "theta"], None),
        "rho": number_by_alias(merged, ["option_rho", "rho"], None),
        "bid": number_by_alias(merged, ["bid_price", "bid"], None),
        "ask": number_by_alias(merged, ["ask_price", "ask"], None),
        "last": number_by_alias(merged, ["last_price", "cur_price", "last"], None),
        "updatedAt": quote["updatedAt"],
    }


def dataframe_records(data: Any) -> list[dict[str, Any]]:
    if hasattr(data, "to_dict"):
        return data.to_dict("records")
    if isinstance(data, list):
        return data
    return []


def value_by_alias(row: dict[str, Any], aliases: list[str], default: Any = None) -> Any:
    for alias in aliases:
        value = row.get(alias)
        if value not in (None, ""):
            return value
    return default


def number_by_alias(row: dict[str, Any], aliases: list[str], default: Any = 0) -> Any:
    value = value_by_alias(row, aliases, default)
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_stock_code(ticker: str) -> str:
    ticker = ticker.upper().strip()
    if "." in ticker:
        return ticker
    return f"US.{ticker}"


def normalize_option_type(value: Any) -> str:
    text = str(value).lower()
    if "call" in text or text in {"c", "1"}:
        return "call"
    if "put" in text or text in {"p", "2"}:
        return "put"
    return text


def normalize_expiration(value: Any) -> str:
    text = str(value or "")[:10].replace("/", "-")
    try:
        return dt.date.fromisoformat(text).isoformat()
    except ValueError:
        return text


def chunks(values: list[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(values), size):
        yield values[index : index + size]


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1)
