#!/usr/bin/env python3
"""Turn one continuous recording into per-scene narration, aligned by content.

Reads the take, denoises it, transcribes it with word-level timestamps, then
aligns the transcript against the script. Lines map to scenes by WHAT WAS SAID,
not by where the pauses fell — pause-guessing merges lines whenever someone
runs two sentences together, and every scene after that lands on the wrong shot.

  python3 use-my-voice.py 001-38-studios --script     # print what to read
  python3 use-my-voice.py 001-38-studios take1.wav    # clean, align, slice
"""
import difflib, json, re, subprocess, sys, pathlib

MODEL = "models/ggml-base.en.bin"
# Mic at low gain + room tone. highpass kills rumble, afftdn/anlmdn the hiss,
# speechnorm evens out an untrained read, light compression holds it together.
# arnndn is an RNN speech denoiser and is dramatically stronger than afftdn
# alone: on a low-gain mic it drops the room floor ~37dB (-54 -> -91) while
# leaving the voice intact. The rest is cleanup and levelling.
RNNN = "models/sh.rnnn"
CLEAN = ("highpass=f=90,"
         "arnndn=m={rnnn},"
         "afftdn=nf=-30:nt=w,"
         "anlmdn=s=0.0004,"
         "speechnorm=e=12.5:r=0.0001:l=1,"
         "acompressor=threshold=-20dB:ratio=3:attack=12:release=180")

root = pathlib.Path(__file__).parent
vid = sys.argv[1]
data = json.loads((root / "data" / f"{vid}.json").read_text())
scenes = data["scenes"]

if len(sys.argv) > 2 and sys.argv[2] == "--script":
    print(f"\nRead these {len(scenes)} lines.\n")
    for i, s in enumerate(scenes, 1):
        print(f"{i:2}. {s['vo']}")
    print("\nPauses no longer matter — alignment is by transcript.\n")
    raise SystemExit

NUM = {"zero":"0","one":"1","two":"2","three":"3","four":"4","five":"5","six":"6","seven":"7",
       "eight":"8","nine":"9","ten":"10","eleven":"11","twelve":"12","twenty":"20","thirty":"30",
       "fifty":"50","seventy":"70","hundred":"100","thousand":"1000","million":"million"}

def norm(t):
    t = t.lower().replace("$", " ")
    t = re.sub(r"[^a-z0-9\s]", " ", t)
    return [NUM.get(w, w) for w in t.split()]

take = pathlib.Path(sys.argv[2])
out = root / "public" / vid
out.mkdir(parents=True, exist_ok=True)
clean = out / "_clean.wav"
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(take),
                "-af", CLEAN.format(rnnn=str(root / RNNN)), "-ac", "1", "-ar", "16000", str(clean)], check=True)

subprocess.run(["whisper-cli", "-m", str(root / MODEL), "-f", str(clean),
                "-ml", "1", "--dtw", "base.en", "-oj", "-of", str(out / "_t"), "--no-prints"],
               check=True, capture_output=True)
toks = json.loads((out / "_t.json").read_text())["transcription"]

def ts(o):
    return o["offsets"]["from"] / 1000.0, o["offsets"]["to"] / 1000.0

words = []
for t in toks:
    w = norm(t["text"])
    if w:
        a, b = ts(t)
        words.append((w[0], a, b))

flat, owner = [], []
for i, sc in enumerate(scenes):
    for w in norm(sc["vo"]):
        flat.append(w); owner.append(i)

sm = difflib.SequenceMatcher(None, flat, [w for w, _, _ in words], autojunk=False)

# Collect every transcript index each line matched, then keep only that line's
# longest contiguous run. A single stray match — a filler word, a cough Whisper
# heard as "the" — would otherwise drag a line's start back across the whole take.
hits = {}
for a, b, n in sm.get_matching_blocks():
    for k in range(n):
        hits.setdefault(owner[a + k], []).append(b + k)

span = {}
for i, idxs in hits.items():
    idxs = sorted(set(idxs))
    best = run = [idxs[0]]
    for prev, cur in zip(idxs, idxs[1:]):
        run = run + [cur] if cur - prev <= 2 else [cur]
        if len(run) > len(best):
            best = run
    span[i] = (words[best[0]][1], words[best[-1]][2])

# Whisper back-fills a segment's first words across any silence preceding it,
# so a line after a long gap can appear to start seconds before it was spoken.
# The END of a line is reliable; the start is not. Rebuild an implausible start
# from the line's own word count — real speech runs ~0.33s/word.
PER_WORD, MAX_PER_WORD, MIN_PER_WORD = 0.33, 0.62, 0.22
for i, sc in enumerate(scenes):
    if i not in span:
        continue
    a, b = span[i]
    n = max(1, len(norm(sc["vo"])))
    if (b - a) / n > MAX_PER_WORD:
        a2 = max(0.0, b - n * PER_WORD)
        print(f"   line {i+1}: start {a:.2f} -> {a2:.2f} (was {(b-a)/n:.2f}s/word)")
        span[i] = (a2, b)
    elif (b - a) / n < MIN_PER_WORD:
        # The run matched only part of the line; the tail got cut. Give it back
        # whatever room exists before the next line actually starts.
        ceiling = span[i + 1][0] - 0.05 if i + 1 in span else b + n * PER_WORD
        b2 = min(a + n * PER_WORD, ceiling)
        if b2 > b:
            print(f"   line {i+1}: end {b:.2f} -> {b2:.2f} (was {(b-a)/n:.2f}s/word)")
            span[i] = (a, b2)

missing = [i for i in range(len(scenes)) if i not in span]
if missing:
    print(f"could not align lines: {[m + 1 for m in missing]}")
    print("re-read those lines, or check the transcript in", out / "_t.json")
    raise SystemExit(1)

total = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", str(clean)],
                             capture_output=True, text=True).stdout)

parts, durations = [], []
for i, sc in enumerate(scenes):
    a, b = span[i]
    nxt = span[i + 1][0] if i + 1 < len(scenes) else total
    b = min(b + 0.18, nxt - 0.02, total)          # let the word finish, never bleed into the next line
    a = max(0.0, a - 0.10)
    seg = out / f"{i}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(clean),
                    "-ss", f"{a:.3f}", "-to", f"{b:.3f}",
                    "-af", f"apad=pad_dur={sc.get('pause', 0.4)},loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ar", "48000", "-ac", "2", str(seg)], check=True)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", str(seg)],
                             capture_output=True, text=True).stdout)
    durations.append(round(d, 3)); parts.append(seg)
    print(f"{i+1:2}. {a:6.2f}-{b:6.2f} ({d:4.1f}s)  {sc['vo'][:52]}")

lst = out / "list.txt"
lst.write_text("\n".join(f"file '{p.name}'" for p in parts))
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                "-i", str(lst), "-c", "copy", str(out / "vo.wav")], check=True)
lst.unlink(); clean.unlink()
for p in parts: p.unlink()

(root / "data" / f"{vid}.audio.json").write_text(
    json.dumps({"track": f"{vid}/vo.wav", "durations": durations}, indent=2))
print(f"\naligned: {sum(durations):.1f}s across {len(durations)} scenes")
