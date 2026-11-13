#!/usr/bin/env python3
"""Generate narration, align it to the word, and cut the picture to it.

The old version padded every scene with a fixed `pause` and let the picture sit
there until the padding ran out. Measured on 001 that was 20-40% dead air per
shot, and because pacing could only be bought with more padding, every fix for
"too fast" made the sync worse. Pacing and sync were the same knob.

Here a scene's length is DERIVED: it ends a short `tail` after its own last
spoken word. Dead air is structurally impossible. Breathing comes from
deliberate silent beats, which are shots with their own duration and their own
picture, not from padding spoken ones.

Every scene also reports `keyAt` — the moment its key word is spoken — so the
renderer can land a number, a highlight or a cut ON the word instead of at the
shot boundary.

    python3 build-audio.py <id>

`say` is driven with embedded speech commands from the direction sheet:
    [[pbas N]] pitch · [[rate N]] pace · [[slnc N]] silence · [[volm N]] level
"""
import array
import json
import math
import pathlib
import re
import subprocess
import sys

VOICE = "Daniel"        # en_GB, the most neutral of the built-ins
RATE = 170              # ~145 wpm target per pipeline/voice.md
PITCH = 42              # Daniel's natural base; the Director moves around this
CLIP_TARGET_DB = -16.0  # the loudest moment of every line sits here
DEFAULT_TAIL = 0.35     # hold after the last word, unless the scene says otherwise
LEAD_IN = 0.25          # a track that begins on sample zero has no breath
MODEL = "models/ggml-base.en.bin"

root = pathlib.Path(__file__).parent
vid = sys.argv[1] if len(sys.argv) > 1 else "002-the-pitcher"
data = json.loads((root / "data" / f"{vid}.json").read_text())
out = root / "public" / vid
out.mkdir(parents=True, exist_ok=True)


def run(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, **kw)


def direct(sc):
    """Performance direction -> embedded speech commands."""
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


def words_of(wav):
    """[(word, start, end)] for one clip, via whisper DTW alignment."""
    mono = wav.with_suffix(".16k.wav")
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
         "-ac", "1", "-ar", "16000", str(mono)])
    stem = wav.with_suffix("")
    run(["whisper-cli", "-m", str(root / MODEL), "-f", str(mono), "-ml", "1",
         "--dtw", "base.en", "-oj", "-of", str(stem), "--no-prints"])
    toks = json.loads(stem.with_suffix(".json").read_text())["transcription"]
    mono.unlink()
    stem.with_suffix(".json").unlink()
    got = []
    for t in toks:
        w = re.sub(r"[^a-z0-9]", "", t["text"].lower())
        if w:
            got.append((w, t["offsets"]["from"] / 1000.0, t["offsets"]["to"] / 1000.0))
    return got


def key_time(words, sc):
    """When the scene's key word is spoken. None if it was never found.

    Spoken numbers come back from whisper as digits — "seventy five million"
    transcribes as ["75", "million"] — so a scene carrying a figure falls back
    to that figure's digits. Deterministic, and no number-word table to keep.
    """
    cands = []
    if sc.get("key"):
        cands.append(re.sub(r"[^a-z0-9]", "", sc["key"].lower().split()[0]))
    if sc.get("value"):
        d = re.sub(r"[^0-9]", "", sc["value"])
        if d:
            cands.append(d)
    if not cands or not words:
        return None
    for want in cands:
        for w, a, _ in words:
            if w == want:
                return round(a, 3)
        # tokens can be subwords with -ml 1; join a few and try again
        for i in range(len(words)):
            joined = ""
            for j in range(i, min(i + 4, len(words))):
                joined += words[j][0]
                if joined == want:
                    return round(words[i][1], 3)

    # Whisper mishears too — "June" came back as "Jul" on one line. Fall back
    # to where the word sits in the written line, scaled across the read. Less
    # exact than alignment, far better than giving up and keying to frame zero.
    if sc.get("key") and sc.get("vo"):
        toks = re.findall(r"[A-Za-z0-9']+", sc["vo"])
        want = sc["key"].split()[0].lower()
        idx = next((i for i, t in enumerate(toks) if t.lower().startswith(want[:3])), None)
        if idx is not None and len(toks) > 1:
            a, b = words[0][1], words[-1][2]
            return round(a + (b - a) * (idx / len(toks)), 3)
    return None


