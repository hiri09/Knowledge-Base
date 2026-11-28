# 2D motion graphics engine and footage

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

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
