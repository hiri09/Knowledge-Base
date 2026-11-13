# The editorial loop — design

How a Short goes from script to something worth watching, using four roles that
check each other instead of one agent that agrees with itself.

Status: **design, approved pending build.** Written 2026-11-13 after review of
video 001, where the same three notes came back for the fourth time.

---

## Why this exists

Three rounds of feedback on video 001 produced three rounds of the same
complaints. The pipeline has a QC stage already. QC passed the video. Himanshu
did not.

That gap is the whole problem, and this is the clearest example of it:

> **Standing rule:** *"No frame is ever flat black. Every scene carries a
> background layer."*
>
> **Renderer:** every scene carries a background layer.
>
> **QC:** rule satisfied. Pass.
>
> **The screen:** diagonal bars at 4% opacity over `#0A0A0A`. Luminance 2/255.
> Reads as flat black.

QC read the rule as prose and checked it against intent. The eye checks it
against pixels. **Every rule in `review-feedback.md` has this failure mode**,
because none of them is attached to a number.

So the fix is not a better-worded rule or a more thorough checklist. It is a
judge that looks at the rendered frames and counts.

### What is actually wrong with 001

Measured, not guessed — frames extracted at 1fps and read.

| Symptom he reported | Mechanism | Owner |
|---|---|---|
| "not a good start" | Hook is a statement of fact, not a question or contradiction. Frame 1 is a chart animating in — a chart before a reason to care. | Director |
| "animation of books not good" | The unit grid fills one staircase row with no easing, no depth, no light. Reads as a loading bar. | Editor |
| "just reading the text" | On-screen text **is** the narration, verbatim, in 7 of 11 shots. Zero information gain. | Director + Editor |
| "same screen used again" | 11 shots, 4 background types. The glow ground appears 4×, the timeline component 3×. | Editor |
| "no background images, looking blank" | 1 photograph and 0 footage clips across 44 seconds. 9 of 11 shots have no ground at all. | Pantry (below) |
| "line is getting out of it" | Timeline track is drawn full-width while the endpoint dots are inset — the red line runs past the last dot into nothing. A layout bug, not taste. | Editor |
| "no pause, no high pitch low pitch" | macOS `say` has no prosody control. Physically cannot be fixed at this engine. | Director + Voice |

Shot lengths run 3–4 seconds throughout. The target style runs 1–2 seconds in
explanatory passages and under 1 second in hooks. **That single gap is most of
"just reading the text"** — at 4 seconds a shot, there is nothing for the eye
to do but read.

---

## Goals

1. **Himanshu never gives the same note twice.** Any note he gives becomes a
   number, and the number becomes a gate. This already was the intent of
   `review-feedback.md`; it failed because the rules stayed prose.
2. **The loop runs before he sees the video, not after.** He is Gate 3, the
   final approval. He is not the first reviewer.
3. **A role that can say no.** The agent that judges did not build the thing.
4. **Converge, then stop.** Bounded rounds, then hand over with the open list.

## Non-goals

- Replacing Gate 3. He still approves everything that publishes.
- Making the video objectively good. The rubric catches craft failures. It
  cannot tell you the story is boring — only a human can, and that is why
  Gate 3 stays.
- A general-purpose video framework. This serves this channel's Shorts.

## Anti-goals — what would make this a failure even if it ran

- **Two agents agreeing politely while the video stays the same.** The named
  risk of every critic loop. Guarded by: numeric gates the senior cannot waive,
  and a hard zero if the render fails.
- **Infinite polish.** Round 4 of "make it more dynamic" costs money and
  changes nothing. Guarded by: 3 rounds max, then stop and report.
- **Taste drift.** The senior inventing new objections each round so nothing
  ever passes. Guarded by: after round 1, only rubric failures may block.
- **Org chart for its own sake.** Four roles that each restate the brief. Every
  role here either produces a named artifact or rejects one. No role exists to
  coordinate.

---

## Constraints