def peak_db(f, sr=16000, win=0.2):
    """Loudest short-window RMS, dBFS. Overlapping, so a sharp onset is not
    measured quietly just because it straddles a window boundary."""
    raw = run(["ffmpeg", "-v", "error", "-i", str(f), "-ac", "1",
               "-ar", str(sr), "-f", "s16le", "-"]).stdout
    a = array.array("h")
    a.frombytes(raw[:len(raw) // 2 * 2])
    n, best = int(sr * win), None
    for i in range(0, max(1, len(a) - n), max(1, n // 4)):
        w = a[i:i + n]
        if not w:
            continue
        r = math.sqrt(sum(x * x for x in w) / len(w))
        if r > 0:
            best = max(best or -999, 20 * math.log10(r / 32768))
    return best


def dur(f):
    return float(run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                      "-of", "default=nw=1:nk=1", str(f)], text=True).stdout.strip())


parts, durations, keys, transcripts = [], [], [], []

for i, sc in enumerate(data["scenes"]):
    wav = out / f"{i}.wav"

    if not sc.get("vo"):
        # A silent beat is a shot, not a gap. It carries its own picture.
        run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi",
             "-i", "anullsrc=r=48000:cl=stereo", "-t", str(sc.get("sec", 1.0)), str(wav)])
        durations.append(round(sc.get("sec", 1.0), 3))
        keys.append(None)
        transcripts.append([])
        parts.append(wav)
        continue

    raw = out / f"{i}raw.wav"
    aiff = out / f"{i}.aiff"
    run(["say", "-v", VOICE, "-r", str(RATE), "-o", str(aiff), direct(sc)])
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(aiff),
         "-ar", "48000", "-ac", "2", str(raw)])
    aiff.unlink()

    ws = words_of(raw)
    tail = sc.get("tail", DEFAULT_TAIL)
    # THE line of this file: the shot ends a tail after the last word, not
    # after a padding value somebody guessed.
    end = (ws[-1][2] if ws else dur(raw)) + tail
    run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw),
         "-af", f"apad=whole_dur={end:.3f}", "-t", f"{end:.3f}",
         "-ar", "48000", "-ac", "2", str(wav)])
    raw.unlink()

    # Level-match every line before assembly, on its loudest window. `say`
    # renders each clip independently, so a short fast line lands several dB
    # hotter than a slow one, and the hot line's artefacts are heard as noise.
    lvl = peak_db(wav)
    if lvl is not None and abs(CLIP_TARGET_DB - lvl) > 0.3:
        fixed = out / f"{i}L.wav"
        run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(wav),
             "-af", f"volume={CLIP_TARGET_DB - lvl:.2f}dB",
             "-ar", "48000", "-ac", "2", str(fixed)])
        wav.unlink()
        fixed.rename(wav)

    durations.append(round(dur(wav), 3))
    keys.append(key_time(ws, sc))
    transcripts.append([[w, round(a, 3), round(b, 3)] for w, a, b in ws])
    parts.append(wav)

# A lead-in, so neither voice nor picture starts on sample zero.
lead = out / "lead.wav"
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "lavfi",
     "-i", "anullsrc=r=48000:cl=stereo", "-t", str(LEAD_IN), str(lead)])
parts.insert(0, lead)
durations[0] = round(durations[0] + LEAD_IN, 3)
if keys[0] is not None:
    keys[0] = round(keys[0] + LEAD_IN, 3)
transcripts[0] = [[w, round(a + LEAD_IN, 3), round(b + LEAD_IN, 3)]
                  for w, a, b in transcripts[0]]

concat = out / "list.txt"
concat.write_text("\n".join(f"file '{p.name}'" for p in parts))
raw = out / "raw.wav"
run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
     "-i", str(concat), "-ar", "48000", "-ac", "2", str(raw)])

# Measure, then apply ONE fixed gain. Not loudnorm's own pass: even with
# linear=true it silently falls back to "Normalization Type: Dynamic", and with
# no history at the start of a track it over-gains the opening by several dB.
probe = subprocess.run(["ffmpeg", "-i", str(raw), "-af",
                        "loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json",
                        "-f", "null", "-"], capture_output=True, text=True).stderr
m = json.loads(probe[probe.rindex("{"):probe.rindex("}") + 1])
gain = -16.0 - float(m["input_i"])
run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af",
     f"volume={gain:.2f}dB,alimiter=limit=0.84:level=disabled",
     "-ar", "48000", "-ac", "2", str(out / "vo.wav")])
raw.unlink()
concat.unlink()
for p in parts:
    p.unlink()

(root / "data" / f"{vid}.audio.json").write_text(json.dumps({
    "track": f"{vid}/vo.wav",
    "durations": durations,
    "keyAt": keys,
    "words": transcripts,
}, indent=2))

print(f"master: {float(m['input_i']):.1f} LUFS -> -16.0 ({gain:+.2f}dB, fixed)")
print(f"voice: {sum(durations):.1f}s across {len(durations)} scenes")
spoken = sum(1 for s in data["scenes"] if s.get("vo"))
print(f"keyed: {sum(1 for k in keys if k is not None)}/{spoken} lines landed their key word")
for i, sc in enumerate(data["scenes"]):
    if sc.get("key") and keys[i] is None:
        print(f"  MISS scene {i}: key {sc['key']!r} not found in the read")
