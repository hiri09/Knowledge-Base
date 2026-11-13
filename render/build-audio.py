#!/usr/bin/env python3
"""Generate narration per scene, measure it, write durations back.

`say` is not flat — it was being driven flat. It accepts embedded speech
commands that give real prosody for free:

    [[pbas N]]  pitch base. Measured: 30 -> 80Hz, 65 -> 235Hz on Daniel
    [[rate N]]  words per minute, per line
    [[slnc N]]  silence, in milliseconds
    [[volm N]]  volume, 0.0-1.0

So a scene carries a `perform` block from the Director's direction sheet and
this turns it into those commands. No API, no key, no model download.

ponytail: the platform already does this. Reach for a neural voice only when
the timbre itself is the complaint, not the delivery.
"""
import json, subprocess, sys, pathlib

VOICE = "Daniel"   # en_GB, the most neutral of the built-ins
RATE = 170         # ~145 wpm target per pipeline/voice.md
PAD = 0.45         # fallback only; scenes carry their own "pause"
PITCH = 42         # Daniel's natural base; the Director moves around this


def direct(sc):
    """Turn a scene's performance direction into embedded speech commands.

    `perform` is a dict from the direction sheet, e.g.
        {"pitch": -8, "rate": 155, "lead": 250}
    pitch is relative so a line reads as "lower than usual", not as a number
    nobody can picture.
    """
    pf = sc.get("perform") or {}
    pre = ""
    if pf.get("lead"):
        pre += f"[[slnc {int(pf['lead'])}]] "
    pre += f"[[pbas {max(10, min(90, PITCH + pf.get('pitch', 0)))}]] "
    if pf.get("rate"):
        pre += f"[[rate {int(pf['rate'])}]] "
    if pf.get("volm") is not None:
        pre += f"[[volm {pf['volm']}]] "
    return pre + sc["vo"]

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
    if not sc.get("vo"):
        # A silent beat. Picture without narration is how a cut lands on its
        # own — otherwise every shot is exactly as long as its sentence, and
        # a 1-second hook is impossible without two-word sentences.
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi",
                        "-i", f"anullsrc=r=48000:cl=stereo", "-t", str(sc.get("sec", 1.0)),
                        str(wav)], check=True)
    else:
        subprocess.run(["say", "-v", VOICE, "-r", str(RATE), "-o", str(aiff), direct(sc)], check=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(aiff),
                        "-af", f"apad=pad_dur={sc.get('pause', PAD)}", "-ar", "48000", "-ac", "2", str(wav)], check=True)
        aiff.unlink()
    d = dur(wav)
    durations.append(round(d, 3))
    parts.append(wav)

# Normalise to -16 LUFS. Raw `say` output sits around -23 dB mean, which is
# well below what every other video in a Shorts feed is mastered to, so it
# reads as "no sound" next to them even when it is technically audible.
NORM = "loudnorm=I=-16:TP=-1.5:LRA=11"

concat = out / "list.txt"
concat.write_text("\n".join(f"file '{p.name}'" for p in parts))
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                "-i", str(concat), "-af", NORM, "-ar", "48000", "-ac", "2",
                str(out / "vo.wav")], check=True)
concat.unlink()
for p in parts: p.unlink()

(root / "data" / f"{vid}.audio.json").write_text(
    json.dumps({"track": f"{vid}/vo.wav", "durations": durations}, indent=2))
print(f"voice: {sum(durations):.1f}s across {len(durations)} scenes -> public/{vid}/vo.wav")
