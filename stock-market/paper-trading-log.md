# Paper trading log — how to practise so it teaches you something

Simulated trades are worthless unless the **reason** is recorded before the outcome
is known. Otherwise you just rewrite history to make yourself look smart.

Practise in `lab/trading-lab.html` (open it in a browser — no install, no server).
Log here.

## The entry format (write it BEFORE the trade)

```
Date        | 2026-11-28
Instrument  | synthetic / RELIANCE / NIFTY
Setup       | what I saw, in one line
Thesis      | why price should move, in one line
Entry       | ₹___      Size: ___  (risk = ___% of capital)
Stop        | ₹___  — because: ____________________
Target      | ₹___  — because: ____________________
R:R         | ___ : 1
Emotion now | calm / FOMO / bored / want revenge
```

## The exit (write it after, without editing the above)

```
Exit        | ₹___    Reason: hit stop / hit target / changed mind / panicked
Result      | +/- ₹___  = ___R
Was the thesis right?     yes / no
Was the EXECUTION right?  yes / no
One sentence learned      ____________________
```

## The four-box truth

| | Thesis right | Thesis wrong |
|---|---|---|
| **Followed my rules** | Good process, good outcome | **Good process, bad outcome — this is fine** |
| **Broke my rules** | **Bad process, lucky — most dangerous box** | Bad process, deserved |

Judge the process, never the single outcome. Twenty trades of good process will beat
twenty of lucky ones, and the lucky box is where ruin is learned as a habit.

## Minimum before real money

**50 logged trades** with written theses, and an honest count of how many were in
each box. If "broke my rules" is more than ~10%, the problem isn't the strategy.

## How I'd get this wrong

Paper trading with unlimited fake size and no fees, feeling great, then sizing real
money the same way. Set the sim to the actual capital, keep fees on.
