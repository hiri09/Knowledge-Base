# Where things stand (2026-11-14)

Read this first when picking the work back up.

## Done

- Niche locked: entertainment money-failures, business-documentary framing. See `positioning.md`.
- Pipeline built: Gates 1-3, agent specs in `pipeline/agents/`, state files wired.
- Gate 1 run: 10 candidates scored, 4 killed, logged in `idea-bank.md`.
- Gate 2 run (automated): **38 Studios** greenlit. Title — *This Game Sold 1,000,000 Copies And Still Died*.
- Script written and sourced: `channel/scripts/001-38-studios.md`.
- Remotion template built. Video 001 renders end to end with narration, ~44s.
- Voice tooling: AI (`build-audio.py`) and own-voice (`use-my-voice.py`, Whisper-aligned, arnndn denoised). Currently on AI voice — "skip my voice for now".

## Open issues (his words: "still so many issues")

1. **Visuals still not appealing enough.** Biggest complaint across three rounds. Data scenes helped; it is still largely type on a ground.
2. **Voice reads as AI.** macOS `say` is flat. Cloning options priced in `pipeline/voice.md`; deferred.
3. ~~No thumbnail.~~ **Built for 002** — `render/out/002-thumb-vertical.png` (Shorts) and `-wide.png` (search/channel). Composition `Thumb` / `ThumbWide` in `src/Thumbnail.tsx`, so every future video gets one by editing data, not design. _(2026-11-13)_
4. ~~No music or sound design.~~ **Done** — `build-score.py`, gated by `silence_share ≤ 15%`. _(2026-11-13)_
5. **Only 3 public-domain images.** Wikimedia keyword search returns semantically wrong results. A free Pexels key unlocks proper imagery and video b-roll.
6. ~~No YouTube channel exists yet.~~ **Channel exists** — **Flopnomics**, `UCbHYNyOKA1RAM5CCIbiUrAg`. A second channel, **Pibbo**, was a try-it-out and is parked — never upload there. _(2026-11-14)_
7. **Zero views on the first uploads.** Check visibility, "made for kids", processing, and that Analytics (lags hours) was read — before calling it distribution. _(2026-11-14)_

## Next, in order

1. Thumbnail — concept already locked at Gate 2, short job.
2. Music bed + sound design.
3. Pexels key, then real imagery and b-roll.
4. Remaining Shorts in the 38 Studios batch (6-8 from the same research pass).
5. Second research pass → a second batch.

**All of it ships before Nov 30** — see `december-2026-sprint.md`.

## Commands

```sh
cd ~/.claude/knowledge-base/render
npm run render                              # render + delivery encode
python3 build-audio.py <id>                 # AI narration
python3 use-my-voice.py <id> --script       # his own voice: print lines
python3 fetch-media.py <id>                 # imagery (PEXELS_KEY preferred)
```

Output: `render/out/<id>-final.mp4`. Open with VLC — the default player gave no audio.