- **Nothing a model generates frame-by-frame.** Standing rule from
  `pipeline/README.md`: the visual layer is code. Unchanged.
- **Public domain / CC0 / Pexels-licence assets only.** No attribution, no
  share-alike, no copyrighted footage. Policy, not preference.
- **Token economy holds.** Notes, never regenerations. A render is expensive;
  the measurement pass is ffmpeg and costs nothing.
- **ffmpeg only for measurement.** It is installed, it already runs in
  `finish.sh`, and it can do everything needed. No OpenCV, no numpy, no new
  dependency.
- **Every claim still carries a source.** The editorial loop does not touch
  facts.

---

## Approaches considered

| | What it is | Why not |
|---|---|---|
| **A — Four roles, as briefed** | Director, AD, Editor, Senior Editor exchanging notes until the senior passes it. | Right shape, but ungrounded. A senior with taste and no measurements loops on vibes, and waves through the next flat-black rule exactly as QC did. |
| **B — One maker, one critic** | Collapse to two agents. Cheaper, fewer handoffs. | Loses the thing worth having: the judge didn't build it. Also puts narrative and frame craft in one head, and they fail differently. |
| **C — No new agents** | Just build the measuring harness and fix the pantry. | Most of what is wrong is countable, so this gets most of the value. But it only ever catches what someone thought to measure. Never catches "this is boring". |

**Chosen: C's spine with A's roles on top.** Himanshu handed over the
decision ("you take all the decisions"); this is my call, not his.

The measurement harness is built **first**, because it is what stops the
four-role loop from being theatre. With it, a rejection reads like this:

```
SHOT 7  "It needed three million just to break even."   REJECT
  hold          4.2s      limit 2.5s for an EXPLAIN beat
  freeze        3.8s      frozen from 0.4s to end
  bg luminance  2/255     floor is 12 — reads as flat black
  ground        none      9 of 11 shots carry no ground
  text overlap  100%      on-screen text is the spoken line verbatim
```

Not "make it more dynamic."

---

## The shape

Two loops. The cheap one runs entirely in text and never renders. The
expensive one runs on pixels.

```
  script.md (scriptwriter, unchanged)
        │
        ▼
┌─────────────────────────────────────────────────┐
│  LOOP 1 — pre-production.  Text only. No render.│
│                                                  │
│   ASSISTANT DIRECTOR ──draft direction sheet──►  │
│            ▲                                  │  │
│            └────────notes────── DIRECTOR ◄────┘  │
│                                                  │
│   exit: Director signs the direction sheet       │
└─────────────────────────────────────────────────┘
        │  direction sheet (beats, performance, shot briefs)
        ▼
┌─────────────────────────────────────────────────┐
│  LOOP 2 — production.  Pixels.                  │
│                                                  │
│   EDITOR ──► data JSON + components + assets     │
│        │                                         │
│        ▼                                         │
│     render  ──►  mp4   ──►  critique.py          │
│        │                        │                │
│        │                   metrics.json          │
│        │                        ▼                │
│        └──notes── SENIOR EDITOR (reads frames)   │
│                        │                         │
│                        └─escalate─► DIRECTOR     │
│                          (when the shot was      │
│                           badly conceived, not   │
│                           badly built)           │
│                                                  │
│   exit: all hard gates pass, senior has no       │
│         blocking notes, or round 3 ends          │
└─────────────────────────────────────────────────┘
        │
        ▼
  QC (existing, policy + sourcing) ──► GATE 3: Himanshu
```

**The escalation path is the part that matters.** When the Senior Editor finds
a shot that is well built but shouldn't exist, it goes back to the Director,
not to the Editor. Otherwise the Editor spends three rounds polishing a bad
idea — which is what happened to video 001's timeline component, rendered three
times, beautifully, in a video that needed it once.

### Who owns what

