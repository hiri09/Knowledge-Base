# Voice

**Current: macOS `say` (Daniel, en_GB).** Himanshu's own voice and cloning are both
deferred — "skip my voice for now" (2026-11-13). The tooling for both is built and
working; switching is one command, not a rebuild.

The render takes an audio file and a word-timing JSON. Nothing downstream cares how the audio was produced, so swapping is a config change, not a rebuild.

## Options

| | AI (ElevenLabs etc.) | Himanshu's voice |
|---|---|---|
| Time per video | zero | ~20–30 min |
| Consistency | perfect | varies |
| Policy risk | higher — generic AI narration reads as low-effort | lowest — a real human POV is what survives the crackdown |
| Differentiation | none | strong |

Accent is not a concern for US/UK audiences. Pacing and clarity are.

## Rules either way

- **~145 wpm.** Faster reads as slop, slower loses the Short.
- **Pause after every money figure.** The number is the payoff; stepping on it wastes the hook.
- Energy in the first 3 seconds, not a slow build. There is no slow build in a 50-second video.
- Same voice across every piece. Switching mid-channel resets audience familiarity.

## Recording your own voice (works today, no service)

```sh
cd render
python3 use-my-voice.py <video-id> --script     # prints the lines to read
# record one take, pausing ~1s between lines (Voice Memos is fine)
python3 use-my-voice.py <video-id> take1.m4a    # auto-slices into scene clips
npm run render
```

Silence detection cuts the take into per-scene clips, loudness-normalises each to
-16 LUFS, and writes the same durations JSON the AI path produces. Nothing
downstream changes. No manual editing.

## Cloning his voice (needs a service)

| Option | Sample needed | Cost |
|---|---|---|
| ElevenLabs Instant Voice Clone | 1–2 min | **$6/mo Starter**, includes commercial licence, ~30 min audio/mo |
| ElevenLabs Professional | 30+ min, hours to train | $22/mo Creator |
| Qwen3-TTS | 3 sec | free, Apache 2.0, commercial-safe, 10 languages |
| XTTS-v2 | 6 sec | free, local, cross-language cloning |
| NeuTTS Air | short | free, fully on-device |

Record once, then every future video narrates in his voice with no recording time.
**This is the end state** — his voice, zero marginal effort per video.

## Interface

```
voice/<video-id>.mp3        the audio
voice/<video-id>.json       word timings, for caption sync
```

Decide after hearing both on the first real script.
