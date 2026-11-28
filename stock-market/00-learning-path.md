# Stock market — learning path (theory first, no money in yet)

Himanshu is new to the market. The rule for this folder: **theory only, no trades
until a concept is written down here in his own words.** Each concept gets its own
note in `stock-market/`. This file is the running order and the status board.

**Practise alongside:** `lab/trading-lab.html` — a full trading terminal that runs
in the browser with fake money and real mechanics. Double-click it. See `lab/README.md`.

## Order (don't skip ahead)

**1. What the thing actually is** — `01-what-it-is/`
- `what-is-a-share.md` — ownership, not a lottery ticket. Why companies sell it.
- `primary-vs-secondary-market.md` — IPO vs. everything after. Where your money goes.
- `exchanges-and-brokers.md` — NSE/BSE, demat, broker, settlement (T+1).
- `indices.md` — Nifty 50, Sensex. What an index does and doesn't tell you.

**2. How price happens** — `02-how-price-moves/`
- `order-book-and-order-types.md` — bid/ask, market vs. limit, slippage.
- `what-moves-price.md` — earnings, rates, flows, news, sentiment. Supply/demand underneath.
- `market-participants.md` — retail, FII/DII, promoters, operators.

**3. Reading a company (fundamental)** — `03-reading-a-company/`
- `financial-statements.md` — P&L, balance sheet, cash flow. Cash flow is the honest one.
- `key-ratios.md` — P/E, P/B, ROE, ROCE, debt/equity, margins. What each hides.
- `valuation.md` — price vs. value, DCF idea, why cheap ≠ good.
- `moats-and-business-quality.md` — why one company earns more than another, for longer.

**4. Reading a chart (technical) — later, and lightly** — `04-reading-a-chart/`
- `charts-basics.md` — candles, trend, support/resistance, volume.
- `why-technicals-mislead-beginners.md` — the trap of pattern-matching noise.

**5. Not losing money (the part that actually decides outcomes)** — `05-not-losing-money/`
- `risk-and-position-sizing.md` — how much per idea, worst-case first.
- `diversification-and-correlation.md`
- `behavioral-traps.md` — FOMO, anchoring, loss aversion, revenge trading.
- `fees-slippage-and-taxes.md` — the silent drag.

**6. Instruments beyond stocks** — `06-instruments/`
- `mutual-funds-and-etfs.md` — index funds, SIP, expense ratio.
- `bonds-and-fixed-income.md` — rates up, bond price down. Why.
- `derivatives-basics.md` — F&O. Read, do not touch.

**7. Before the first rupee** — `07-before-real-money/`
- `my-investing-thesis.md` — goal, horizon, risk tolerance, what he will and won't buy.
- `paper-trading-log.md` — decisions and reasons, scored later against outcomes.

All 22 notes above are written. Read them in order, one sitting each, and after
every section go do the matching thing in the lab:

| After section | Do this in `lab/trading-lab.html` |
|---|---|
| 2 — how price happens | Place a market vs. a limit order. Compare the fill you got. |
| 4 — charts | Mark levels with `L` *before* price gets there, then step bar by bar. |
| 5 — risk | Use the position sizer on every trade. Watch max drawdown, not profit. |
| 5 — behaviour | Run "Sideways chop" for 100 bars. Read the fees line afterwards. |
| 5 — behaviour | Run "Pure random walk". Notice yourself seeing patterns in nothing. |

## Rules for this folder

- One concept per file. A note covering three things gets found for none of them.
- Write the conclusion, not the lecture: "X means Y, and it matters because Z."
- End each note with **"How I'd get this wrong"** — the beginner failure mode.
- Nothing here is advice. It's his own notes, and past market behaviour doesn't
  promise future behaviour.
