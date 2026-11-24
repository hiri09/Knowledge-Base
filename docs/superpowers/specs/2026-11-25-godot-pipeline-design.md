# Flopnomics Godot production pipeline — design

## Intent and why

The old pipeline (Remotion/React + Three.js) shipped two videos that were, in
Himanshu's own words, not good: wrong/mismatched stock objects, flat AI
voice, no real animation ("type on a ground"). Rather than patch that
pipeline, the whole channel's content/decisions/videos were wiped and we're
rebuilding production from zero, in Godot, fixing the three root causes
directly instead of carrying them into a new engine.

**Note on prior art.** A builder-check review of this doc surfaced live,
uncommitted work in the old Three.js pipeline (`render/src/props.tsx`,
`theme.ts`, `critique.py`, dated 2026-11-14) that had already converged on
much of this same direction — a toon-shaded, faceless character design, a
reusable modular set kit, a warm/light palette, and objective quality gates
calibrated against why video 002 failed. Told about it directly, Himanshu
confirmed: still move to Godot. That code is not being built on top of, but
its *design decisions* are reused as a concrete starting spec rather than
redeciding everything from zero — see "Prior art to carry forward" below.

## Goals

- Genuinely good motion design per video — not a generic template look.
- Real or cloned human narration, never flat AI TTS.
- A distinctive, ownable visual style: flat vector shapes/characters
  (Kurzgesagt-influenced) for story beats, plus a first-class data/report-card
  system (Modern MBA-influenced) for stats/timelines/quotes — the screenplay
  decides which mode runs at any given beat, not a fixed template.
- Start in 2D; the same style/asset language should extend into 3D later
  without a second redesign.
- Zero reliance on real movie/show footage or stock clips that don't actually
  match the story.

## Non-goals (for now)

- Full automation ("one script → many auto-generated Shorts" factory). Each
  video is hand-built/bespoke — this trades throughput for quality while the
  new approach is unproven. Revisit automation only once the style/workflow
  is producing videos Himanshu is actually happy with.
- 3D production — explicitly phase 2, after 2D is working.
- Reusing the old JSON-driven render architecture as-is.

## Anti-goals (failure even if "it technically works")

- Looks like a reused template again ("type on a ground").
- Any real person drawn with a recognizable likeness — characters are
  shapes/roles (the founder, the board, the team), never faces.
- Real movie/show footage, or stock media that doesn't actually match the
  script.
- Flat/robotic-sounding narration.

## Constraints

- Godot 4.7.2, installed locally (`/opt/homebrew/bin/godot`).
- Export target: YouTube Shorts vertical, 1080×1920, to start.
- No existing "render a video from a data file, headlessly" tool for Godot —
  unlike Remotion, this has to be built or assembled from Godot's own
  headless/movie-maker primitives.
