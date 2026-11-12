#!/usr/bin/env python3
"""Generate narration per scene, measure it, write durations back.

ponytail: macOS `say` is the zero-cost AI voice. Swap VOICE_CMD for an
ElevenLabs call when a key exists — nothing downstream changes, because
the render only consumes the wav + the durations JSON.
"""
import json, subprocess, sys, pathlib

VOICE = "Daniel"   # en_GB, the most neutral of the built-ins
RATE = 170         # ~145 wpm target per pipeline/voice.md
PAD = 0.45         # breath after each line; also the pause after money figures

root = pathlib.Path(__file__).parent
vid = sys.argv[1] if len(sys.argv) > 1 else "001-38-studios"
data = json.loads((root / "data" / f"{vid}.json").read_text())
out = root / "public" / vid
out.mkdir(parents=True, exist_ok=True)

def dur(f):
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", str(f)],
        capture_output=True, text=True).stdout.strip())

parts, durations = [], []
for i, sc in enumerate(data["scenes"]):
    aiff, wav = out / f"{i}.aiff", out / f"{i}.wav"
    subprocess.run(["say", "-v", VOICE, "-r", str(RATE), "-o", str(aiff), sc["vo"]], check=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(aiff),
                    "-af", f"apad=pad_dur={PAD}", "-ar", "48000", "-ac", "2", str(wav)], check=True)
    aiff.unlink()
    d = dur(wav)
    durations.append(round(d, 3))
    parts.append(wav)

concat = out / "list.txt"
concat.write_text("\n".join(f"file '{p.name}'" for p in parts))
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                "-i", str(concat), "-c", "copy", str(out / "vo.wav")], check=True)
concat.unlink()
for p in parts: p.unlink()

(root / "data" / f"{vid}.audio.json").write_text(
    json.dumps({"track": f"{vid}/vo.wav", "durations": durations}, indent=2))
print(f"voice: {sum(durations):.1f}s across {len(durations)} scenes -> public/{vid}/vo.wav")