| Role | Owns | Produces | Can reject |
|---|---|---|---|
| **Director** | The story as experienced. Narrative, performance, emotional shape. | Signed direction sheet. Performance tags per line. | The direction sheet. Any shot that is conceptually wrong. |
| **Assistant Director** | Turning the script into concrete, buildable beats. | Draft direction sheet, then shot specs. | Nothing. Proposes; the Director disposes. |
| **Editor** | The frame. Implementation, assets, motion, layout. | Data JSON, new components, fetched media. | Nothing. Builds to spec, reports what is impossible. |
| **Senior Editor** | Whether it is good enough to show a human. | Verdict + numbered blocking notes. | The cut. Every round. |

Four roles, four artifacts, two of them with veto. Nobody coordinates.

---

## The measurement spine — `render/critique.py`

Runs on the final mp4 plus the data JSON. Prints `metrics.json` and a readable
table. **All measurement is ffmpeg filters and stdlib Python** — no new
dependency, nothing to install.

| Metric | How | Catches |
|---|---|---|
| Shot boundaries, hold length | `select='gt(scene,0.3)',showinfo` cross-checked against the data JSON's own timings | "every shot is 4 seconds" |
| Frozen shots | `freezedetect=n=0.003:d=1.0` | a static text card held for 4s |
| Flat-black frames | `blackdetect` + `signalstats` YAVG floor per shot | the 4%-opacity background rule failure |
| Frame-to-frame change | `signalstats` YDIF, averaged per shot | motion that exists in code but not on screen |
| Ground coverage | data JSON: % of runtime with a photo/footage layer | "no background images, looking blank" |
| Template repetition | data JSON: count of each scene kind and background kind | "same screen used again" |
| Information gain | token overlap, on-screen text vs the spoken line | "just reading the text" |
| Pause distribution | whisper word timings (already produced) + `silencedetect` | "no pauses" — and uniform pauses, which is worse |
| Speaking rate per line | whisper word timings | "same flow throughout" |
| Loudness variance | `astats` RMS per line | flat delivery, crudely |

Pitch (F0) is **not** measured — it needs a dependency the project does not
have. Pause variance, rate variance and loudness variance together catch a flat
read well enough to gate on. Noted as a ceiling, not a gap to paper over.

### Hard gates

Numbers, from the target style. The Senior Editor **cannot waive these**;
only Himanshu can.

Beat classes (`HOOK`, `EXPLAIN`, `REVEAL`, `CLOSE`) are assigned by the
Assistant Director in the direction sheet and signed off by the Director. The
Editor does not choose them; it builds to them.

```
HOOK beat        hold ≤ 1.2s
EXPLAIN beat     hold ≤ 2.5s
REVEAL beat      hold ≤ 4.0s        (a number landing is allowed to breathe)
any beat         hold ≤ 4.0s, no exceptions

freeze           no shot frozen ≥ 1.0s
luminance        every shot's mean YAVG ≥ 12/255
ground coverage  ≥ 50% of runtime carries a photographic or footage layer
repetition       no scene template more than 2× per video, never 2× in a row
                 no background kind more than 3× per video, never 2× in a row
information gain on-screen text ≤ 50% token overlap with the spoken line
                 ≥ 2 shots carry information the narration does not state
entrances        no entrance animation twice in a row
pauses           stdev of inter-line pause ≥ 0.25s
                 every money figure followed by ≥ 0.5s
rate             words-per-second varies ≥ 15% across lines
render           exists, correct duration, audio present → else automatic zero
```

The last line is deliberate. A failed or empty render scores zero and cannot
be argued with — otherwise the cheapest way to pass is to break the render.

Two of these are **half-measured on purpose.** Token overlap is computed; the
"≥ 2 shots carry information the narration does not state" clause is the Senior
Editor's call on the frames, because a machine cannot tell new information from
rephrased information. Same for ground coverage: the percentage is computed
from the JSON, but whether the asset is *the right asset* is judged on the
frame. The metric narrows where to look. It does not close the question.

Metrics land at `render/out/<id>.metrics.json` next to the mp4, and are
regenerated on every render — never hand-edited, never carried between rounds.

### What stays a taste call

