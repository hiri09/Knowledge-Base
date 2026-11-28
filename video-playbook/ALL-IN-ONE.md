# Video Production Playbook for AI Agents

**What this is:** the technical pipeline and hard-won lessons from building app ads, Instagram Reels, YouTube Shorts and long-form videos with AI agents (Claude Code) and as little manual work as possible.

**Who it's for:** you (the human) and your AI agents. Give this whole file to your agent at the start of every video session, or save it as `video-playbook/` in your video repo and reference it from `CLAUDE.md`.

**What it is NOT:** creative direction. Your app, audience, story, look and tone are yours to decide. This file covers *how* to produce whatever you decide, at high quality, consistently and efficiently. Where it says "pick X", you or your agent decide per project.

> **Note to the agent reading this:** treat every numbered rule as a default backed by a real failure. Deviate only with a stated reason. Measure; don't estimate. You cannot watch or listen, so verify everything with tools: frame sheets, loudness meters, transcripts, ffprobe.

---

## Table of contents

1. Core principles
2. Toolchain
3. Repo layout and the spec-as-code model
4. Visual design fundamentals for agents (the "art side")
5. YouTube and market research method
6. Script and structure mechanics
7. Capturing your app's UI (Android, iOS, web)
8. 2D motion graphics: the render engine
9. Stock footage and b-roll: sourcing and quality control
10. Voice-over: generation, recording, enhancement
11. Word timing: the sync backbone
12. Captions
13. Music: selection, beat analysis, alignment, ducking, licensing
14. Sound effects
15. Mix and master
16. Color, grade and encode
17. Platform specs and safe zones
18. Automated QA
19. Human review loop
20. YouTube upload, metadata and analytics loop
21. Google App campaigns: learnings
22. Meta (Instagram/Facebook) ads: short notes
23. Gotchas that cost us real iterations
24. Starter prompts for your agent

---

## 1. Core principles

1. **Edit as code.** Every video is a declarative spec (JSON/YAML/TS data) plus a renderer. Never hand-edit in a GUI timeline as the source of truth. A spec can be diffed, re-rendered, varied and fixed once for all variants.
2. **Deterministic rendering.** The same spec gives the same frames. Rendering seeks to time `t` and draws; there are no live timers or wall-clock animations. Seed every random number. Ban `Math.random()`, `Date.now()` and `performance.now()` in render code.
3. **Measure, never estimate.** Word onsets, loudness, beat times, crop bounds and frame counts all come from tools (whisper, ffmpeg, librosa), not from guesses.
4. **Silent and headless.** Agents render with headless browsers (`--mute-audio`) or `blender -b`, and check results with frame sheets and audio meters. Nothing pops up and nothing plays sound.
5. **Fail loud.** A missing asset, unmocked API call, broken image, console error or silent music bed must crash the build. It must never fall back to a placeholder that ships.
6. **One source of truth per fact.** Brand tokens (colors, fonts, sizes, motion timings) live in ONE file (`brand.json`) that every pipeline reads. fps and resolution live in one config, never per shot.
7. **Git holds the recipe, not the media.** Commit code, specs, scripts, research and transcripts. Renders, audio, footage and models go in gitignored folders or object storage (Cloudflare R2 has no egress fees), with a sha256 manifest in git.
8. **Licence everything.** Keep a per-asset licence manifest (source URL, licence, attribution text, commercial OK?). The build fails if an asset has no licence entry.
9. **One heavy job at a time.** Run renders, TTS and whisper one after another on a laptop, and check free RAM first.
10. **Verify agent claims on disk.** A delegated sub-agent once "analysed" footage it never downloaded. Check that its output files exist and contain what it said.

---

## 2. Toolchain

| Job | Tool | Notes |
|---|---|---|
| Everything glue | **ffmpeg / ffprobe** (v7+) | Trimming, filters, loudness, encode, QA |
| Motion graphics / app ads | **HTML/SVG/Canvas page + Playwright (headless Chromium) frame capture → ffmpeg**, or **Remotion** (React) | Remotion is free for individuals and companies with fewer than 4 employees; above that it needs a paid licence. Motion Canvas and Revideo (MIT) are alternatives. |
| 3D / filmic (optional) | Blender (`blender -b --python`) | Use the AgX view transform |
| Transcription / word timing | **openai-whisper** (Python, `--word_timestamps True`, model `medium` or `large-v3`), or `mlx-whisper` on Apple Silicon | Avoid whisper.cpp token offsets for timing (see §11) |
| TTS voice | **ElevenLabs** (best quality); open options: Chatterbox (MIT), F5-TTS variants | Generate per sentence, best-of-N (see §10) |
| Voice cleanup (phone recordings) | NVIDIA Studio Voice / Adobe Enhance Speech / an ffmpeg chain | Always check the output for latency and slurred words |
| Stem separation | **Demucs** (`htdemucs`, `--two-stems vocals`) | Removes music from VO, or splits a song |
| Beat / tempo analysis | **librosa** | BPM, beats, downbeats |
| Depth for 2.5D parallax | Depth Anything V2 Small | Moves still images in layers |
| Lip-sync (animated characters) | Rhubarb Lip Sync (MIT) | Gives mouth shapes A–H plus rest, timed to the audio |
| Research | **yt-dlp** (metadata only) | View counts, durations, heatmaps |
| Android UI capture | adb, emulator, Maestro, Paparazzi/Roborazzi | See §7 |
| Upload | YouTube Data API v3 | Resumable uploads, scheduled publish |
| Review | Local HTML boards + ffmpeg contact sheets | See §19 |

---

## 3. Repo layout and the spec-as-code model

```
video/
  CLAUDE.md                 # points to video-playbook/, states the rules
  video-playbook/               # this file
  brand/brand.json          # THE source of truth: palette, fonts, type scale, motion, safe zones
  brand/fonts/  brand/logo/ brand/icon.png   # REAL assets, never redrawn
  library/
    sfx/  index.json  LICENCES.md
    music/ index.json  LICENCES.md
    broll/ index.json            # banked clips with description + tags + licence
  capture/                  # app-UI capture scripts and raw takes
  engine/                   # renderer: stage.js / Remotion comps / components
  videos/<slug>/
    spec.json               # the video, as data
    script.md               # VO script + sources
    vo/ words.json beats.json
    out/                    # renders (gitignored)
  qa/                       # QA scripts
  board/                    # review boards (generated HTML)
```

### The spec

The spec is pure data. The renderer turns it into frames. An example shape you can adapt:

```json
{
  "id": "feature-x-v1",
  "format": ["9:16", "16:9", "1:1"],
  "fps": 30,
  "vo": { "file": "vo/vo.wav", "words": "vo/words.json" },
  "music": { "file": "library/music/track07.wav", "in_offset": 12.4, "hit_on": "beat:payoff" },
  "beats": [
    { "id": "hook",   "line": 0, "visual": { "type": "app", "take": "takes/03", "from_event": "typing_start" },
      "caption": { "emph": ["exact phrase"] }, "transition_in": "cut" },
    { "id": "action", "line": 1, "visual": { "type": "app", "take": "takes/03", "from_event": "send_at" }, "sfx": ["tap"] },
    { "id": "payoff", "line": 2, "visual": { "type": "app", "take": "takes/03", "from_event": "reply_at" }, "music_hit": true },
    { "id": "end",    "visual": { "type": "endcard" }, "duration": 3.0 }
  ],
  "endcard": { "cta": "Install now", "icon": "brand/icon.png" }
}
```

Key ideas:

