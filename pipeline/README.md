# The pipeline

How a video gets made. Stage-gate system — **nothing expensive happens before cheap work has earned it.**

## Flow

```
WEEKLY — one research pass feeds 8 pieces of content

1. RESEARCHER      reads channel/upload-log.md + channel/retention-log.md
                   returns 8-10 scored story candidates
                         ↓
   [GATE 1]        auto-kill on 4 axes            → 2-3 survive
                         ↓
2. PACKAGER        10 title + thumbnail concepts
                         ↓
   [GATE 2]        AGENT PICKS ONE by hard rules  → 1 greenlit
                         ↓                           decision + reason logged
3. SCRIPTWRITER    deep research on THAT story only
                   1 long-form + 6-8 shorts + 5 hook variants each
                         ↓
4. VOICE           TTS or human VO (swappable — not yet decided)
                         ↓
5. RENDER          Remotion template + JSON data
                         ↓
6. QC              checks against principles/attention-and-retention.md
                   AND channel/review-feedback.md (every standing rule)
                   returns WRITTEN NOTES, never re-renders
                         ↓
   [GATE 3]        HUMAN APPROVES → publish → append to upload-log.md
                   any generic note he gives → channel/review-feedback.md
                         ↓
        after ~500 views
                         ↓
7. REVIEWER        reads retention graph, appends to retention-log.md
                   └──────> feeds RESEARCHER next cycle
```

**Built so far: stages 1–2.** The rest get defined when the first story is greenlit — building a render template before a story exists is wasted work.

## The gates

| Gate | Who decides | Costs | Kills |
|---|---|---|---|
| 1 — Scoring | agent, automatic | nothing | ~70% of ideas |
| 2 — Packaging | agent, by hard rules | nothing | everything that can't be sold in a title |
| 3 — Final approval | **human** | 5 minutes | the only human gate |

**Gate 2 is automated by Himanshu's choice.** Standard practice is that the creator owns title and thumbnail — it is the cheapest place to kill a bad idea. Delegating it means a wrong pick is not caught until the finished video exists, so `pipeline/agents/packager.md` carries hard reject rules to compensate, and **every Gate 2 decision is logged with the rule that decided it.**

That log is the correction mechanism. Feedback at Gate 3 traces back to the rule that produced the mistake, and the fix goes into `channel/review-feedback.md` where it binds every future video. The system converges on his taste instead of needing his attention.

## Token economy

Three rules that keep cost near zero:

1. **Research once per story, not per video.** One pass → 1 long-form + 6–8 shorts. The hard work happens once.
2. **Build the render template once.** After that, each video is a JSON of text and numbers. Near-zero marginal cost.
3. **QC returns notes, never regenerations.** A written note is ~200 tokens. A re-render is thousands.

Never generate video frames with a model. The visual layer is code.

## State files (the machine's memory)

| File | Written by | Read by |
|---|---|---|
| `channel/idea-bank.md` | Researcher | Researcher, Packager |
| `channel/upload-log.md` | human on publish | Researcher (never repeat a story) |
| `channel/retention-log.md` | Reviewer | Researcher, Scriptwriter |
| `channel/review-feedback.md` | whoever takes Himanshu's feedback | **every producing agent** |

Without these the system has no memory and video #50 is no better than video #1.

## Rules for every agent in this pipeline

- Read `00-start-here.md` and route. Do not read the whole KB.
- `channel/review-feedback.md` is binding if you produce anything he will watch. Check every rule before handing off.
- `channel/positioning.md` is binding. An output that violates it is wrong, however good it looks.
- Every claim needs a verifiable public source. Invented numbers kill this channel on a policy and a credibility level.
- Target **US/UK audiences**: dollar figures, US/UK spelling, Western reference points. Worth 10–20x RPM.
- When genuinely blocked, ask. Do not guess on facts; do guess on taste.
