#!/usr/bin/env python3
"""Sound for the kids dice race, synthesised from the baked contact events.

The bake records every collision above a velocity threshold with its frame,
impact strength and lane. Each one becomes a wooden tock, pitched by lane and
panned to that lane's side of the frame, so the audio is locked to the picture
by construction rather than by an editor lining things up by ear.

ponytail: stdlib wave + math, no audio library. A bounce is a decaying sine
with a noise transient; that is the whole synth.
"""
import json
import math
import os
import random
import struct
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
VID = sys.argv[1] if len(sys.argv) > 1 else "kids-001"

ev = json.load(open(os.path.join(HERE, "data", f"{VID}.events.json")))
baked = json.load(open(os.path.join(HERE, "data", f"{VID}.frames.json")))
fps, total_frames = ev["fps"], baked["frames"]
n = int(total_frames / fps * SR) + SR // 2

left = [0.0] * n
right = [0.0] * n

LANE_PAN = [-0.55, 0.0, 0.55]       # matches the on-screen lane order
LANE_PITCH = [1.0, 1.16, 1.34]      # low-to-high left-to-right, so the ear can
                                    # follow a lane without looking at it
rnd = random.Random(7)


def place(at, samples, pan):
    gl, gr = math.sqrt((1 - pan) / 2), math.sqrt((1 + pan) / 2)
    for i, s in enumerate(samples):
        j = at + i
        if 0 <= j < n:
            left[j] += s * gl
            right[j] += s * gr


def tock(strength, pitch):
    """A short wooden knock: noise transient into a fast-decaying sine pair."""
    f0 = 400.0 * pitch
    dur = 0.085
    amp = 0.26 * (0.35 + 0.65 * strength)
    out = []
    for i in range(int(dur * SR)):
        t = i / SR
        env = math.exp(-t / 0.028)
        body = math.sin(2 * math.pi * f0 * t) * 0.8 + math.sin(2 * math.pi * f0 * 2.01 * t) * 0.2
        click = (rnd.random() * 2 - 1) * math.exp(-t / 0.0018) * 0.5
        out.append((body * env + click) * amp)
    return out


def bell(freq, dur, amp):
    out = []
    for i in range(int(dur * SR)):
        t = i / SR
        env = math.exp(-t / (dur * 0.35)) * min(1.0, t / 0.005)
        v = (math.sin(2 * math.pi * freq * t)
             + 0.35 * math.sin(2 * math.pi * freq * 2 * t)
             + 0.12 * math.sin(2 * math.pi * freq * 3.01 * t))
        out.append(v * env * amp)
    return out


for frame, strength, lane in ev["events"]:
    place(int(frame / fps * SR), tock(strength, LANE_PITCH[lane]), LANE_PAN[lane])

# win sting on the frame the race is decided, panned to the winning lane
win_at = int(baked["decidedAt"] / fps * SR)
for k, f in enumerate([523.25, 659.25, 783.99, 1046.50]):
    place(win_at + int(k * 0.11 * SR), bell(f, 0.9, 0.30), LANE_PAN[baked["winner"]] * 0.6)

# soft-knee limiter. Hundreds of overlapping tocks clip hard without one, and a
# clipped knock reads as a broken speaker, not as a loud one.
peak = max(1e-9, max(max(abs(v) for v in left), max(abs(v) for v in right)))
norm = min(1.0, 0.82 / peak)
with wave.open(os.path.join(HERE, "public", VID, "sfx.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    frames = bytearray()
    for i in range(n):
        for v in (left[i] * norm, right[i] * norm):
            v = math.tanh(v * 1.1)
            frames += struct.pack("<h", int(max(-1.0, min(1.0, v)) * 32767))
    w.writeframes(bytes(frames))

print(f"{len(ev['events'])} bounces -> public/{VID}/sfx.wav ({n / SR:.1f}s)")
