# Video Playbook: app growth videos with Claude

This is a knowledge transfer on producing app ads, Instagram Reels, YouTube Shorts and long-form videos with AI agents (Claude Code), at high quality and with as little manual work as possible. It covers the **technical pipeline and lessons learned**. Your app, audience, story and look are yours to decide. These files tell your agents *how* to execute any direction well, consistently and fast.

## How to use this

1. Put this folder in your video repo as `video-playbook/`.
2. Copy `CLAUDE.md.template` to the repo root as `CLAUDE.md` and fill in the blanks.
3. Start every Claude session with the "session start" prompt in `11-agent-prompts.md`.
4. When you correct the agent ("captions too small", "music too loud"), make it update `brand.json`, the engine defaults or these files. That feedback loop is what makes video #10 come out right on the first pass.

`ALL-IN-ONE.md` has the same content as one file, for pasting into a single chat.

## Files

| File | Read when |
|---|---|
| `01-principles-toolchain-repo.md` | Day 1: rules, tools to install, repo layout, the spec-as-code model |
| `02-visual-design-system.md` | Before the first video: turn the app's design into `brand.json` so every video looks consistent without design skills |
| `03-research-and-scripting.md` | Picking topics and hooks: yt-dlp research, the outlier metric, script mechanics |
| `04-app-ui-capture.md` | Getting real, clean, deterministic footage of the app (Android/iOS/web) and store screenshots |
| `05-motion-graphics-and-footage.md` | The render engine (Playwright `seek(t)` or Remotion), transitions, stock/b-roll QC, 9:16 reframing |
| `06-audio-vo-sync-captions.md` | TTS/VO chain, whisper word timing with silence snapping, captions, music alignment and ducking, SFX, mastering |
| `07-finish-qa-review.md` | Grade, encode settings, platform specs and safe zones, automated QA, the human review loop |
| `08-youtube-publish-analytics.md` | API upload, scheduling, disclosure, reading analytics, kill and double-down rules |
| `09-google-app-campaigns-and-meta.md` | Running Google App campaigns (bidding, conversions, assets, budget, attribution) and Meta ads |
| `10-gotchas.md` | Skim once, then whenever something looks off |
| `11-agent-prompts.md` | Copy-paste prompts for each stage |

## First-week setup plan

**Day 1: foundations**
- Install ffmpeg, Node + Playwright, Python + `openai-whisper`, `librosa`, `demucs`, `yt-dlp`, and Maestro (for Android flows). Set up an ElevenLabs account if you're using TTS.
- Create the repo skeleton from `01` §3 and add `CLAUDE.md`.

**Day 2: brand system**
- Have Claude build `brand/brand.json` from the app's real colors, fonts and icon (`02`).
- Approve one of 3 style frames per format. Lock it.

**Day 3: capture**
- Set up a demo-mode device or emulator and seeded demo accounts.
- Write Maestro flows for 3–4 key app moments, with event timestamps written to `meta.json` (`04`).

**Day 4: engine + audio**
- Build the `seek(t)` stage with the 9:16, 16:9 and 1:1 layouts.
- Build the VO → `words.json` → captions pipeline.
- Build the music library with a licence file and beat analysis (`05`, `06`).

**Day 5: QA + first ad**
- Write the QA scripts (`07` §18).
- Make the first ad in all 3 shapes and review it on a local board.

**Day 6: launch**
- Upload the videos unlisted.
- Set up the Google App campaign bidding on an in-app activation event (`09`).
- Fix the store listing to match the ads.

**Ongoing**
- Research with `03`.
- Ship variants with genuinely different openings.
- Read the analytics on a schedule (`08`, `09`).
- Fold every correction back into the system.

## The five rules that matter most

1. **Edit as code, render deterministically.** Each video is a spec rendered headless; time comes from measured events, not guesses.
2. **Measure everything:** word onsets, loudness (−14 LUFS / −1 dBTP), crops, frame counts. Agents can't watch or listen, so they verify with tools.
3. **One source of truth for the look** (`brand.json`), plus the real app footage inside a whole phone. That's how you get consistency without an art background.
4. **Licence every asset.** No ripped footage, no commercial songs in exports.
5. **For campaigns, bid on an in-app activation event, not installs, and judge by activated users per rupee.**
