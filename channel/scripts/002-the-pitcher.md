# Video 002 — The Pitcher (38 Studios, Short 2 of batch)

**Title contract:** A Baseball Player Got A US State To Bet $75,000,000 On A Video Game
**Runtime:** ~52s · **Data:** `render/data/002-the-pitcher.json`

Second Short from the 38 Studios research pass. Video 001 led with the sales
number; this one leads with the character, which `001-38-studios.md` held back
as the A/B hook ("variant 5 leads with the character and is the strongest
alternative"). Same sources, different entry point.

## Why this one is built differently

001 was rebuilt four times and still read as unsynced, because every visual
event was keyed to a **shot boundary** rather than to a **word**. The number
appeared when the shot started, the voice said it somewhere in the middle, and
the shot then sat in silence until its padded duration ran out — 20–40% of every
shot was dead air, and the only lever for pacing was more padding.

This Short is written for word-level alignment. Every line names the **word its
visual lands on**, and a shot ends a fixed short tail after its last word. Dead
air becomes structurally impossible instead of something to tune away.

**Breathing comes from deliberate silent beats, not from padding spoken ones.**
Silence is a shot here, with its own duration and its own picture.

## Hook variants

1. **"A retired baseball pitcher talked a US state into guaranteeing his loan."** ← chosen
2. "A baseball player borrowed $75 million from Rhode Island. He'd never made a game."
3. "This is what $75 million of public money bought."
4. "Rhode Island bet 1% of its annual budget on a video game."
5. "The state of Rhode Island co-signed a video game."

**Chosen: 1.** It is a sentence nobody can leave unfinished — "a baseball
pitcher" and "a US state" do not belong in the same clause, and the viewer
has to know how that happened. 001's hook stated a fact; this one poses a
contradiction, which is the note that came back from Gate 3.

## Script

Every line carries the word its visual lands on. `[SILENT]` beats are shots.

| # | Beat | Line | Lands on | On screen |
|---|---|---|---|---|
| 0 | HOOK | A retired baseball pitcher | *pitcher* | gameplay, cold |
| 1 | HOOK | talked a US state into guaranteeing his loan. | *state* | RI state seal |
| 2 | REVEAL | Seventy five million dollars. | *seventy* | **$75M** counts up |
| 3 | SILENT | — | — | **"HE HAD NEVER MADE A GAME"** |
| 4 | EXPLAIN | The game was called Kingdoms of Amalur. | *Amalur* | trailer footage |
| 5 | EXPLAIN | It launched in February twenty twelve. | *February* | **FEB 2012** |
| 6 | EXPLAIN | Reviews were good. | *good* | dev interview |
| 7 | EXPLAIN | It sold over a million copies. | *million* | **1,000,000** unit grid |
| 8 | SILENT | — | — | **"THAT WAS THE PROBLEM"** |
| 9 | EXPLAIN | A million was never the number. | *never* | gameplay |
| 10 | REVEAL | It needed three. | *three* | **1M vs 3M** bars |
| 11 | EXPLAIN | Three million copies, just to break even. | *break* | chart holds |
| 12 | EXPLAIN | In May, payroll was missed. | *May* | empty room |
| 13 | EXPLAIN | The entire staff was laid off. | *staff* | **STAFF REMAINING → 0** |
| 14 | EXPLAIN | In June, the company filed for bankruptcy. | *June* | courtroom |
| 15 | REVEAL | Rhode Island's taxpayers lost twenty eight million. | *twenty* | **$28M** cracks |
| 16 | EXPLAIN | Most of them never played it. | *never* | Providence |
| 17 | CLOSE | The game was not the failure. | *not* | gameplay, warm |
| 18 | CLOSE | The arithmetic was. | *arithmetic* | **3M NEEDED · 1M SOLD** |
| 19 | SILENT | — | — | end card, held |

## Sources

- $75M state-guaranteed loan, 450 jobs, Feb 2012 launch, May payroll, June bankruptcy — [Wikipedia: 38 Studios](https://en.wikipedia.org/wiki/38_Studios)
- 3M break-even vs 1M sold — [Fortune, 2012](https://fortune.com/2012/06/15/4-lessons-from-curt-schillings-38-studios-fiasco)
- ~$28M taxpayer loss, four-year investigation closed with no charges — [GameSpot](https://www.gamespot.com/articles/four-year-investigation-into-kingdoms-of-amalur-de/1100-6442246/)

## Compliance notes

- **No motive stated** about any real person. Schilling is named by role, never
  characterised, and the script says what he did, never why.
- The investigations ended with **no criminal charges**. Nothing here implies a
  crime, and no imagery of police, courts-as-prosecution or evidence is used.
  (A fetched image of officers handling seized evidence was rejected at the
  asset stage of 001 for exactly this reason.)
- **Game footage is used under commentary**, in cuts of ~2–3 seconds, as a
  deliberate policy change approved at Gate 3 on 2026-11-13. Previously the
  channel was public-domain-only. Expect Content ID claims on the game footage;
  that trade was accepted knowingly.
- Every figure traceable to a source above. No figure is derived except
  `3M − 1M = 2M`, which is stated as arithmetic.