Hook strength, whether the story lands, whether a shot is beautiful. The Senior
Editor writes these as notes. They are advisory in round 2 and 3 so the loop
can converge; blocking only in round 1.

---

### What happens to `review-feedback.md`

It stays, and it stays binding. But every rule in it that became a number gets
annotated with the gate that now enforces it:

```
- **No frame is ever flat black.** ... _(2026-11-12)_ → gate: luminance ≥ 12/255
```

Rules that cannot become numbers — "the visual must BE the sentence" — stay
prose and stay advisory. The file keeps doing what it was built for: it is
still where Himanshu's notes land, and still read by every producing agent.
What changes is that the ones with teeth now have teeth.

**A note that cannot be turned into either a number or a prose rule is a
signal the rubric is missing a dimension.** Say so rather than filing it.

---

## Stopping rules

1. **Three rounds maximum**, per loop.
2. Round N must address every blocking note from round N−1, or say why not.
3. **After round 1, only hard-gate failures may block.** New taste objections
   are recorded for Gate 3, not acted on. This is the anti-drift rule.
4. If round 3 still fails a hard gate, **stop and hand to Himanshu with the
   open list.** Never grind silently.
5. The Senior Editor scores from frames **it extracted itself** from the final
   mp4. Never from the Editor's description of what it built.

---

## Pantry — what the editor may reach for

Decided 2026-11-13. A critic loop over type cards converges on prettier type
cards; the ceiling was never the editor, it was the ingredients.

| Source | Licence | Key | Use |
|---|---|---|---|
| **Pexels** | Pexels licence, commercial, no attribution | free, needed | modern b-roll, photos and **video** |
| **Pixabay** | CC0-equivalent | free, needed | fallback for Pexels misses |
| **Internet Archive / Prelinger** | public domain | none | period and news footage — the archive-doc texture |
| **Wikimedia Commons** | filtered to PD/CC0 already | none | specific subjects, already wired |

`fetch-media.py` already prefers Pexels when `PEXELS_KEY` is set, and already
filters Commons by licence. It fetches **photos only** — video fetch and the
Internet Archive source are new work.

**The standing rule holds: every fetched asset is looked at before it ships.**
Keyword search returns semantically wrong results — "one hundred dollar bill"
returned a scanned congressional bill. This is now the Senior Editor's job, on
frames, which is the first time anything has actually enforced it.

---

## Voice

Decided 2026-11-13: **a local, free, commercially-licensed model — not a paid
API.** "No pause, no high pitch low pitch" is unfixable on macOS `say`, which
has no prosody control at all, but it does not need a paid service either.

### Why free wins here, and it is not about the money

ElevenLabs v3 costs about 6 cents a Short. That is not the problem. The problem
is that **a Director that can only afford one take is not directing.**

The whole point of this design is a loop: try a read, listen, adjust, try
again. With a metered API, every retry has a price and the loop quietly
collapses back to one-shot generation — which is exactly the pipeline that
produced the flat read in the first place. Local inference makes takes free, so
the Director can burn thirty of them on one line until the pitch drop lands.

**Unlimited takes is the feature.** Cost-per-character is what kills it.

### The candidates

| Model | Licence | Direction control | Notes |
|---|---|---|---|
| **Chatterbox** (Resemble) | MIT | **exaggeration 0.25–2.0**, `[laugh]`-style tags | 0.5B. Runs on Apple Silicon via MPS. Clones from ~5s of audio — the path to his own voice later, free. |
| **Kokoro-82M** | Apache 2.0 | none — but strong natural prosody | 82M, native MLX on Apple Silicon, by far the fastest. The reliable floor. |
| **Orpheus** | Apache 2.0 | emotion tags (`<sigh>`, `<laugh>`) | Heavier. Mature runtime. |
| **Qwen3-TTS** | Apache 2.0 | plain-language instructions | Already listed in `voice.md`. |

**Pick: Chatterbox, with Kokoro as the fallback.** The per-generation
exaggeration knob maps one-to-one onto the Director's per-line performance tag,
which is precisely the "no high pitch low pitch" complaint. If its quality or
speed disappoints on the real script, Kokoro takes over and the variation comes
from pacing and pause alone.