- Carried forward from the old pipeline, unchanged (all operate on audio/video
  files, not on Remotion/Three.js, so the engine switch doesn't touch them):
  `render/build-audio.py` (AI narration — superseded in priority by real/cloned
  voice, kept as fallback), `render/use-my-voice.py` (Whisper-aligned voice
  cloning), `render/build-score.py` (ffmpeg-synthesized score/sound design),
  `render/critique.py` (scores the rendered mp4 directly via ffmpeg frame
  analysis — saturation, motion, shot-repetition, hold-time gates — so it
  judges Godot's output exactly as it judged Three.js's).
- **Not carried forward:** `render/fetch-media.py` (fetches stock photos/clips
  from Wikimedia/Pexels). That tool's output is the literal "wrong/mismatched
  objects" failure this rebuild exists to fix — original illustration in Godot
  replaces it, not an improved version of it.

## Approaches considered

1. **Three.js/Remotion (status quo) vs. Godot.** Chose Godot, twice — once
   before finding the uncommitted Three.js toon-shading/set-kit prototype,
   and again after seeing it (see "Note on prior art" above). Godot has more
   built-in capability for scene/motion work out of the box (physics,
   lighting, particles, animation tools, a real editor) than a hand-rolled
   Three.js setup. Tradeoff: real, tuned work in Three.js already exists and
   is being set aside; Godot's text/UI layout tooling is weaker than
   CSS/HTML; and there's still no existing "build a video from a data file,
   headlessly" tool for Godot — that has to be built either way, since the
   old flat look came from a thin animation vocabulary, not from Remotion
   itself.

2. **Fully automated JSON→render factory vs. hand-built per video.** Chose
   hand-built (each video is bespoke scene/animation code, not generated from
   a generic template). The old flat result came from automation with too
   thin a vocabulary; rather than bet on a smarter auto-generator working
   this time, build quality by hand first and consider automating only once
   there's a proven, varied style to automate.

3. **Visual style: real footage/clips vs. generic stock vs. original flat
   illustration.** Chose original flat vector illustration (Kurzgesagt-style
   shapes/characters) plus a parallel data/report-card system (Modern
   MBA-style), switching per screenplay beat. Real footage (the Cinephile
   Unfiltered model) carries Content ID and likeness risk and mostly doesn't
   exist for flop-business stories anyway (logos only); generic stock is what
   produced "wrong objects" the first time.

4. **Voice: AI TTS vs. real/cloned voice.** Chose real/cloned voice
   (Whisper-aligned, reusing `use-my-voice.py`) — flat AI narration was one of
   the three named root causes of the old videos being bad, and a real voice
   is foundational to audience trust and channel longevity.

## Decided

- Engine: Godot 4.7.2. Project lives at `render-godot/`, a new folder
  alongside the existing `render/` Python tooling (both inside the
  knowledge-base repo — my call, since that's already where this channel's
  production code lives, distinct from the chess-game `Godot-Games` repo).
- Workflow: hand-built per video, no generic auto-render system.
- Voice: real/cloned, Whisper-aligned.
- Visual language: flat vector shapes/characters for story beats + data/report
  cards for stats/facts, chosen per screenplay beat — never one fixed
  template for a whole video.
- 2D first; the same shape/style language is meant to extend into 3D later.
- No real footage, no real-person likenesses, no mismatched stock.

## Prior art to carry forward (design, not code)

The Three.js prototype's design decisions transfer even though the engine
doesn't. The Godot style kit should start from these, not from a blank page:

- **Character design:** faceless, abstract figures — tapered body, round
  head, two brow bars doing all the expression, no face, no limbs. This is
  exactly the "shapes/roles, not likenesses" anti-goal, already solved.
- **Palette:** warm paper background (`#F2EDE3`/`#FDFBF6`), near-black text
  (`#15171C`), one saturated accent for type (`#E23D23`), and a separate
  5-colour `palette` (blue/teal/gold/plum/ink) reserved for the set itself —
  moved from a dark theme to this light one on Himanshu's own note that
  "dark = serious" reads as generic for this genre. Start here; don't
  redecide this.
- **Look:** toon-shaded flat color (hard 4-step gradient ramp) with an
  inverted-hull outline — the concrete technique behind the Kurzgesagt-ish
  read we're after. Godot's `BaseMaterial3D` toon shading mode (or a custom
  shader) plus a scaled backface-outline mesh is the direct equivalent.
- **Set-kit structure:** rooms (boardroom/office/newsroom/etc.) as
  arrangements of the same shared parts (walls, table, chairs, lamp, shelf),
  not bespoke builds per video — "video 1 builds the kit, video 3 just
  arranges it."
- **Screenplay beats:** the old schema tagged every scene `HOOK | EXPLAIN |
  REVEAL | CLOSE` and gated minimum hold-time per beat. That pacing structure
  — not the TypeScript/JSON types themselves — is exactly the "screenplay
  decides which mode runs" idea in this doc's goals, already fought out once.
- **Quality gates:** `critique.py`'s saturation/motion/shot-repetition
  thresholds, calibrated against video 002's actual failure, are the
  objective bar the Godot output needs to clear — reuse the gates, re-measure
  Godot's output against them, don't re-derive them from nothing.

## Authorship model

Hand-built per video means **agent-authored bespoke scene/animation code**
per story (Claude writing Godot scenes/GDScript), rendered and then judged by
`critique.py` on the actual pixels — the same director → assistant director →
editor → senior editor editorial loop the old pipeline used, now driving
Godot instead of Remotion. It does not mean Himanshu hand-keyframing in the
Godot editor himself.

## What's left to the builder

- Concrete color palette and the reusable "character kit" (shapes/props
  standing in for founder/board/team roles) — propose something concrete,
  then iterate against feedback rather than trying to nail it unreviewed.
- Whether report cards read as a broadcast chyron/lower-third or a
  full-screen infographic takeover — Himanshu hasn't picked; propose a
  concrete first attempt and react to it rather than guessing in the abstract.
- The actual headless-export mechanism (Godot's MovieWriter mode vs. another
  capture approach) — a technical implementation detail.
- `render-godot/` project and scene folder structure.
- Re-establishing standing feedback rules (the old `review-feedback.md`
  equivalent) once real feedback starts coming in on rendered videos.
