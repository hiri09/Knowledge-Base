# Standing feedback (Himanshu's taste rules)

Generic rules learned from reviewing finished videos. **Binding on every producing agent, every time.**

This is separate from `retention-log.md` on purpose:

| | `retention-log.md` | this file |
|---|---|---|
| Source | viewer behaviour, the graph | Himanshu's eye |
| Written by | Reviewer agent | whoever takes the feedback |
| Answers | what viewers did | what is wrong regardless of numbers |

A video can retain fine and still be wrong. That is what this file catches.

## The generic-only rule

**Only generalisable rules go here.** Video-specific fixes get applied and forgotten.

Before writing anything down, generalise it. Ask: *"will this be true for the next video too?"*

| Raw feedback | Goes in as |
|---|---|
| "the Quibi number flashed by too fast" | numbers hold on screen for a minimum of 2 seconds |
| "that transition was ugly" | no whip-pan transitions |
| "voice sounds rushed here" | narration paces at ~145 wpm, pauses after every money figure |
| "the Quibi logo is wrong colour" | *(not generic — fix it, don't log it)* |

If it can't be generalised, it isn't a rule. Fix the video and move on.

## How a rule enters

1. Himanshu gives feedback on a finished video.
2. It gets **generalised and read back to him** before being written — a misread rule is worse than no rule.
3. It lands in the right section below, dated.
4. **QC enforces it from the next video onward.**

The point: **feedback given once never has to be given again.** If Himanshu repeats himself, this file failed.

**This file carries extra weight now.** Gate 2 is automated, so Gate 3 is the only point where human taste enters the system. Every generic note he gives at final review is the sole training signal the pipeline gets. Capture all of it.

## Rules

### Script / writing
_(empty)_

### Voice / narration
_(empty)_

### Visuals / render
- **No frame is ever flat black.** Every scene carries a background layer — moving grid, drifting glow, diagonal bars, or a ghosted figure behind the type. An empty ground reads as unfinished, not as minimal. _(2026-11-12)_
- **Every fetched image is looked at before it ships.** Keyword search returns semantically wrong images — "one hundred dollar bill" returned a scanned congressional bill. No image is better than a wrong one. _(2026-11-12)_
- **Photographic grounds are graded to the palette, never dropped in raw.** Grayscale, crushed to ~0.32 brightness, duotoned toward the accent, with a top-and-bottom scrim for type. Ungraded stock reads as stock. _(2026-11-12)_
- **Key words carry the accent colour.** `*word*` in a script line renders red. The eye needs somewhere to land in a block of type. _(2026-11-12)_
- **Composition must vary.** Never place every element dead centre. Rotate through centre, left, right, top-weighted and bottom-weighted across a video. Text aligns to its own position. _(2026-11-12)_

### Pacing / edit
- **Never repeat the same entrance animation twice in a row.** Rotate through rise, slide, scale, word-stagger and blur-in. One repeated motion across a whole video reads as a template. _(2026-11-12)_
- **Numbers count up, they do not appear.** A money figure arriving instantly wastes the payoff; it should resolve on screen. _(2026-11-12)_

### Packaging — titles & thumbnails
_(empty)_

## Retired rules

Rules that stopped applying. Kept so nobody reintroduces them by accident.

_(empty)_

<!-- format:
- **Numbers hold ≥2s on screen.** A money figure is the payoff; flashing it wastes the hook. _(2026-11-12)_
-->
