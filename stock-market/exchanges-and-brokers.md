# Exchanges, brokers, demat, settlement

The plumbing, in order of how your order travels:

1. **You** tap Buy in a broker app (Zerodha, Groww, …).
2. **Broker** is a member of the exchange; it forwards your order.
3. **Exchange** (NSE / BSE) is the matching engine — it pairs your buy with someone's
   sell at a price both accept. It never takes a side.
4. **Clearing corporation** guarantees the trade settles even if the other side
   defaults. This is why you don't have to trust the stranger who sold to you.
5. **Depository** (NSDL / CDSL) holds the shares electronically in your **demat
   account**. Your broker is not the owner, just the agent — your shares sit under
   your own demat ID.

**Settlement is T+1** in India: trade today, shares/cash officially change hands the
next working day.

## Simple example

10:03 AM Monday: you buy 50 shares of ITC at ₹410. The exchange matches you with a
seller in milliseconds. Tuesday, 50 ITC shares land in your CDSL demat and ₹20,500 +
charges leaves your broker ledger.

## What you pay (always, win or lose)

Brokerage, exchange transaction charge, SEBI fee, stamp duty, GST, and STT. Small per
trade, enormous if you trade often — see `fees-slippage-and-taxes.md`.

## How I'd get this wrong

Assuming the broker holds my shares and could lose them. Shares sit in the
depository under my name; a broker failing is painful but doesn't vaporise holdings.
The real broker risk is a bad app, bad fills, and margin products I didn't ask for.
