# Grade, encode, platform specs, QA and review

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

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
