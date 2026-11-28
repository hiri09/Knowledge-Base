# Order book and order types (how a price is actually made)

There is no single "price". There are two: the highest someone will **pay** (bid) and
the lowest someone will **accept** (ask). The gap is the **spread**. "Last traded
price" is just the last time those two met.

## The book — simple example

```
          ASKS (sellers)
  ₹101.00   400
  ₹100.50   250
  ₹100.20   100     <- best ask
  --------- spread = ₹0.20
  ₹100.00   300     <- best bid
   ₹99.80   500
   ₹99.50   900
          BIDS (buyers)
```

- **Market order** to buy 150 → takes 100 at ₹100.20 and 50 at ₹100.50. Average
  ₹100.30. You got filled instantly, at a price you didn't choose.
- **Limit order** to buy 150 at ₹100.00 → joins the bid queue. Fills only if a seller
  comes down. You chose the price, not the certainty.
- **Stop-loss** (SL) → a sleeping order that wakes into a market/limit order when
  price touches your trigger. It's protection, not a guarantee: in a gap down, it
  fires at the next available price, which can be far below the trigger.

## Liquidity, in one line

Deep book with tight spread = liquid; your order barely moves price. Thin book =
illiquid; a ₹2 lakh order can move the stock 3% and you pay for all of it.

## How I'd get this wrong

Using market orders on illiquid small-caps and blaming "manipulation" for the bad
fill. I ate the book myself. Limit orders exist for exactly this.
