# Voice

**Undecided — pipeline is deliberately voice-agnostic.** Himanshu decides from samples.

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

## Interface

```
voice/<video-id>.mp3        the audio
voice/<video-id>.json       word timings, for caption sync
```

Decide after hearing both on the first real script.
