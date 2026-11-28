# Voice-over, word timing, captions, music, SFX, mix

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

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
