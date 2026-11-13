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
import array
import json, math, subprocess, sys, pathlib

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

def rms_db(f, sr=16000, win=0.2):
    """Loudest short-window RMS of a clip, in dBFS. None if silent.

    Deliberately the loudest window, not the clip mean. A short punchy line
    matches on mean level while its peaks stay several dB hot — measured on
    this narration, line 0 peaked 3.8dB above every other line and still
    passed a mean-RMS match. Perceived punch lives in the peaks.
    """
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1",
                          "-ar", str(sr), "-f", "s16le", "-"], capture_output=True).stdout
    a = array.array("h"); a.frombytes(out[:len(out) // 2 * 2])
    # Overlapping windows: a sharp onset that straddles two aligned windows
    # measures several dB quieter than it sounds, and the clip then gets
    # matched to the wrong level.
    n, best = int(sr * win), None
    for i in range(0, max(1, len(a) - n), max(1, n // 4)):
        w = a[i:i + n]
        if not w:
            continue
        r = math.sqrt(sum(x * x for x in w) / len(w))
        if r > 0:
            best = max(best or -999, 20 * math.log10(r / 32768))
    return best


CLIP_TARGET_DB = -16.0   # the loudest moment of every line sits here


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
    # Level-match every line BEFORE assembly. `say` renders each clip
    # independently, so a line at rate 180 comes out several dB hotter than one
    # at 140 — and the hot line's synthesis artefacts are what get heard as
    # background noise. One global normalise afterwards cannot fix a mix that
    # was already uneven going in.
    lvl = rms_db(wav)
    if lvl is not None and abs(CLIP_TARGET_DB - lvl) > 0.3:
        fixed = out / f"{i}L.wav"
        subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
                        "-af", f"volume={CLIP_TARGET_DB - lvl:.2f}dB",
                        "-ar", "48000", "-ac", "2", str(fixed)], check=True)
        wav.unlink(); fixed.rename(wav)

    d = dur(wav)
    durations.append(round(d, 3))
    parts.append(wav)

# Normalise to -16 LUFS, in TWO passes.
#
# Single-pass loudnorm is adaptive: it has no history at the start of a track,
# so it over-gains the opening and then settles. Measured on this narration the
# first 0.2s came out at -14.5 dB against a body of -18 to -20 — the opening
# was pumped ~5dB hot, which lifts the synthesiser's own artefacts and is heard
# as "background noise at the start". Two-pass measures first and then applies
# a fixed, linear gain, so the opening is mastered like everything else.
TARGET = "I=-16:TP=-1.5:LRA=11"
LEAD_IN = 0.25   # a track that begins on sample zero has no breath before it

# A quiet lead-in so neither the voice nor the picture starts on frame zero.
lead = out / "lead.wav"
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi",
                "-i", "anullsrc=r=48000:cl=stereo", "-t", str(LEAD_IN), str(lead)], check=True)
parts.insert(0, lead)
durations[0] = round(durations[0] + LEAD_IN, 3)   # the lead belongs to shot 0

concat = out / "list.txt"
concat.write_text("\n".join(f"file '{p.name}'" for p in parts))
raw = out / "raw.wav"
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                "-i", str(concat), "-ar", "48000", "-ac", "2", str(raw)], check=True)

# Measure, then apply ONE fixed gain. Not loudnorm's own normalisation pass:
# even with linear=true it silently falls back to "Normalization Type: Dynamic"
# and then pumps, and with no history at the start of a track it over-gains the
# opening by several dB. That lifts the synthesiser's artefacts and is heard as
# background noise on the first line. Every clip is already peak-matched going
# in, so all the master needs is a constant offset and a safety limiter.
probe = subprocess.run(["ffmpeg", "-i", str(raw), "-af",
                        f"loudnorm={TARGET}:print_format=json", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
m = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
gain = -16.0 - float(m["input_i"])
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af",
                f"volume={gain:.2f}dB,alimiter=limit=0.84:level=disabled",
                "-ar", "48000", "-ac", "2", str(out / "vo.wav")], check=True)
print(f"master: {float(m['input_i']):.1f} LUFS -> -16.0 ({gain:+.2f}dB, fixed)")
raw.unlink()
concat.unlink()
for p in parts: p.unlink()

(root / "data" / f"{vid}.audio.json").write_text(
    json.dumps({"track": f"{vid}/vo.wav", "durations": durations}, indent=2))
print(f"voice: {sum(durations):.1f}s across {len(durations)} scenes -> public/{vid}/vo.wav")
