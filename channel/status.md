# Where things stand (2026-11-25)

Read this first when picking the work back up. Written after a full reset of
the channel (positioning, pipeline, all videos, kids-side-project — all
wiped 2026-11-25, see git history before commit `1be1a38` to recover any of
it) and a same-day rebuild of decisions.

## Done

- **Niche:** not re-locked to a written positioning file yet. Working example
  in flight (Warner Bros. Discovery) is an entertainment/media-conglomerate
  downfall, consistent with the old narrower niche, but general-business
  stories (e.g. Nvidia) were discussed and explicitly not ruled out. Revisit
  and write a real `positioning.md` once a couple of videos are out.
- **Production engine:** moving from Remotion/React+Three.js to **Godot**.
  Full reasoning and decisions in
  `docs/superpowers/specs/2026-11-25-godot-pipeline-design.md` — read it
  before building anything. Key calls: hand-built-per-video (no generic
  auto-render factory), real/cloned voice (not AI TTS), flat toon-shaded
  Kurzgesagt-style characters/shapes + Modern-MBA-style data/report cards,
  switching per screenplay beat. A pre-reset Three.js prototype
  (`render/src/props.tsx`, `theme.ts`) already solved much of the visual
  design — reuse its *decisions* (palette, faceless character design, toon
  shading) even though the engine changed.
- **Story structure:** built and tested `~/.claude/skills/downfall-arc/` — an
  11-beat narrative template (Save the Cat / Story Circle / Pixar-rules /
  documentary-technique derived) for turning a real downfall story into a
  script instead of a flat chronological list. Load it before writing or
  reviewing any script. Hard-won refinements are in the skill itself:
  bridge every time-jump, couple every introduction to its payoff, explain
  every exit's real reason, build the antagonist's credibility *before* the
  flaws (state it plainly, never as a negation like "wasn't wrong" — that
  foreshadows by accident), name the mechanism behind big numbers not just
  the number, size the climax to the runtime.
- **First topic finalized and scripted:** Warner Bros. Discovery's collapse
  into Paramount Skydance. Full approved script (v4) at
  `channel/scripts/001-warner-bros-discovery.md`. ~19-21 min long-form.
  Not yet produced.

## Open / next

1. Build the actual Godot project (`render-godot/`, per the design doc) —
   nothing exists yet, design only.
2. Produce video 001 (Warner Bros. Discovery) end to end: visuals, voice
   recording, assembly, `critique.py`-style review before it's shown.
3. `shorts-edit` skill (`~/.claude/skills/shorts-edit/`) still points at
   `pipeline/editorial-loop.md` and `pipeline/agents/*.md` — both wiped in
   the reset. Needs rewriting once the Godot pipeline actually exists.
4. Held-in-reserve story candidates from the research pass, if this one
   under- or over-performs and a second video is needed sooner: BioWare
   shutdown (EA, Oct 2026, strong nostalgia + decade-long decision chain),
   Bungie/Destiny 2 (Sony's $765M writedown). Nvidia/Jensen Huang scandal was
   explicitly rejected — ongoing litigation, real-person defamation risk, not
   a resolved money-lost story.
5. Positioning/niche breadth (entertainment-only vs. general business flops)
   never got formally re-decided — fine to leave open, but don't let it drift
   by accident across videos without someone noticing.
