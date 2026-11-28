# Derivatives (F&O) — read this, don't trade it

A derivative derives its value from something else. Two kinds matter.

**Futures** — an obligation to buy/sell at a set price on a set date. You post
**margin** (say 15%) instead of full value, which means ~6-7x leverage, both ways.

**Options** — a *right*, not an obligation.
- **Call** = right to buy at the strike. You want price up.
- **Put** = right to sell at the strike. You want price down (also: insurance for
  shares you own).
- The buyer pays a **premium** and can only lose that premium.
- The **seller** collects the premium and takes **unlimited risk**. This is the side
  that blows up accounts.

## Simple example

Nifty at 24,000. A 24,200 call expiring next week costs ₹100 (lot 75) → ₹7,500 paid.
- Nifty at 24,500 at expiry: intrinsic 300 → ₹22,500. You tripled.
- Nifty at 24,100 at expiry: worth 0. **You lost 100% of it**, and the index was up.

Options rot. **Theta** is time decay — every day that nothing happens, the premium
drains. You can be right on direction, late on timing, and still lose everything.

## The number that should settle it

SEBI's own studies: roughly **9 out of 10 individual F&O traders lose money**, with
median losses in the tens of thousands, and aggregate retail losses running into
₹50,000+ crore a year. This isn't a warning label, it's a measured outcome.

## What it's legitimately for

Hedging (buying a put to protect a holding you can't sell) and defined-risk
expression of a view. Not leverage to make a small account big.

## How I'd get this wrong

Buying cheap weekly OTM options because the payoff table looks exciting. Cheap means
the market thinks it probably expires worthless, and the market is usually right.