Decided by **listening, not by spec sheet** — a three-line bake-off on the real
script before either is wired in.

### Pauses are already free

`build-audio.py` and `use-my-voice.py` both produce **per-scene clips**, and
the renderer assembles them. That means pause length between lines is already
fully under the renderer's control and always was — it costs nothing and needs
no model. The uniform gaps in video 001 were a choice nobody made, not an engine
limit.

### Licence trap, flagged

`voice.md` lists **XTTS-v2** as "free, local". Its Coqui Public Model Licence is
**non-commercial** — it does not survive contact with a monetised channel.
Verify before anyone reaches for it. Fish Audio S2 Pro has the best inline
prosody tags of anything available and is non-commercial for the same reason.
Both are off the table here.

### What changes either way

The Director's direction sheet carries a **performance tag per line**, and the
voice build passes them through to whatever engine is wired in. `voice.md`
already establishes that swapping engines is a config change, not a rebuild —
the render only wants an audio file and a word-timing JSON. That holds, and it
is what makes this decision reversible.

The line stops being text and becomes a direction:

```
[0:00] HOOK
  say:     "This game sold a million copies."
  perform: flat, almost bored — the number means nothing yet
  then:    0.6s hold
[0:03] TURN
  perform: drop pitch, quieter, closer
  say:     "The studio was bankrupt ninety days later."
```

---

## What is built

| Thing | Where | New? |
|---|---|---|
| `director.md` | `pipeline/agents/` | new |
| `assistant-director.md` | `pipeline/agents/` | new |
| `editor.md` | `pipeline/agents/` | new |
| `senior-editor.md` | `pipeline/agents/` | new |
| `critique.py` | `render/` | new — the spine, built first |
| footage fetch + Internet Archive | `render/fetch-media.py` | extends existing |
| ElevenLabs v3 path + performance tags | `render/build-audio.py` | extends existing |
| scene templates the specs call for | `render/src/` | extends existing |
| `shorts-edit` skill that drives both loops | `~/.claude/skills/` | new |
| the loop in the flow diagram | `pipeline/README.md` | edit |

**Build order is `critique.py` first.** Everything else is unverifiable
without it, and it is the only piece that makes the roles honest.

### Renderer work the specs will demand

Not built speculatively — built when a shot spec asks for it. But the
direction is known, and it is counter-intuitive enough to write down:

**The target style's motion steps rather than slides.** Paper textures,
hand-drawn arrows, photographs that look pinned to a wall, elements that snap
into place with a sound rather than easing in. The current renderer is 100%
smooth interpolation, and smooth unmotivated motion is the single most
reported tell of machine-made video. Part of fixing "it looks AI" is making
it *rougher*, not slicker.

---

## What is left to the builder

- Exact ffmpeg invocations and thresholds for `freezedetect` and `signalstats`.
  The numbers above are the gates; the filter tuning is implementation.
- Shot-boundary reconciliation when `scene` detection and the data JSON
  disagree. The JSON is authoritative for intent; the detector is authoritative
  for what actually rendered. Disagreement is itself a finding.
- The direction-sheet file format. It has to be readable by Himanshu at Gate 3,
  not just by agents.
- How the `shorts-edit` skill drives the roles — inline or dispatched. Both
  must work; the specs are written to be followed either way.
- Whether the Internet Archive fetch is worth it on round 1, or deferred until
  Pexels video proves insufficient.

---

## Open, for Himanshu

- **Pexels API key** — free, no card, 60 seconds at pexels.com/api. The only
  thing anyone has to go and get. Blocks the pantry work, nothing else.

**No paid service anywhere in this design.** Voice is a local model, imagery is
Pexels/Pixabay/Commons/Internet Archive, rendering is Remotion, measurement is
ffmpeg. Total marginal cost per Short: zero.

Nothing blocks `critique.py`, which gets built first regardless.
