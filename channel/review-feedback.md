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

**A rule with a `gate:` is now enforced by `render/critique.py` on the rendered
pixels, not by a reader checking intent.** That distinction is why this file
exists: the flat-black rule passed QC for three videos while the screen was
black, because a background layer existed at 4% opacity. A rule with no gate
stays advisory and is checked by the Senior Editor's eye.


### Script / writing
_(empty)_

### Voice / narration
- **Every line is level-matched before assembly, on its loudest window.** `say`
  renders each line independently, so a short fast line lands several dB hotter
  than a slow one — and the hot line's synthesis artefacts are what get heard
  as background noise. Matching on mean RMS is not enough; a punchy line passes
  that and stays hot on the peaks. _(2026-11-13)_ → gate: `level_match` ±2.5dB from the median
- **Never master narration with one-pass `loudnorm`.** It is adaptive, silently
  ignores `linear=true` (check for `Normalization Type: Dynamic`), and with no
  history at the start of a track it over-gains the opening. Measure, then
  apply one fixed gain and a limiter. _(2026-11-13)_
- **The track gets a lead-in.** Narration that begins on sample zero has no
  breath before it and exposes the first phoneme. _(2026-11-13)_
- **`say` is not flat — it was being driven flat.** `[[pbas N]]` sets pitch (measured 30 → 80Hz, 65 → 235Hz on Daniel), `[[rate N]]` sets pace per line, `[[slnc N]]` inserts silence. Every line carries a performance direction or it is read in the same voice as all the others. _(2026-11-13)_ → gate: `pitch_spread ≥ 12Hz` between line medians
- **A scene may be silent.** Tying every shot's length to its own sentence makes a one-second beat impossible without two-word sentences. A picture beat with no narration is how a cut lands on its own. _(2026-11-13)_

### Visuals / render
- **Visual events key to the WORD, not the shot boundary.** Whisper DTW
  (`whisper-cli -ml 1 --dtw base.en`) gives word-level timings in about a
  second. A number counts up on its figure, an accent word turns red as it is
  spoken. Keying to the boundary guaranteed the number resolved before the
  voice reached it. _(2026-11-13)_
- **A figure is not on screen before it is spoken.** Rendering it early meant
  two seconds of "$0M", which reads as a wrong number, not as animation.
  _(2026-11-13)_
- **Footage keeps its colour; stills take the archival grade.** Desaturating
  footage to match the stills throws away the only reason the footage is there.
  _(2026-11-13)_
- **A light-toned ground needs darkening, not lifting.** The 1891 engraving
  went near-white under the grade built for dark photographs. One explicit
  `dim` per scene beats one global guess. _(2026-11-13)_
- **Every fetched clip is checked for burned-in text.** The combat footage
  carried Italian subtitles three seconds in — invisible in a thumbnail,
  obvious on screen. _(2026-11-13)_
- **A flash transition tops out around 0.26 opacity.** At 0.55 it blew the
  frame to flat grey for two frames and read as a render glitch. _(2026-11-13)_
- **Never grade to black.** A near-black base (`#0B0B0C`) gives every frame a void to sit on, and the whole video reads as dark rather than as graded. The base is a charcoal with a blue cast, shadows are lifted, and blacks never crush to zero. _(2026-11-13)_
- **Split-tone, do not duotone.** One flat accent wash over every photograph made eight different grounds arrive the same colour. Cool multiplied into the shadows, warm soft-lit into the highlights, accent at 0.05 — each photograph stays recognisably itself. _(2026-11-13)_
- **A procedural background gets the same grade as a photographic one**, or the video alternates between graded shots and flat dark shots and reads as uneven. _(2026-11-13)_
- **Type never sits on top of the ghost numeral.** Centre both and they fight; the numeral is the ground, so the type clears it. _(2026-11-13)_

- **No frame is ever flat black.** Every scene carries a background layer — moving grid, drifting glow, diagonal bars, or a ghosted figure behind the type. An empty ground reads as unfinished, not as minimal. → gate: `luma_spread ≥ 10` (YHIGH−YLOW per shot) _(2026-11-12)_
- **The visual must BE the sentence, not decorate it.** A generic photo behind a specific claim is wallpaper. Prefer a visual generated from the story's own numbers — a unit grid, a timeline, a comparison — because those are relevant by construction and cannot mismatch. Reach for a photo only when the photo is literally the subject. → gate: `information_gain` — screen text ≤ 50% token overlap with the spoken line _(2026-11-12)_
- **Every fetched image is looked at before it ships.** Keyword search returns semantically wrong images — "one hundred dollar bill" returned a scanned congressional bill. No image is better than a wrong one. → enforced by the Senior Editor on frames, not by a reader _(2026-11-12)_
- **Photographic grounds are graded to the palette, never dropped in raw.** Grayscale, ~0.55 brightness, contrast 1.18, duotoned toward the accent, with a strong top-and-bottom scrim carrying text legibility. Grading darker than this crushes already-dark images to flat black — let the scrim do the work, not the exposure. _(2026-11-12)_
- **Key words carry the accent colour.** `*word*` in a script line renders red. The eye needs somewhere to land in a block of type. _(2026-11-12)_
- **Composition must vary.** Never place every element dead centre. Rotate through centre, left, right, top-weighted and bottom-weighted across a video. Text aligns to its own position. → gate: no `pos`/`bg`/`anim` repeated in consecutive shots _(2026-11-12)_

