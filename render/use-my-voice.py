#!/usr/bin/env python3
"""Turn one continuous recording into per-scene narration.

You read the whole script in a single take, pausing ~1s between lines.
ffmpeg's silencedetect finds those gaps and cuts the take into scene clips,
so nothing has to be edited by hand.

  python3 use-my-voice.py 001-38-studios --script      # print what to read
  python3 use-my-voice.py 001-38-studios take1.m4a     # slice the take

Output is identical to build-audio.py, so the render does not change.
"""
import json, re, subprocess, sys, pathlib

# Threshold is derived from the take itself. A fixed value fails on quiet
# recordings: a mic at low gain puts speech below -34dB and every line reads
# as silence. Peak minus 27dB tracks the recording instead of assuming it.
HEADROOM = 27.0
GAP = "0.42"

root = pathlib.Path(__file__).parent
vid  = sys.argv[1]
data = json.loads((root / "data" / f"{vid}.json").read_text())
scenes = data["scenes"]

if len(sys.argv) > 2 and sys.argv[2] == "--script":
    print(f"\nRead these {len(scenes)} lines. Pause ~1 second between each.\n")
    for i, s in enumerate(scenes, 1):
        print(f"{i:2}. {s['vo']}")
    print("\nRecord with Voice Memos, or:")
    print("  ffmpeg -f avfoundation -i ':0' -ac 1 -ar 48000 take1.wav   (ctrl-C to stop)\n")
    raise SystemExit

take = pathlib.Path(sys.argv[2])
out  = root / "public" / vid
out.mkdir(parents=True, exist_ok=True)
norm = out / "_take.wav"
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(take),
                "-ac", "1", "-ar", "48000", str(norm)], check=True)

vol = subprocess.run(["ffmpeg", "-i", str(norm), "-af", "volumedetect", "-f", "null", "-"],
                     capture_output=True, text=True).stderr
peak = float(re.search(r"max_volume: (-?[\d.]+) dB", vol).group(1))
noise = f"{peak - HEADROOM:.1f}dB"
print(f"take peak {peak:.1f}dB -> silence threshold {noise}")

log = subprocess.run(
    ["ffmpeg", "-i", str(norm), "-af", f"silencedetect=noise={noise}:d={GAP}", "-f", "null", "-"],
    capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
ends   = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
total  = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                               "-of", "default=nw=1:nk=1", str(norm)],
                              capture_output=True, text=True).stdout)

# Speech is the complement of the detected silences. Building it this way
# handles a take that starts or ends in silence, which the previous
# walk-the-starts approach got wrong.
MIN_SEG = 0.35   # shorter than this is a cough, a click, or a breath

sil = []
for a, b in zip(starts, ends + ([total] if len(ends) < len(starts) else [])):
    sil.append((a, b))
sil.sort()

cuts, pos = [], 0.0
for a, b in sil:
    if a > pos:
        cuts.append((pos, a))
    pos = max(pos, b)
if pos < total:
    cuts.append((pos, total))

dropped = [c for c in cuts if c[1] - c[0] < MIN_SEG]
cuts = [c for c in cuts if c[1] - c[0] >= MIN_SEG]
if dropped:
    print(f"dropped {len(dropped)} blips under {MIN_SEG}s")

# People make a noise before they start reading — a chair, a breath, "okay".
# A lead-in is separated from the real run by an abnormally long gap, so trim
# extras from the ends by gap size rather than guessing.
while len(cuts) > len(scenes) and len(cuts) > 2:
    gaps = [cuts[i + 1][0] - cuts[i][1] for i in range(len(cuts) - 1)]
    med = sorted(gaps)[len(gaps) // 2]
    if gaps[0] > med * 2 and gaps[0] >= gaps[-1]:
        print(f"dropped lead-in at {cuts[0][0]:.2f}s ({gaps[0]:.1f}s gap before the run)")
        cuts.pop(0)
    elif gaps[-1] > med * 2:
        print(f"dropped trailing blip at {cuts[-1][0]:.2f}s")
        cuts.pop()
    else:
        break

if len(cuts) != len(scenes):
    print(f"Found {len(cuts)} spoken segments but the script has {len(scenes)} lines.")
    print("Re-record leaving a clear ~1s gap between lines, or adjust NOISE/GAP at the top.")
    for i, (a, b) in enumerate(cuts, 1):
        print(f"  {i:2}. {a:6.2f} -> {b:6.2f}  ({b-a:.2f}s)")
    raise SystemExit(1)

parts, durations = [], []
for i, ((a, b), sc) in enumerate(zip(cuts, scenes)):
    seg = out / f"{i}.wav"
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(norm),
                    "-ss", f"{max(0, a - 0.08):.3f}", "-to", f"{min(total, b + 0.06):.3f}",
                    "-af", f"apad=pad_dur={sc.get('pause', 0.45)},loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ar", "48000", "-ac", "2", str(seg)], check=True)
    d = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                              "-of", "default=nw=1:nk=1", str(seg)],
                             capture_output=True, text=True).stdout)
    durations.append(round(d, 3)); parts.append(seg)

lst = out / "list.txt"
lst.write_text("\n".join(f"file '{p.name}'" for p in parts))
subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0",
                "-i", str(lst), "-c", "copy", str(out / "vo.wav")], check=True)
lst.unlink(); norm.unlink()
for p in parts: p.unlink()

(root / "data" / f"{vid}.audio.json").write_text(
    json.dumps({"track": f"{vid}/vo.wav", "durations": durations}, indent=2))
print(f"your voice: {sum(durations):.1f}s across {len(durations)} scenes")
print("now run:  npm run render")
