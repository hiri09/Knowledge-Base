# December 2026 sprint — the numbers run

The goal until January is **data, not revenue.** Himanshu is explicitly not chasing
money from YouTube before Jan; he wants enough signal to decide whether to expand
the product. Any agent optimising for monetization in this window is solving the
wrong problem.

## Channels (decided 2026-11-14)

- **Flopnomics — the main channel.** Everything goes here.
- **Pibbo — parked.** Made to try things out. Not deleted, just never uploaded to
  again. Per `youtube-niche-economics.md` §5, two channels on one AdSense ID is
  correlated termination risk, and splitting uploads halves the signal on both.

## The calendar constraint

**Himanshu is on leave Nov 30 – Dec 14 with no Claude access. YouTube only, on
phone.** He can watch analytics and publish; he cannot produce.

| Window | Days | Work |
|---|---|---|
| Nov 14–29 | 16 | 2 research passes → 12–14 Shorts, **all uploaded and scheduled** |
| Nov 30–Dec 14 | 15 | Nothing. Scheduled Shorts auto-publish ~1/day. He records numbers only. |
| Dec 15–31 | 17 | Read the data, run the gates, re-cut winners |

**The move that makes this work: production needs him present, publishing does
not.** Batching in window A and scheduling through the leave is the difference
between returning to 15 days of retention data and returning to a cold channel
the algorithm has stopped testing.

## Measure retention, not views

With 0 subs, view count on the first ~15 Shorts measures whether the algorithm
*tested* the channel, not whether the content is good. It needs 20+ uploads to
mean anything.

**Retention is readable off 50 views.** So through December: AVP and the 3-second
drop are primary, views are secondary and only readable in aggregate in January.

This supersedes the 500-views-in-a-week threshold set on upload 002 — that number
optimises the one metric that cannot teach anything at this volume.

## Test order

Per the upload-log's own rule (hook → packaging → story, in order of how much
each moves a Short):

| Uploads | Variable | Arms |
|---|---|---|
| 1–9 | **Hook style** (first 3s) | cold number · character · contradiction, 3 each |
| 10–18 | **Packaging** (title + cover) | winning hook held fixed |
| 19+ | Story domain | games vs film vs streaming — will not resolve by January |

## The four gates (set 2026-11-14, before data)

Written down in advance so January is a comparison, not a rationalisation.

| Gate | Pass |
|---|---|
| 3-second retention | ≥ 70% |
| AVP on a ~50s Short | ≥ 60% |
| Best single Short | > 5,000 views |
| Separation between hook arms | ≥ 10 points of 3s retention |

**Hit 3 of 4 → the format works, expand to long-forms. Miss → the problem is
upstream of production and more Shorts will not find it.**

The fourth gate is the one that gets skipped: if all three hook arms land within
10 points of each other, the test was inconclusive. Re-run it — do not crown a
winner from noise.

These are starting lines, not researched benchmarks. Himanshu can move them, but
only *before* the data lands.

## Phone logging during leave

No Claude, so the format is deliberately stupid — one line per video in a phone
note, transcribed into `retention-log.md` on return:

```
#003 | hook: number | 3s: 62% | AVP: 55% | views: 410
```

Studio app → Analytics → Content → tap the video.

**Record only. Do not diagnose, do not change anything mid-leave.** Per
`retention-log.md`, a single video's dip is noise and nothing gets promoted to a
standing lesson until a pattern repeats across 3+ uploads.

## Open: the other revenue path

He also wants "other ways to get the money." For this niche pre-audience,
affiliates, sponsors, TikTok Creator Rewards and Meta bonuses are all gated
behind an audience he does not have — chasing them now is motion, not progress.

**The asset with a near-term buyer is the pipeline, not the videos** — the
four-role editorial loop with `render/critique.py` judging rendered pixels. Most
faceless operators hand-edit or pay editors. Flagged, not pursued: it is a
different business, and splitting focus during a 16-day sprint is the worst
possible timing. Revisit after January.
