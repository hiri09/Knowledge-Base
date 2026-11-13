#!/usr/bin/env python3
"""Score the Short: a music bed, sound design, and the final mix.

    python3 build-score.py <id>

Reads the shot timings that build-audio.py already derived, so impacts land on
cuts and swells land on reveals without anybody typing a timestamp.

Everything is synthesised with ffmpeg oscillators and noise. That is a
deliberate choice, not a limitation: the channel is already carrying Content ID
exposure on the game footage, and a library music bed would add a second,
separate claim surface on every upload. A synthesised bed is owned outright.

ponytail: lavfi sources and filters. No samples, no library, no licence.
"""
import json
import pathlib
import re
import subprocess
import sys

root = pathlib.Path(__file__).parent
vid = sys.argv[1] if len(sys.argv) > 1 else "002-the-pitcher"
data = json.loads((root / "data" / f"{vid}.json").read_text())
audio = json.loads((root / "data" / f"{vid}.audio.json").read_text())
out = root / "public" / vid

D = audio["durations"]
TOTAL = round(sum(D) + 0.4, 2)

# where every shot begins, and which ones are the payoffs
starts, t = [], 0.0
for d in D:
    starts.append(round(t, 3))
    t += d
beats = [s.get("beat") for s in data["scenes"]]
reveals = [starts[i] for i, b in enumerate(beats) if b == "REVEAL"]
closes = [starts[i] for i, b in enumerate(beats) if b == "CLOSE"]


def run(args):
    return subprocess.run(args, check=True, capture_output=True)


def ff(filtergraph, dest, inputs=(), label=None):
    """A named output pad in -filter_complex has to be -map'd explicitly."""
    if label is None:
        label = re.search(r"\[(\w+)\]\s*$", filtergraph).group(1)
    args = ["ffmpeg", "-loglevel", "error", "-y"]
    for i in inputs:
        args += ["-i", str(i)]
    args += ["-filter_complex", filtergraph, "-map", f"[{label}]",
             "-ar", "48000", "-ac", "2", str(dest)]
    run(args)


# ---------------------------------------------------------------- the bed
# A drone on A, its fifth and octave, plus pink air. Detuned by a fraction of
# a hertz so the two low voices beat slowly against each other instead of
# sitting dead still — a perfectly in-tune synth drone is the thing that
# sounds synthetic.
bed = out / "_bed.wav"
ff(
    f"sine=f=55:d={TOTAL}[a];"
    f"sine=f=55.3:d={TOTAL}[b];"
    f"sine=f=82.5:d={TOTAL}[c];"
    f"sine=f=110:d={TOTAL}[d];"
    f"anoisesrc=c=pink:d={TOTAL}:a=0.9[n];"
    "[a][b]amix=inputs=2,volume=0.5[low];"
    "[c]volume=0.22[fifth];"
    "[d]volume=0.1[oct];"
    "[n]highpass=f=220,lowpass=f=1100,volume=0.1,"
    "tremolo=f=0.13:d=0.5[air];"
    "[low][fifth][oct][air]amix=inputs=4:normalize=0,"
    "lowpass=f=420,volume=0.5,"
    # slow swell across the whole piece so it is never static
    f"afade=t=in:st=0:d=2.5,afade=t=out:st={TOTAL - 2.6:.2f}:d=2.4[bedout]",
    bed,
)

# ------------------------------------------------------------ sound design
# One impact, one swell, made once and then placed.
imp = out / "_imp.wav"
ff(
    "sine=f=74:d=0.5[s];"
    "anoisesrc=c=brown:d=0.5:a=0.8[n];"
    "[s]volume=0.9[s2];"
    "[n]lowpass=f=240,volume=0.5[n2];"
    "[s2][n2]amix=inputs=2:normalize=0,"
    "afade=t=out:st=0.03:d=0.45,volume=0.8[impout]",
    imp,
)

swell = out / "_swell.wav"
ff(
    "anoisesrc=c=pink:d=1.4:a=0.9[n];"
    "[n]highpass=f=300,lowpass=f=5200,"
    "afade=t=in:st=0:d=1.15,afade=t=out:st=1.15:d=0.25,"
    "volume=0.3[swout]",
    swell,
)

# Impacts on the harder cuts only. One on every shot would be a metronome,
# which is the same uniformity problem the picture had.
hits = [starts[i] for i, s in enumerate(data["scenes"])
        if s.get("trans") in ("punchIn", "flash") or beats[i] in ("REVEAL", "HOOK")]
hits = sorted(set(round(h, 3) for h in hits))
# swells arrive just BEFORE a reveal, so they lead into it
leads = sorted({round(max(0.0, r - 1.25), 3) for r in reveals + closes[-1:]})

layers = [f"[0:a]apad=whole_dur={TOTAL}[bed]"]
inputs = [bed]
idx = 1
mixes = ["[bed]"]
for h in hits:
    inputs.append(imp)
    layers.append(f"[{idx}:a]adelay={int(h * 1000)}|{int(h * 1000)},apad=whole_dur={TOTAL}[h{idx}]")
    mixes.append(f"[h{idx}]")
    idx += 1
for l in leads:
    inputs.append(swell)
    layers.append(f"[{idx}:a]adelay={int(l * 1000)}|{int(l * 1000)},apad=whole_dur={TOTAL}[s{idx}]")
    mixes.append(f"[s{idx}]")
    idx += 1

score = out / "_score.wav"
ff(";".join(layers) + ";" + "".join(mixes) + f"amix=inputs={len(mixes)}:normalize=0[scoreout]",
   score, inputs)

# ----------------------------------------------------------------- the mix
# The score ducks under the narration rather than sitting at a fixed level, so
# it can be present between lines and gone underneath them. Without this a bed
# quiet enough to never mask the voice is too quiet to be heard at all.
mix = out / "mix.wav"
ff(
    "[0:a]volume=1.0[vo];"
    "[1:a]volume=0.5[sc];"
    "[sc][vo]sidechaincompress=threshold=0.03:ratio=9:attack=12:release=420[ducked];"
    "[vo][ducked]amix=inputs=2:normalize=0,"
    "alimiter=limit=0.89:level=disabled[mixout]",
    mix, [out / "vo.wav", score],
)

for f in (bed, imp, swell, score):
    f.unlink()

audio["track"] = f"{vid}/mix.wav"
(root / "data" / f"{vid}.audio.json").write_text(json.dumps(audio, indent=2))
print(f"score: {len(hits)} impacts, {len(leads)} swells, bed {TOTAL:.1f}s -> {mix.name}")