- **Times come from events**, not hand-typed seconds: word onsets in `words.json`, app events in a capture's `meta.json`, beats in the music analysis. The planner places beats from those.
- **One timeline, many shapes.** Layouts for 9:16, 16:9 and 1:1 are defined once in the engine, so one fix lands in every variant.
- **Make the spec drivable by environment variables or CLI flags** (music on/off, music track, levels), so one spec renders a menu of options for review. Bake the winner back into the spec's defaults.

### Build as a DAG (when you grow)

```
script → vo → words/beats → (visemes) → capture/layout → render → mix → mux → qa → package → upload
```

Cache each step by a hash of its inputs, parameters and tool versions, so only changed steps re-run. A ~300-line runner script is enough; don't install Airflow. Each render writes `render_manifest.json` (git sha, tool versions, seeds, input hashes).

---

## 4. Visual design fundamentals for agents (the "art side")

You don't need to be a designer. You need a **system** the agent follows every time, so every video looks like it came from the same studio. Consistency beats occasional brilliance.

### 4.1 Build a `brand.json` before making any video

```json
{
  "palette": {
    "bg": "#0F1220", "surface": "#1A1F35", "text": "#F5F3EE", "muted": "#9AA0B4",
    "primary": "#5B6CFF", "accent": "#FFB547", "highlight": "#FFE27A"
  },
  "fonts": { "display": "brand/fonts/Display-Bold.ttf", "body": "brand/fonts/Body-Medium.ttf" },
  "type_scale_px_at_1080w": { "hero": 96, "h1": 72, "caption": 64, "small": 40 },
  "radius": 28,
  "motion": { "enter_ms": 280, "exit_ms": 200, "ease_enter": "cubic-bezier(0.16,1,0.3,1)", "ease_exit": "cubic-bezier(0.7,0,0.84,0)" },
  "safe_zone_9x16": { "top": 0.14, "bottom": 0.35, "sides": 0.06 }
}
```

**Derive it from the app's own design** (its colors, fonts, illustration style, icon). An ad that looks like the app keeps the promise the install lands on. A generic flat background with a generic phone looks like every other app.

### 4.2 Rules an agent can apply mechanically

**Color**
- Use 1 background family, 1 text color, 1 primary and 1 accent. **Use the accent for one thing per frame** (the key word or the button) and nothing else.
- Check contrast: at least 4.5:1 for normal text and 3:1 for large text, against the actual frame behind it. Compute it; don't eyeball it.
- Don't put text over a busy image without a scrim (a dark gradient behind the text area) or an outline.

**Typography**
- Use at most 2 typefaces (display + body). Prefer the app's real fonts.
- Set hierarchy by **size and weight**, not by more colors.
- Keep line length short. Captions are 6–7 words maximum per line group, ideally 3–5.
- Don't break hyphenated words at the hyphen. Avoid one-word orphan lines.
- Use real font files and check that they load (`document.fonts.ready`) before capturing. Otherwise the first frames show a fallback font.

**Layout**
- Use an 8 px spacing grid. Give elements consistent margins from one place in `brand.json`.
- Keep text and key UI inside the platform safe zones (§17). Check them automatically.
- Empty space must look intentional. A frame with one small element and 40% emptiness reads as broken, not minimal.
- Show **the whole phone** when showing the app: a realistic device frame at about 75–80% of frame height, with the whole screen visible. Keep any zoom-in gentle (≤1.15x). Tight crops and 1.5x+ punch-ins on UI look amateur.
- **Never put captions over the app UI.** Put them above, below or beside the phone.

**Motion**
- Every move is eased; never use linear motion for UI or text.
  - Enter: ease-out (fast start, soft landing), 200–400 ms.
  - Exit: ease-in, shorter than the enter.
  - Never longer than 500 ms for UI or text.
- One thing moves at a time, or things move in a clear stagger (40–80 ms between items).
- A slow push-in (2–8% scale over a shot) keeps a static image alive. Anything less than about 6% over 4–5 s is invisible and reads as a freeze.
- Shots shorter than ~0.8 s don't register. Shots longer than ~3–4 s without internal motion feel stuck.
- **Uniform rhythm reads as AI-made**: every shot the same length, every transition a dissolve, every caption 3 words. Vary shot lengths, emphasis and pauses on purpose.
- Over-correcting also fails: a flash or whoosh on every cut reads as cheap. Pick 2–4 transition types that fit the brand and use them by rule (see §8.4), not at random.

**Consistency**
- Make a **style frame** first: one still per format showing the bg, phone, caption and end card. Get it approved before building the timeline.
- Use the **real icon and logo files**. Never let the agent redraw or "recreate" brand assets.
- Lock decisions into `brand.json` and the engine's components. Each new video should only touch its spec.

### 4.3 Efficient way to get "good" without art skill

1. Collect 10–20 reference ads or videos you like (from competitors or other categories).
2. Have the agent extract frames (see §5.3) and write a **measured** description: average shot length, caption size as a % of frame height, number of colors, how the phone is framed, transitions used, music tempo.
3. Turn that into `brand.json` and engine defaults.
4. Render a 3-option style-frame grid. You pick one by eye. Lock it.

---

## 5. YouTube and market research method

### 5.1 Find what actually works (data, not vibes)

- Use **yt-dlp in metadata mode only** (no downloading):

  ```bash
  yt-dlp --skip-download --flat-playlist -J "ytsearch50:your query"
  yt-dlp --skip-download -O "%(upload_date)s\t%(view_count)s\t%(duration)s\t%(channel_id)s\t%(channel_follower_count)s\t%(title)s" URL
  ```

- If requests fail with 403 or throttling, cycle player clients: `--extractor-args "youtube:player_client=mweb"`, then `web_embedded`, then `tv`.
- Write a query file of `topic|query` lines in every phrasing your audience uses (English, Hinglish, native script).
- Search long-form and Shorts separately. Cache raw JSON responses and stay under a request budget.
- yt-dlp's date-sorted search is unreliable, so **date-check every candidate yourself**.

### 5.2 The key metric: outlier multiple

- **outlier = video views ÷ median views of that channel's last ~30–60 uploads of the same type** (exclude the video itself).
- Raw views mostly measure channel size. A 50× outlier on a 10K-subscriber channel is a real demand signal; 1M views on a 10M-subscriber channel isn't.
- **Proof rule before committing to a topic or format:** at least 2 recent videos (last ~90 days) from *different* channels with the same topic and hook, each ≥20× its channel median or ≥1M views.
- **Label every claim** in research notes: `[M]` measured, `[D]` derived, `[J]` judgement, `[3p]` third-party. Always list the gaps (for example, no subscriber history, or search only shows what it surfaces).

### 5.3 Study the craft of references (quality bar)

- Download only small windows of reference videos for internal study, then delete them:

  ```bash
  yt-dlp -f "bv*[height<=720]" --download-sections "*00:00-00:30" --force-keyframes-at-cuts URL
  ```

- Extract frames at 2 fps plus scene cuts (`select='gt(scene,0.3)'`). Make contact sheets (`tile=5x4`).
- Record per reference:
  - average shot length (ASL)
  - caption size and position
  - how the product is framed
  - time to first caption
  - time to first cut
  - music tempo
  - number of on-screen elements
- Set your targets from those measurements. Never reuse their frames.

### 5.4 Find the hook moment of a song or video

