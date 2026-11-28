# Trading Lab — practise what the notes explain

Theory with diagrams: `../learn.html`. This is the doing half.

Open `trading-lab.html` in any browser. Double-click it. No install, no server,
no internet, no account. Keep `lab.js` next to it.

Fake money (₹5,00,000), fake market, real mechanics: real order types, real fees,
real slippage, real gaps that jump past your stop.

## What's in it

- **Candlestick chart** with volume, SMA 20/50, Bollinger bands, RSI — toggle each
  from the chips in the toolbar. Scroll to zoom, hover for a crosshair + OHLC readout.
- **Seven scenarios**, each teaching one thing: uptrend with pullbacks, downtrend,
  sideways chop, crash + recovery, bubble + pop, quarterly earnings gaps, and a pure
  random walk. The note under the chart says what to practise. Reset generates a
  fresh market from the same scenario.
- **Orders**: market, limit, stop, plus optional stop-loss / take-profit brackets
  (one fills, the other cancels). Short selling allowed.
- **Position sizer** — enter risk %, entry and stop; it tells you the quantity.
  This is `../05-not-losing-money/risk-and-position-sizing.md` as a button.
- **Account panel** — equity, realised P&L, fees paid, return, max drawdown.
  Watch the fees line while you overtrade the chop scenario. That's the lesson.
- **Levels** — press `L` to mark support/resistance at the crosshair.

Keys: `space` play/pause · `→` step one tick · `b` buy · `s` sell · `l` level.

## How to use it so it teaches something

1. Pick one scenario and one thing to practise. Not "make money".
2. Before each trade, write the line in `../07-before-real-money/paper-trading-log.md`: setup, thesis,
   stop, target. Before, never after.
3. Trade it. Step bar by bar if you want to think.
4. Score the **process**, not the outcome. A stopped-out trade with a written
   thesis and correct size is a good trade.

## The honest limits

Prices here are generated from a random process with a drift. There is no company,
no earnings, no news to read, and no other participants reacting to you. So the lab
can teach **mechanics, risk, sizing and your own behaviour** — which is most of what
kills beginners — and it cannot teach you to value a business. That part is the
notes in the folder above.

## Checking the maths

`node selftest.js` — asserts the fill, P&L, bracket/OCO and limit/stop logic.
Run it after any edit to `lab.js`.