- **A duotone over a photograph is an accent, not a wash.** At 0.22 opacity every ground — an engraving, a skyline, a courtroom, a banknote — arrived the same colour, so having eight grounds bought the variety of one. 0.09 over grayscale at 0.72 brightness keeps each photograph recognisably itself. _(2026-11-13)_ → gate: `luma_spread ≥ 10` catches the dark end only; the sameness is an eye call
- **A label over a photographic ground is white with a shadow, never muted grey.** The context line under a money figure is what makes the figure mean something; in `theme.muted` over a busy engraving it vanished entirely. _(2026-11-13)_
- **A procedural background must be visible, not technically present.** Hairlines at 30% alpha 92px apart measured a luminance spread of 3 — indistinguishable from flat black, and too faint for motion detection to see as movement. _(2026-11-13)_ → gate: `luma_spread ≥ 10`
- **Search Commons by category, never by keyword.** Free-text "one hundred dollar bills" returned a scanned copy of *Bill Nye's History of the United States*. A category is a curated list of things that genuinely are the subject. _(2026-11-13)_
- **Check what a fetched image depicts, not just whether it matches.** A search for US banknotes returned officers handling seized evidence. The 38 Studios investigation closed with no charges — shipping that frame would have implied a crime the script explicitly avoids. _(2026-11-13)_

### Pacing / edit
- **A scene's length is derived from its words, never padded to a guess.** The
  shot ends a short `tail` after its own last spoken word. Padding made pacing
  and sync the same knob — every fix for "too fast" bought silence and made the
  cut read as unsynced. Measured on 001: 20-40% of every shot was dead air.
  _(2026-11-13)_
- **Breathing is a shot, not a suffix.** A silent beat with its own picture and
  its own duration is how a Short breathes. Padding a spoken shot is not.
  _(2026-11-13)_
- **A whole-video average hides a frantic stretch.** The mean hold passed at
  2.50s while the opening three shots ran at 1.54s. Pace is checked in runs of
  three, not as one number. _(2026-11-13)_ → gate: `local_pace ≥ 1.9s` over any 3 consecutive shots
- **The hook gets room.** A 1.2s ceiling on the opening shot came from research
  about cutting between angles, not about a shot that has to carry a whole
  idea. _(2026-11-13)_ → gate: `HOOK ≤ 2.6s`
- **Cut rate is not idea rate.** The reference channels cut every 1–2s, but those are several angles on ONE idea. A new *idea* every 1.9s reads as frantic however legal each shot is. Average hold stays at or above 2.2s. _(2026-11-13)_ → gate: `avg_hold ≥ 2.2s`
- **A Short has to land, not stop.** Ending on the last spoken word reads as the file running out. The closing shot holds ≥2.5s, silent, and the picture settles out rather than cutting to black. _(2026-11-13)_ → gate: `closing_hold ≥ 2.5s`

- **Uniformity is what reads as AI.** Identical pauses, identical camera moves and identical cuts are the tell — not the content. Every repeated interval must be broken on purpose. → gates: `pause_stdev ≥ 0.25`, `wps_spread ≥ 0.15`, no consecutive repeats _(2026-11-12)_
- **Pauses vary per line, 0.2s–1.2s.** Hold long before a reveal, rush through a list. A constant gap after every sentence is the loudest machine signal in a narration. → gate: `pause_stdev ≥ 0.25s` _(2026-11-12)_
- **Every photo gets a different camera move** — push, pull, pan left, pan right, tilt, snap-punch. The same Ken Burns zoom on every image reads as a template. → gate: no `anim` twice in a row _(2026-11-12)_
- **Shots arrive differently.** Rotate cut, flash, slide-up, punch-in, wipe. Never two consecutive scenes entering the same way. → gate: no `anim` twice in a row _(2026-11-12)_
- **Never repeat the same entrance animation twice in a row.** Rotate through rise, slide, scale, word-stagger and blur-in. One repeated motion across a whole video reads as a template. → gate: no `anim` twice in a row _(2026-11-12)_
- **Numbers count up, they do not appear.** A money figure arriving instantly wastes the payoff; it should resolve on screen. → gate: `hold` floor of 2.0s on every `number` scene _(2026-11-12)_

### Packaging — titles & thumbnails
_(empty)_

## Retired rules

Rules that stopped applying. Kept so nobody reintroduces them by accident.

_(empty)_

<!-- format:
- **Numbers hold ≥2s on screen.** A money figure is the payoff; flashing it wastes the hook. _(2026-11-12)_
-->
