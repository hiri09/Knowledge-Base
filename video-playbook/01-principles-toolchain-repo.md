# Principles, toolchain and repo layout

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

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