- `yt-dlp -J URL` includes a **`heatmap`** array (YouTube's "most replayed" data) on many videos.
- The peak is the most recognisable moment. That beats picking "the loudest part" from an RMS envelope.

### 5.5 Ad research

- Look through Meta Ad Library and Google Ads Transparency Center for competitors and adjacent apps.
- Note which ads have been running longest (long-running = profitable). Note their hook in the first 3 s, the length, how the app is shown and the CTA.

---

## 6. Script and structure mechanics

These are structural mechanics, not creative direction.

- **First frame:** never black, never a fade-in, never a logo. Frame 0 should be a complete, legible still, because the platform scores the first second.
- **First words:** text or speech on screen within ~1 s. Trim the dead air most recordings have before the first word.
- **Payoff within 3–5 s of the hook on ads.** A hook with no quick payoff is treated as clickbait by both viewers and the platform.
- **Promise → payoff lint:** give every hook a `promise` id that a later beat must `pays`. Lint the spec for it.
- **Every line passes the "stranger test":** someone who has never heard of the app understands it. Insider feature names fail, so name features by what they do.
- **On-screen claims must be true:** check every number, price, "free", "unlimited" or limit against the product's real config before it goes in a video.
- **Loop for Shorts and Reels:** design the last beat so it flows back into the first. End cards play over moving footage, not a frozen frame.
- **Ad length:** finals around 15–30 s, plus a ≤6 s bumper if useful. 16:9 YouTube ads must land hook, answer and brand by **5.0 s** (the skip button).
- **Variety:** platforms (YouTube's 2025–26 "inauthentic / mass-produced content" policy, and ad systems) penalise templated sameness. Rotate structures, vary the outro, and don't reuse an identical closing card on every upload.
- **Script schema** (per video):

  ```json
  {"id":"...", "hook_text":"...", "title":"...",
   "beats":[{"text":"...", "visual":"...", "pause_after":0.3, "promise":"p1"}],
   "cta":"...", "sources":["..."]}
  ```

- **TTS text normalisation** (if using TTS):
  - Expand digits, dates and currency into words.
  - Split into 15–25-word clauses.
  - Use punctuation to control pauses.
  - Merge very short lines (under ~14 characters) into the next one; tiny prompts are unstable.

---

## 7. Capturing your app's UI

This is the most important input for app ads. The goal is **real app footage that is deterministic**, so it can be cut frame-exactly to beats.

### 7.1 Approaches compared

| Approach | Verdict |
|---|---|
| Plain screen recording (`adb screenrecord`, phone recorder) | OK for quick drafts. Not deterministic, has dropped frames, toasts, keyboard bands and random timing, so it's hard to cut to beats. |
| Rebuild the UI as video code (Remotion/HTML) | Pixel-perfect and supports any camera move, but you maintain a second copy of the UI that drifts from the real app. Use it only for stylised or abstract UI moments. |
| **Real app, scripted input, captured deterministically** | **Best.** Real pixels, and every event has a known timestamp. |

### 7.2 Native Android (most likely your case)

**Clean device state (do this every take):**

```bash
# Demo mode: clean status bar (full battery, fixed clock, no notifications)
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 -e mobile show -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
# Disable animations only if you will re-animate in post (otherwise keep them; real motion looks good)
# adb shell settings put global window_animation_scale 0
```

**Scripted input:** use **Maestro** (YAML flows: tap by text or id, type, scroll, wait for an element). Flows are reproducible, so takes are repeatable. Alternatives are UIAutomator, Espresso, or `adb shell input tap/text/swipe` for simple cases.

**Recording:**
- `adb shell screenrecord --bit-rate 20M --size 1080x2400 /sdcard/take.mp4` has a 3-minute limit. It is variable frame rate, so conform it with `ffmpeg -i take.mp4 -vf fps=30 -c:v libx264 -crf 12 take30.mp4` before editing.
- `scrcpy --record take.mkv --no-playback` on Linux/macOS is higher quality with less overhead.
- Use the emulator (Pixel 8-class AVD) for a consistent resolution, or a real device for real performance.

**Log event timestamps:** have the Maestro flow (or a debug-build hook) print events with timestamps (`TYPING_START`, `SENT`, `REPLY_SHOWN`) to logcat. Parse them into `meta.json` so the planner cuts on real events. Line them up with the recording by a visible sync event (for example a tap at t0).

**Frame-perfect stills and short animations:** use Compose screenshot testing (**Paparazzi** or **Roborazzi**) to render screens at exact states without a device. It's great for store screenshots and for animating screens in the motion engine.

**Live AI or network responses:** record the real response once, then replay it from a mock at the recorded chunk timings. The text and timing stay real, and every take is identical. Shoot 6–10 takes when content varies, and log pass/fail per take.

**Data:**
- Use seeded, fictional demo accounts on a staging backend, never real users' data.
- Pick demo data whose real output reads well.
- Pin every on-screen value you mention in captions to a facts file.

**Hygiene:** dismiss coach marks, tooltips and debug overlays like a real user would. Hide the keyboard band if it isn't part of the story. Fail the take on any crash, ANR or unexpected dialog.

### 7.3 Web or hybrid apps (Capacitor/React Native web, PWA)

If the app runs in a browser, the strongest method is **Playwright + a virtual clock**:

1. Emulate a phone: 390×844 CSS px, deviceScaleFactor 2–3, `isMobile: true`, touch on. Set it via CDP `Emulation.setDeviceMetricsOverride` on the same session you screenshot from.
2. Inject a shim before any app script. It replaces `setTimeout`, `setInterval`, `requestAnimationFrame`, `performance.now`, `Date`, and CSS/Web Animations' `currentTime`, all driven by a virtual clock.
3. Loop: advance the clock to `n/30` s, then `Page.captureScreenshot`. This gives perfect 30 fps with zero dropped frames.
4. Scripted typing at ~6–7 chars/s with seeded jitter, eased drags, and named events written to `meta.json` (including every keystroke time, for keyboard foley).
5. Don't use CDP `startScreencast`. It ignores DPR and only emits on change, so holds get truncated. Chrome's built-in virtual time doesn't hold CSS animations in new headless mode.
6. **ES-module gotcha:** imports are hoisted, so seed storage and install the clock in a module imported *first*. Otherwise the app boots signed-out.

### 7.4 iOS

- Use `xcrun simctl io booted recordVideo --codec h264 take.mp4` plus XCUITest (or Maestro, which supports iOS) for scripted input.
- `xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --cellularBars 4` cleans the status bar.

### 7.5 Store screenshots

1. Capture clean screens.
2. Compose each in an HTML template: headline + device frame + background from `brand.json`.
3. Screenshot the template with Playwright. The page sets `window.__ready = true` when fonts and images have loaded.
4. Export 24-bit PNG with no alpha.

**Play Store sizes:** feature graphic 1024×500, icon 512×512, 2–8 phone screenshots (1080×1920 works well).

**Time your shoots after UI redesigns ship.** A video of real screens goes stale the day those screens change.

---

## 8. 2D motion graphics: the render engine

### 8.1 The `seek(t)` pattern (framework-free, recommended)

- An HTML page has `build(config)` (lays out the stage once) and `seek(t)` (poses every element for time `t`: positions, opacity, text reveals, which capture frame shows in the phone).
- There are **no CSS animations and no timers.** All motion is a pure function of `t`.
- A Node script with Playwright loops over frames:
  1. `await page.evaluate(t => seek(t), n/fps)`
  2. Wait for images to `decode()`.
  3. Screenshot.
  4. Pipe the frame to ffmpeg.
- Render at 2× and lanczos-downscale to the output size for crisp text.
- Use `--headless=old` or check the viewport: new headless can clamp a tall viewport to the host screen, and the bottom of a 1920-px frame silently never rendered for us.
- Always launch with `--mute-audio`.

Encode:

```bash
ffmpeg -framerate 30 -i frames/%05d.png -vf "scale=1080:1920:flags=lanczos,format=yuv420p" \
  -c:v libx264 -profile:v high -crf 18 -preset slow -movflags +faststart video_noaudio.mp4
```

### 8.2 Remotion (if you prefer React)

Remotion is fine, with these traps:
- CSS `@keyframes` don't advance during render. Express all motion from `useCurrentFrame()`.
- `useCurrentFrame()` inside `<Sequence>` is local to that sequence, so ambient loops restart every beat. Pass the absolute start as an offset.
- `fade()` transitions fade the incoming scene over the outgoing one; they aren't symmetric. Give every scene an opaque background.
- `Easing.quint` doesn't exist; use `Easing.poly(5)`.
- `loadFont()` with no options downloads every weight. Specify the weights so renders don't depend on the network.
- An iframe of the real web app inside Remotion works for "real UI with camera moves". Seeking backwards reloads the iframe, which resets app state.

### 8.3 Planner

- Places beats from **events** (word onsets, capture `meta.json` events, music downbeats), not hand-typed seconds.
- A long wait in the capture (for example AI thinking time) gets one mid-cut, not a speed ramp.
- Snaps cuts to the nearest music beat when within ~0.2 s.
- Gives transitions 10–16 handle frames on each side.

### 8.4 Transition vocabulary: choose by rule, not at random

Define a small set in the engine. Durations at 30 fps:

| Name | What | Frames |
|---|---|---|
| `cut` | hard cut (optionally with a tiny shake or flash for impact) | 0 |
| `dissolve` | crossfade | 12–18 |
| `slide` / `push` | content pushes in with slight motion blur | 10–14 |
| `zoom` | zoom-through with radial blur | 10–14 |
| `whip` | fast directional blur pan | 7–9 |
| `wipe` / `mask` | shape or luma reveal | 14–26 |

Rules that keep it human:
- Map transitions to **meaning**: same topic → soft; new section → stronger; payoff → the "hero" transition.
- Never use the same transition twice in a row, and never the same whip direction twice in a row.
- A cut between two shots of the same source is never a bare hard cut (it reads as a jump).
- Pick a palette of 2–4 transitions per brand. Don't use all of them.

### 8.5 Other effects

- **2.5D parallax on still images:**
  1. Generate a depth map (Depth Anything V2).
  2. Scale near layers more than far ones.
  3. Move 1.5–2.5% of the frame, eased.
  4. Skip flat graphics.
- **Grain:** static or very light. Per-frame animated grain multiplies bitrate (~14× in our test) and YouTube re-encodes it into mush.
- **Composite text and captions AFTER all effects**, so shakes and flashes never move or wash out the text.

### 8.6 Animated characters (if you ever do explainer characters)

- **Mouths:** 4–8 shapes driven by Rhubarb cues or the audio envelope at 8–12 Hz. Add a blink every 3–5 s.
- **Idle motion:** breathing ±1.5% scale at ~0.25 Hz, head sway ±3°, a gesture at least every 3 s. Never freeze mid-pose.
- **Backgrounds:** ≥3 depth layers with 5–15% parallax.
- Cheap but effective: static bodies with mouth flaps plus a slow push-in. Spend effort on lighting and backgrounds, not complex rigs.

---

## 9. Stock footage and b-roll: sourcing and quality control

**Sources:**
- Licensed stock (Adobe Stock, Pexels, Pixabay video, Storyblocks) or your own shoots.
- Native-vertical 4K stock (2160×3840) is the sharpest source for 9:16: a clean 2× downscale. Stock search "portrait" filters often don't apply to video, so put "vertical video" in the query and read width × height.
- Check each clip's "AI-generated" flag if you want real footage only.

**Hard rejects (defects):**
- burned-in subtitles
- full-width bottom bands or tickers
- watermarks (never crop one out)
- letterbox bars you can't remove
- fake "8K" or AI upscales
- low-res re-uploads

**Fake upscale check:** crop a 1:1 native-pixel region and look for real grain, edge micro-contrast and hair or fabric texture. AI upscales look waxy at 100%.

**Run `cropdetect` on every source:** `ffmpeg -i src.mp4 -vf cropdetect=limit=24:round=2 -f null -`. Films are often 2.39:1 inside a 16:9 frame. Crop to the active picture first, then reframe.

**Scene detect:** `select='gt(scene,0.08)'` on the delivered crop. A higher threshold misses cuts. Treat any "shot" over 15 s as suspect.

**Scrub the whole shot, never one frame:**
- Sample N frames evenly across the span with the crop applied: `fps=N/duration,scale=150:-1,tile=Nx1`.
- Compositions drift and people walk through.
- Use small strips (~150 px tiles) to check cuts and bleed. Use full-size frames (≥700 px) to check meaning; small frames mislead.

**9:16 reframing:**
- Never blind-centre-crop. Set a per-shot horizontal offset to the subject.
- Faces and single subjects survive a vertical crop; wide scenes don't.
- Alternative: a 4:5 or 1:1 panel over a blurred, darkened copy of the same clip:

  ```bash
  -filter_complex "[0]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:4,eq=brightness=-0.06:saturation=0.7[bg];[0]crop=ih*4/5:ih,scale=1080:1350[fg];[bg][fg]overlay=0:(H-h)/2"
  ```

- Keep one fit per video; mixed shapes look like an error.

**Short clip in a long slot:**
- Use gentle uniform slow motion (`setpts`, plus `minterpolate=fps=50:mi_mode=blend` above 1.5×), never a freeze-hold.
- Or split the line across two clips.

**Conform fps before editing:** `-vf fps=30`. Then assert `nb_frames >= span_seconds × 30`. Many editors (Blender included) consume one source frame per timeline frame, so a 24/25 fps clip runs short and silently holds its last frame.

**B-roll bank:** whenever you get usable footage, store it in `library/broll/` with an `index.json` entry: description, tags, mood, licence, source and usable time spans. Future videos query the bank first.

---

## 10. Voice-over: generation, recording, enhancement

### 10.1 TTS (ElevenLabs or open models)

1. **Generate per sentence or beat, never one long pass.** Long text makes models skip or loop.
2. **Best-of-N:** generate 3–6 takes per line with different seeds, then score them automatically:
   - Run ASR on each take (whisper-large-v3) and compute the character error rate (CER) against the script. Normalise first: strip punctuation but keep letters of any script.
   - Measure pitch (librosa `pyin` median and range), speaking rate and RMS.
   - Cost = `CER×10 + 0.15×|pitch deviation from the speaker median, in semitones| + 0.8×|log(rate / median rate)| − 0.04×min(pitch range, 14)`. Pass if CER ≤ 0.08. Allow a manual override per line.
3. Trim silence (librosa `top_db=38`, 35 ms pad, 12 ms fades). Level each take to the speaker's RMS target (±3 dB max).
4. **Stitch with natural, varied pauses:**
   - Period ~400 ms, question ~450 ms, exclamation ~340 ms, +100 ms after an ellipsis.
   - ±45 ms random jitter (seeded), clamped to 250–700 ms.
   - Scale pauses up (×1.2) for slow or emotional lines and down (×0.8) for fast ones.
5. Lay faint room tone (brown noise at about −55 dBFS) under the whole VO, so pauses are never digital zero. Digital silence reads as an edit error.
6. Output `timeline.json`: `[{id, beat, text, start, end, pause_after_ms}]`.

### 10.2 Human recording

- Record in a quiet, soft room (closet, blankets). Keep the phone or mic 15–20 cm from the mouth, slightly off-axis. Record 48 kHz WAV if possible.
- Record 2–3 takes of each line. **Transcribe every take to identify it; don't trust filenames.**
- **Enhancement:** a speech-restoration model (NVIDIA Studio Voice, Adobe Enhance) beats classic denoise chains for phone audio. Always check:
  - **Latency:** cross-correlate with the raw take. One hosted API returned audio 142 ms late.
  - **Slurring:** re-transcribe the key words.
  - **High-frequency roll-off.**
- Local ffmpeg fallback chain:

  ```
  highpass=f=85,lowpass=f=9500,afftdn=nf=-28:nt=w,acompressor=threshold=-20dB:ratio=3:attack=15:release=250,loudnorm=I=-18:TP=-2:LRA=11
  ```

### 10.3 VO stem polish (TTS or human, after enhancement)

```
highpass=f=80,
deesser=i=0.35,
equalizer=f=180:t=q:w=1.2:g=-1.5,     # less mud
equalizer=f=3800:t=q:w=1.6:g=2.2,     # presence
acompressor=threshold=-18dB:ratio=2.5:attack=8:release=140:makeup=1.5,
loudnorm=I=-16:TP=-1.5
```

### 10.4 Editing VO safely

- **Trim with input seek:** `ffmpeg -ss T -i vo.wav -t D -af "afade=in:st=0:d=0.08,afade=out:st=<D-0.5>:d=0.5"`. Fade times are *output-relative* after an input seek. Using absolute times gave us a silent file.
- Re-pace with the fewest edits possible, all inside measured silences. Cutting at every gap and re-joining left an audible doubled fragment.
- Generate inserted silence with `aevalsrc=exprs=0:duration=0.7:sample_rate=48000`. `anullsrc` is infinite and once wrote a 24 GB file.
- After any edit, re-transcribe and confirm the first and last words are intact.

### 10.5 Voice cloning and consent

Clone a voice only with that person's explicit consent. Disclose synthetic voices where platforms ask (YouTube's "altered or synthetic content" toggle).

---

## 11. Word timing: the sync backbone

Everything (captions, cuts, music hits, SFX) hangs off accurate word onsets. Whisper alone is *not* accurate enough.

**The pipeline:**

1. **Envelope first.** Compute a 10–20 ms RMS envelope and run `ffmpeg -af silencedetect=noise=-30dB:d=0.13`. This decides where speech actually is.
2. **Transcribe** with Python `openai-whisper`:

   ```python
   model.transcribe(path, word_timestamps=True, condition_on_previous_text=False)
   ```

   - `condition_on_previous_text=False` prevents loops and dropped sentences.
   - For mixed-language VO, transcribe each acoustic run separately with language auto-detect. Forcing one language silently drops words in the other.
3. **Align to the script:** keep whisper's *times* but your script's *words* (difflib alignment), so every word gets the correct spelling and a `beat` id.
4. **Snap to silence.** Whisper systematically times a word that follows a silence too early (it absorbs the silence; we measured 0.25–1.0 s errors).
   - For each phrase start, move the onset to the measured end of the preceding silence.
   - Then check every word: if an onset sits at the noise floor, move it to where energy rises.
   - For beat boundaries: in a ±0.6 s window, find the longest run below −38 dB (relative to the 95th-percentile level) and cut there. If there is none, use the quietest 30 ms.
5. **De-collide:** onsets must strictly increase, with at least 0.1 s between them. Identical timestamps make word-by-word reveals silently swallow words.
6. **Hand-verify the payoff word** by its envelope. It was wrong on most of our early videos.
7. **Never let whisper see leading silence.** Find the true voice onset, trim, then transcribe. Whisper hallucinates words into silence and room tone.
8. **Visual verification:** grab a frame at each word's onset and have a vision pass list the visible caption words against the expected ones.

Outputs: `words.json` (`[{w, start, end, beat}]`) and `beats.json`. Keep the raw `*_whisper.json` for debugging.

---

## 12. Captions

**Rendering:**
- Render captions as HTML/CSS in the same headless browser (best typography, emoji and complex-script support), or pre-render them to PNG and overlay.
- For Indic scripts (Devanagari etc.) many engines mis-shape glyphs (matras reorder). Use a browser or HarfBuzz (`hb-view`) to render them.

**Placement:**
- Inside the safe zone (§17), lower-middle of the frame, never over the phone UI.
- Wrap at about 85–90% of frame width.

**Size:**
- 9:16 captions are about 4–6% of frame height (≈80–110 px at 1920).
- Emphasis words are bigger (up to ~1.3–1.4×).
- Line spacing is 1.15–1.35×.
- For stacked lines, space by the *rendered* glyph extent, not font size.

**Chunking:**
- Groups of 1–4 words, ≤20 characters per line, breaking at sentence ends and beat changes.
- Merge one-word orphans into the previous group.
- Split long sentences at the comma into two groups: group 1 clears before group 2 builds.

**Emphasis:**
- **One** emphasised word or phrase per group: a key number first, then the benefit word, then the longest word.
- Pick ONE emphasis style for the brand (color word, highlighter band behind the phrase, scale pop) and use only that.

**Legibility:** add a thin dark outline (3–4 px), or a soft glyph-shaped shadow, or a scrim. Check contrast numerically against the frame behind.

**Timing:**
- Word-by-word reveal shows each word ~0.3 s before its spoken onset; whole-group captions ~0.4 s before.
- Fade or scale in over ~100 ms (e.g. scale 0.92 → 1.0 in 3 frames). An emphasis pop goes 1.0 → 1.12 → 1.0 over ~6 frames.
- Minimum on-screen time is 0.8 s (about 0.3 s per word to read).
- Hide ~0.12 s after the last word, or at the next group if the gap is <0.35 s.
- Keep the lead consistent across all caption types so two groups never overlap.
- Captions appear slightly *before* a cut lands, so the outgoing clip must be clean during that lead too.

**Always caption.** Most viewers watch muted. Ship every cut with captions.

**Truthful copy:** no claim on screen the product can't back.

---

## 13. Music: selection, beat analysis, alignment, ducking, licensing

### 13.1 Licensing (read first)

- **Bake only royalty-free or properly licensed music into exported files.**
  - In-app music libraries (Instagram, TikTok) don't survive export, and business or ad accounts can't use most of them.
  - Commercial songs get Content ID claims: Shorts of 1–3 min with a claim can be blocked worldwide, and ads get disapproved.
- For YouTube ads, check that the track has **no Content ID registration**. Keep `library/music/LICENCES.md` with the source, licence, Content ID status and URL per track.
- Stock music licences usually forbid use as a sonic logo or trademark.
- Good sources:
  - YouTube Audio Library
  - paid libraries (Artlist, Epidemic, Musicbed)
  - commissioned tracks
  - Pixabay music (filter out AI-generated and Content-ID-registered tracks)

### 13.2 Choosing a track (agents can't listen, so measure)

- Analyse each candidate with librosa: BPM, beat times, downbeats (best beat phase mod 4; watch for double-time readings), RMS energy per bar and crest factor.
- **Offer 2–3 measured options to the human to choose by ear.** Don't silently pick one.
- For VO-led videos: an instrumental, or vocals in a language the audience doesn't understand. A same-language vocal competes with the VO.
- If there are lyrics, transcribe the used window in 10 s chunks (whisper loops on long sung material). Check the lyrics for profanity and for meaning that contradicts your message.

### 13.3 Aligning music to the edit

- Choose the song's `in_offset` so a strong moment (a drop or bar line) lands exactly on your **hero moment** (the key action or payoff). Scan offsets every 0.5 s to score options.
- Start the bed on a downbeat. Time-stretch at most ±3% to make bars fit.
- **Ad arrangement trick:** at the hero action, dip the music for ~2 beats instead of cutting it.
  - 70 ms crossfade into a copy low-passed at ~380 Hz.
  - The percussion keeps the pulse, so there's no dead air.
  - The full band returns exactly on the payoff downbeat.
  - The hero sound (tap or send) plays clean in the dip.
- **Don't fade in music at the start.** Our 1.2 s fade-in made the first 0.4 s the quietest moment of the video, exactly while the platform scores the hook.
- **Loops:** cut the bed 0.5 s long and crossfade the overhang into the head.

### 13.4 Levels and ducking

- **Measure everything first:** `ffmpeg -i x -af loudnorm=print_format=summary -f null -`.
- Pre-normalise every bed to −16 LUFS (two-pass) before applying any duck gains. Raw gain multipliers on beds of different loudness give wildly different results.
- Re-measure the *window you actually use*, not the track average. One window sat 5–10 LU below the track average.
- **Duck envelope driven by `words.json`:**
  - Under speech: gain 0.08–0.17 (≈ −15 to −22 dB). Vocal songs go lower.
  - Music-only gaps: 0.4–0.6.
  - Intro and hero moments: 0.85–0.95.
  - Attack ~0.3 s, release ~0.45 s.
  - Merge word spans closer than 1.5 s so the bed doesn't pump between words.
  - Target the VO sitting 8–12 dB above the music.
- **Carve space for the voice:** `highpass=f=40,equalizer=f=300:t=q:w=1:g=-1.5,equalizer=f=2600:t=q:w=1.2:g=-3,loudnorm=I=-16`.
- Don't loudnorm a section whose build-up dynamics are the point; use static gain instead.

---

## 14. Sound effects

**Library:**
- 48 kHz stereo, trimmed, peak-normalised to −3 dBFS.
- `index.json` holds `{file, category, tags, duration_s, source_url, licence, attribution_required}`. Generate `LICENCES.md` from it.
- Sources: CC0 or public domain (freesound CC0, OpenGameArt), paid packs, or sounds you synthesise yourself.

**Anchor placement:** every SFX has an anchor.
- Whooshes and impacts: the loudest point (peak of a 20 ms envelope).
- Risers and reverse swells: the end (last sample above 12% of peak).
- Place each file so the anchor lands exactly on the cut or event. Use a 4 ms fade-in.

**Transition → sound map:**

| Transition | Sound |
|---|---|
| whip / zoom | whoosh |
| wipe / slide | soft air |
| leak / glow | shimmer or reverse swell |
| hard impact | thud |
| dissolves | mostly silent |

**App foley:**
- UI taps on real tap events.
- Keyboard clicks on the logged keystroke times.
- One signature "hero" sound per ad.
- Rule of thumb: sound follows *arrivals* (an element landing, a message appearing). Text reveals and counters stay silent, otherwise it's noisy.

**Restraint:**
- At most ~2 big stingers per video.
- Space accents ≥3 s apart.
- Reduce SFX that overlap speech by ~5 dB.
- Duck the SFX bus ~35% under the VO envelope.

**Tuning:** if you synthesise tonal cues, measure the music's key first. A cue a few cents off the bed beats audibly.

**Silence is designed:** dropping the music for 0.5–1.2 s before a reveal is powerful, but keep room tone underneath. Never use digital zero.

---

## 15. Mix and master

- **Buses:** VO | music | SFX | (room/ambience).
- **Final master:** two-pass loudnorm to **−14 LUFS integrated, true peak ≤ −1.0 dBTP**:

  ```bash
  # pass 1: measure
  ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json -f null -
  # pass 2: apply with measured_I/TP/LRA/thresh + linear=true
  ffmpeg -i mix.wav -af loudnorm=I=-14:TP=-1.0:LRA=11:measured_I=..:measured_TP=..:measured_LRA=..:measured_thresh=..:offset=..:linear=true -ar 48000 master.wav
  ```

- **Measure the final MP4's AAC audio, not the WAV.** Encoding shifts peaks.
- Don't downmix to mono before measuring: a mono measurement of a stereo file reads ~3 LU off.
- AAC adds ~2,000–3,000 priming samples at the start. Account for this in loop or sync checks on decoded MP4s.
- **Mux:** `-c:v copy -c:a aac -b:a 256k -ar 48000`.
- **Deliverables:**
  - the master
  - stems that sum to the master
  - a cue sheet JSON (time, bus, file, level, licence)
  - a phone-speaker check: band-limit to 300 Hz–8 kHz and confirm the VO is still clear

---

## 16. Color, grade and encode

**Grade:**
- Grade per clip to a target look, not one global filter. Prefer natural, gentle corrections, e.g. `colortemperature=5200,eq=contrast=1.08:saturation=1.15:gamma=1.02`. Heavy saturation pushes give orange skin.
- No auto white balance on already-graded footage; it "fixes" deliberate color casts.
- **LUTs:** always `format=gbrp` immediately before `lut3d`. Otherwise ffmpeg may apply an RGB LUT in YUV, which gives a magenta cast. Blend at partial strength with `split` + `blend=all_mode=normal:all_opacity=0.6`.
- **Grain:** luma only (`format=yuv444p,noise=c0s=6:c0f=t+u`); RGB noise gives colored confetti. Apply it last, lightly, or not at all for UI-heavy ads.
- Do blends, glow and halation in RGB (`format=gbrp`).
- 10-bit sources with an unset transfer characteristic can break ffmpeg encodes. Put `setparams=color_trc=bt709` first.

**Encode (delivery):**

```bash
-c:v libx264 -profile:v high -pix_fmt yuv420p -crf 18 -preset slow -r 30 \
-colorspace bt709 -color_trc bt709 -color_primaries bt709 -movflags +faststart \
-c:a aac -b:a 256k -ar 48000
```

- 30 fps constant for social and ads; 24 fps is fine for cinematic long-form.
- SDR Rec.709, 8-bit.
- `-tune animation` for flat 2D graphics.
- Avoid CRF ≥ 28 on dark gradients (banding). Render at the true output resolution; an upscale isn't real detail.
- If a browser or upload tool has a size cap (we hit 10 MB on one upload path), re-encode at CRF 20 and copy the audio. SSIM stayed 0.998.

---

## 17. Platform specs and safe zones

Re-check each platform's current help pages before a campaign; specs change.

| Placement | Ratio | Size | Keep clear |
|---|---|---|---|
| Reels / Stories / Shorts / TikTok | 9:16 | 1080×1920 | Meta: top 14%, bottom 35%, sides 6%. YouTube Shorts: top ~8%, bottom ~15%, plus the right-side action rail. |
| Feed (Meta) | 4:5 | 1080×1350 | Edges |
| YouTube in-stream / Google | 16:9 | 1920×1080 | Bottom-left (skip/CTA overlay). **Brand and payoff by 5.0 s.** |
| Square | 1:1 | 1080×1080 | Edges |
| Play feature graphic | — | 1024×500 | — |
| App Store preview | — | 886×1920, 15–30 s, ≤30 fps | — |

**Shorts layout tip:** the action rail covers the lower right, so put the phone on the left and the captions upper right, or centre with captions above the phone.

---

## 18. Automated QA (run before any human sees a video)

Write `qa/` scripts that output a `QA.md` per render and fail the build on violations.

**Media**
- ffprobe: duration, resolution, exact aspect, fps (constant), codec, pix_fmt, color tags, audio present.
- Audio and video lengths match within 1 frame.

**Freeze and black frames**

```bash
ffmpeg -i out.mp4 -vf freezedetect=n=0.003:d=0.25 -f null -
ffmpeg -i out.mp4 -vf blackdetect=d=0.1:pix_th=0.05 -f null -
```

If a clip is clean on its own but frozen in the render, the bug is timeline placement (span math or fps), not the clip. Check the very last frame too; off-by-one end frames render black right at the loop point.

**Loudness:** −14 LUFS ±0.5 and TP ≤ −1.0 on the final AAC. `volumedetect` on every bed. Check the first seconds in 0.5 s windows: a "quiet intro" can be literal digital silence, and loudnorm can't lift silence.

**Captions**
- Every caption box inside the safe zone and not overlapping the phone screen, checked every 0.1 s from the page's own element geometry.
- Onset table: caption appear time vs word onset.
- No overlaps; minimum dwell respected.

**Content**
- Re-transcribe the final mix and confirm the first and last spoken words and the key claim are intact.
- Frame strips around every cut catch flashes of the wrong shot. Run a blank-frame check (flat luma means a missing screen).

**Determinism:** render the same spec twice and diff the frame hashes.

**Contact sheet for review:**

```bash
ffmpeg -i out.mp4 -vf "fps=2,scale=216:384,tile=8x4:padding=2" -frames:v 1 sheet_%02d.png
```

Agents review these sheets instead of "watching".

**Measurement hygiene:** when a metric surprises you, assume the measurement is broken first.
- `metadata=print` output includes header lines, so grep the exact key.
- 10-bit chains write 16-bit PNGs; pin `format=rgb24`.

---

## 19. Human review loop

**Local HTML board** (no hosting needed) per round. It shows:
- every variant's video
- the first-2.5 s filmstrip of each (to compare hooks)
- contact sheets
- the copy (headlines, descriptions, captions)
- the QA summary
- open decisions

**Keep rejected options on the board** with the reason, so agents don't re-propose them.

**Human sign-off points, and only these:**
1. script + claims
2. style frame (3 key frames)
3. music choice (2–3 options by ear)
4. final cut

**Variants must be genuinely different.** Compare 2.5 s opening filmstrips side by side. If two variants open on the same footage with only a different line, they are one ad to the viewer *and* to the ad algorithm.

**Feed every correction back into the system.** When you say "too zoomed", "captions too small" or "music too loud", the agent updates `brand.json`, engine defaults or this playbook, so the next video starts right. This is the single biggest efficiency lever.

**Post copy is a deliverable:**
- Line 1 (above the "…more" fold) is the hook or CTA.
- Then 2–3 body lines, an open question for comments, and 3–10 targeted hashtags.

---

## 20. YouTube upload, metadata and analytics loop

### 20.1 Upload via the Data API v3 (`videos.insert`, resumable)

- **snippet:** `title` (≤100 chars, validate it), `description`, `tags`, `categoryId`, `defaultLanguage`, `defaultAudioLanguage`.
- **status:**
  - `privacyStatus: "private"` + `publishAt` (ISO with timezone) → YouTube publishes on schedule while your machine sleeps.
  - `selfDeclaredMadeForKids: false`.
  - `containsSyntheticMedia: true` when you use AI voice or realistic AI visuals (an honest disclosure; officially no reach cost).
- OAuth desktop client, scopes `youtube.upload` + `youtube.readonly`. Store the token outside the repo with chmod 600.
- **Dry-run by default.** Print the target channel name before uploading, and write `uploaded.json` so re-runs skip finished videos.
- **Spacing:** space Shorts ≥ ~9–10 h apart (2 per day max). In our test, Shorts posted 2 h apart got starved.
- **Google Ads use:** ads can't use *private* videos. Upload ad videos as **unlisted** (or public).

### 20.2 Thumbnails (long-form)

- Render from the engine.
- One clear subject, ≤3 words, high contrast.
- Test it at 160 px wide.

### 20.3 Analytics loop (read, decide, act)

- Read YouTube Studio (API or browser automation) into a dated JSON snapshot per read:
  - views
  - stayed-to-watch % (viewed vs swiped away)
  - average view duration and % viewed
  - subs per 1K views
  - shares
  - traffic sources
  - search terms
- **Decision rules that worked:**
  - Under ~100 feed views = untested, not a verdict. Late pickups happen.
  - Read each Short at 24 h. If **stayed-to-watch < ~45%**, re-cut the first 2 seconds; don't change the topic.
  - **Kill at 48 h** if it has ≥200 feed views and stayed < 40%. Re-hook once, then drop it.
  - **Double down** at ≥10K views or ≥1 sub per 1K views: ship 2–3 follow-up angles within 72 h, plus a long-form deep dive.
  - Stayed ≥ ~53% → the feed keeps pushing it. ≤ ~32% → it died at the swipe.
- **Honest statistics:** with ~8 videos per arm, you can't detect the effect of voice, music, length or post time. Don't over-read small samples. Volume plus fast kills beats desk-picking winners.
- Shorts acquire viewers; long-form compounds them. Add long-form on proven topics once Shorts show traction.

---

## 21. Google App campaigns: learnings

### 21.1 The big one: bid on an in-app event, not installs

- Our first campaign bid on install volume. It bought almost entirely in-app display inventory with an 18–21% CTR: accidental taps.
  - **0 of the first 16 installs finished onboarding.**
- We switched the *same* campaign to optimise for an in-app activation event (`onboarding_completed`). Within ~3 days:
  - **cost per activated user dropped ~3.7×**
  - daily activations went from 0/12 to 28/48
- **Judge everything by activated users per rupee, never by CPI alone.** For your app, the activation event might be "finished first practice session" or "completed onboarding". Pick the first moment of real value.

### 21.2 Conversion setup chain

1. The app logs the event to Firebase / GA4 (verify it in DebugView with a real device).
2. Mark it as a **key event** in GA4.
3. Link GA4 ↔ Google Ads.
4. Import the event as a **primary** conversion.
5. Switch the campaign bidding to that conversion. No ad re-review is needed, but learning resets.
6. Bidding on an in-app action needs roughly **≥10 events per day** to learn. If volume is too thin, start on installs for a few days, then switch, or pick an earlier event.

### 21.3 Assets

- **Text:** up to 5 headlines (≤30 chars) and 5 descriptions (≤90 chars), each able to stand alone. Mix benefit, objection killer ("free to start", "no card needed") and social proof, all true.
- **Videos:** supply **all three orientations**: 9:16, 16:9 and 1:1. If one is missing, Google auto-generates poor versions. Up to 20 videos per ad group.
  - YouTube-hosted, unlisted or public; ≥10 s (we ran 15–30 s).
  - **16:9 must land hook + payoff + brand by 5.0 s.**
- **Images:** 1:1 (1200×1200), 1.91:1 (1200×628), 4:5 (1200×1500), ≤5 MB.
  - Images without overlaid text serve on more placements.
  - Writing "Install" on an image can get it rejected.
  - Make a no-logo twin of each image.
- **The Play Store listing is part of the creative.** Google builds ads from your *default* store listing, and the listing is where the install decision happens.
  - Match the screenshots and first line to the ads.
  - Audit the listing for stale claims or old branding before you spend.
  - Custom store listings only show on some placements.
- **Creative is the targeting:** the system finds audiences by reading your assets. Make assets genuinely different (different opening, footage and angle), not color or font swaps.

### 21.4 Budget and pacing

- Daily budget ≈ **≥50× target CPI** (install bidding) or **≥10× target CPA** (event bidding), or the campaign can't exit learning.
- **Don't edit for ~1 week, or until ~100 conversions.** Every significant change resets learning.
- Scale budget by at most +20–30% every ~3 days.
- You can't target by age in App campaigns. Language and geo are the real controls.
- **Kill/keep rule (adapt the numbers):** decide upfront. For example:
  - Kill an asset group if CPI is high for 3 days AND activation <15%.
  - Keep and scale if CPI is in target AND activation ≥25%.
  - Also track paid-cohort D1 retention (we aimed ≥25%).

### 21.5 Attribution

- Read the **Play Install Referrer** in the app and store it on the user in your backend. Google Ads installs carry `gclid` / `gad_campaignid`. Now you can join users to campaigns yourself.
- Keep paid search separate from organic in your channel reports. Treat "(not set)" as its own *unattributed* bucket; don't assume it's ads.
- Check that the SDK events actually fire in release builds. A build plugin once stripped an ads SDK's init and sent **zero** events. Verify with test events before spending.
- Daypart from data, not intuition: heavy usage hours aren't always good ad inventory hours.

### 21.6 Account and ops gotchas

- New ad accounts: the first card payments can fail and nothing serves at ₹0 balance. Fund early and confirm the account is "eligible".
- The Google Ads mobile app sometimes shows warnings about leftover drafts (for example "add keywords"). App campaigns have no keywords; ignore it.
- Google Ads API production access can require Cloud brand verification, so plan to launch by hand in the web UI at first.
- Ad clicks are only half the funnel. Make sure users who install but don't onboard get a nudge, and that an engaged new user doesn't hit a usage cap in their first hour.

---

## 22. Meta (Instagram/Facebook) ads: short notes

- **Advantage+ app campaigns:** one broad ad set; creative does the targeting. A good research setup is 3–6 genuinely distinct concepts × 2–3 hooks each.
- **Sizes:** 9:16 1080×1920 (Reels/Stories, safe zone top 14% / bottom 35% / sides 6%) and 4:5 1080×1350 (Feed). 15–30 s.
- **Copy:** 3–5 primary texts (~44 chars visible on Reels) and headlines ≤27 chars.
- **Policy (personal attributes):** never pair "you" with a condition or insecurity ("Is your English weak?", "Embarrassed when you speak?"). Ads get rejected for it. Also avoid guarantees, "unlimited" (unless literally true), competitor names, and age claims.
- **Creative metrics:**
  - Hook rate = 3-second plays ÷ impressions. Under 20–25% fix the hook; 25–35% solid; over 35% strong.
  - Compare hold rate ad vs ad.
  - Don't judge before ~2–3K impressions, or before spending 2× the target CPA.
  - **Strong hook + bad CPA** → the problem is after the hook (body, store page, onboarding).
  - **Weak hook + good CPA** → write new hooks on the same concept.
- Verify Meta SDK events in Events Manager → Test Events before spending.

---

## 23. Gotchas that cost us real iterations

1. **Clip shorter than its slot** (fps mismatch or span math): the editor freezes the last frame. Conform fps, assert frame counts, and run freezedetect.
2. **`afade st=` after `-ss` input seek is output-relative.** Absolute times gave a −91 dB silent music bed.
3. **`-t` after `-i` is an output limit** and caps a slow-motion stretch. Put `-t` before `-i` to limit input.
4. **Infinite generators** (`anullsrc`, `color=`) need explicit duration or `shortest=1`. One filled the disk.
5. **RGB/YUV format negotiation:** LUTs and blends in YUV give magenta. Force `format=gbrp`.
6. **Whisper:** leading-silence hallucination, the first word after a pause timed early, forced language dropping speech, loops on music, and dropped sentences unless `condition_on_previous_text=False`.
7. **TTS:** long inputs skip or loop, tiny inputs are unstable, digits are unreliable. Generate per sentence, best-of-N, CER-scored.
8. **Whole-file averages lie:** they hide a silent head and loud tails dominate them. Measure in windows.
9. **Relative paths under a different working directory** were silently skipped and the render shipped without music. Use absolute paths and measure the output.
10. **zsh variable modifiers:** `$VAR:l` is parsed as a modifier. Always use `${VAR}`.
11. **Re-measure levels after swapping any track.** Never carry gains from a previous mix.
12. **Judging on the source frame instead of the delivered crop.** Always measure and review at the final 9:16 crop.
13. **Optimising inside the wrong option** (the wrong song, footage or concept) before ranking options against each other.
14. **"Always do X" rules without an automated check decay.** Turn them into QA gates.
15. **Byte-identical intermediate ≠ step ran.** Verify claims against the actual final artifact.
16. **Config drift:** 24 vs 30 fps defaults in two files. Keep fps and resolution in one config.
17. **New headless Chromium clamps tall viewports.** Check that the bottom of the frame rendered.
18. **Data arriving mid-hook gets filmed** (loading spinners). Use a pre-roll before capture starts and warn when data arrives late.
19. **Templated sameness at volume** looks like AI spam to platforms. Vary structure, pacing and outros.
20. **Copyright is the risk that can end a channel or ad account.** No ripped footage, no commercial songs in exports, never crop watermarks, and keep a licence manifest.

---

## 24. Starter prompts for your agent

**Session start (paste once):**

> Read every file in video-playbook/ (start with README.md) and treat it as binding defaults. Work headless and silent. Measure everything; never estimate timings or levels. Before any build, confirm brand/brand.json exists and use only it for colors, fonts and motion. After each render, run qa/ and give me the QA.md summary, a contact sheet and the local board path. Whenever I correct something, update brand.json, engine defaults or video-playbook/ so it never recurs.

**Set up the brand system:**

> From the app's real design (screens in capture/stills/, the icon, the fonts used in the app), build brand/brand.json following playbook §4. Then render 3 style-frame options (9:16, 16:9, 1:1 each) with the phone, a caption and an end card, onto a local review board. Don't invent brand assets; use the real files.

**Research:**

> Using yt-dlp metadata only (playbook §5), find outlier Shorts and ads in [topic/category] from the last 90 days. Compute the outlier multiple vs channel median, apply the proof rule, label claims [M]/[D]/[J], and list gaps. Output research/<date>.md and a board.

**App capture:**

> Set up deterministic app capture per playbook §7.2: demo-mode status bar, Maestro flows for [flow names], event timestamps to meta.json, recordings conformed to 30 fps CFR. Use seeded demo accounts on staging only. Shoot 6 takes per flow and log pass/fail in takes.md.

**Make an ad:**

> Make an app ad from this brief: [hook, feature beats, CTA]. Follow the playbook: spec-as-code, events-driven planner, whole-phone framing, captions outside the phone, music aligned so a bar line hits the hero action, master at −14 LUFS / −1 dBTP, all three shapes (9:16, 16:9 with payoff by 5 s, 1:1). Offer 2–3 measured music options. Run full QA and put everything on a board with first-2.5 s filmstrips.

**VO:**

> Generate the VO for script.md per playbook §10–11: per-sentence TTS, best-of-6 by CER + pitch/rate cost, natural pauses, room tone, polish chain, words.json with silence-snapped and de-collided onsets. Report CER per line and flag anything over 0.08.

---

*Default to measuring, keep one source of truth, and turn every correction into a rule. That's what makes this fast and consistent.*
