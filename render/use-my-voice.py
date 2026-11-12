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

NOISE = "-34dB"   # anything quieter counts as a gap
GAP   = "0.42"    # a gap this long means "next line"

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

log = subprocess.run(
    ["ffmpeg", "-i", str(norm), "-af", f"silencedetect=noise={NOISE}:d={GAP}", "-f", "null", "-"],
    capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
ends   = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
total  = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                               "-of", "default=nw=1:nk=1", str(norm)],
                              capture_output=True, text=True).stdout)

# Speech runs between the silences.
cuts, pos = [], 0.0
if ends and (not starts or ends[0] < starts[0]):
    pos = ends[0]                      # leading silence before the first line
for i, st in enumerate(starts):
    if st <= pos:
        continue
    cuts.append((pos, st))
    pos = ends[i] if i < len(ends) else st
if pos < total - 0.15:
    cuts.append((pos, total))

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
