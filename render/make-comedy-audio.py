#!/usr/bin/env python3
"""Cartoon sound for the kids comedy Short.

Slapstick is sound. The same frames without a bonk and a sad slide read as a
character moving, not as a joke — so the cue sheet below mirrors the keyframe
table `T` in src/KidsComedy.tsx. Retime a gag there and retime it here.

ponytail: stdlib wave + math. Every effect is a swept sine, a decaying tone or
a noise burst; there is no sample library and nothing to license.
"""
import math
import os
import random
import struct
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
SR = 44100
FPS = 30
VID = "kids-002"
END = 540

n = int(END / FPS * SR) + SR
left = [0.0] * n
right = [0.0] * n
rnd = random.Random(11)


def place(frame, samples, pan=0.0, at_sample=None):
    start = at_sample if at_sample is not None else int(frame / FPS * SR)
    gl, gr = math.sqrt((1 - pan) / 2), math.sqrt((1 + pan) / 2)
    for i, s in enumerate(samples):
        j = start + i
        if 0 <= j < n:
            left[j] += s * gl
            right[j] += s * gr


def env(i, total, attack=0.004, tau=0.18):
    t = i / SR
    a = min(1.0, t / attack)
    return a * math.exp(-t / tau)


def tone(freq, dur, amp, tau=0.18, harm=0.3):
    return [(math.sin(2 * math.pi * freq * i / SR)
             + harm * math.sin(4 * math.pi * freq * i / SR)) * env(i, dur, tau=tau) * amp
            for i in range(int(dur * SR))]


def sweep(f0, f1, dur, amp, tau=0.3, wobble=0.0):
    out = []
    ph = 0.0
    N = int(dur * SR)
    for i in range(N):
        t = i / N
        f = f0 * (f1 / f0) ** t
        if wobble:
            f *= 1 + wobble * math.sin(2 * math.pi * 7 * i / SR)
        ph += 2 * math.pi * f / SR
        out.append(math.sin(ph) * env(i, dur, tau=tau) * amp)
    return out


def noise(dur, amp, tau=0.05, tilt=0.5):
    out, last = [], 0.0
    for i in range(int(dur * SR)):
        v = rnd.random() * 2 - 1
        last = last * tilt + v * (1 - tilt)   # cheap low-pass: thud, not hiss
        out.append(last * env(i, dur, attack=0.0008, tau=tau) * amp)
    return out


def thud(amp=0.5):
    return [a + b for a, b in zip(noise(0.18, amp, tau=0.045),
                                  tone(95, 0.18, amp * 0.8, tau=0.05))]


def hop(amp=0.3):
    return sweep(300, 760, 0.12, amp, tau=0.07)


def boing(amp=0.5):
    return sweep(180, 900, 0.3, amp, tau=0.16, wobble=0.22)


def bonk(amp=0.75):
    return [a + b for a, b in zip(tone(210, 0.3, amp, tau=0.085, harm=0.6),
                                  noise(0.08, amp * 0.5, tau=0.02, tilt=0.2))]


def rattle(f_from, f_to, amp=0.3):
    out = [0.0] * int((f_to - f_from) / FPS * SR + SR // 4)
    t = f_from
    while t < f_to:
        at = int((t - f_from) / FPS * SR)
        s = tone(430 * (0.9 + rnd.random() * 0.4), 0.07, amp * (0.5 + rnd.random() * 0.5), tau=0.025)
        for i, v in enumerate(s):
            if at + i < len(out):
                out[at + i] += v
        t += 1.4 + rnd.random() * 2.6
    return out


def arpeggio(freqs, step, dur, amp, pan=0.0, start=0):
    for k, f in enumerate(freqs):
        place(start + k * step, tone(f, dur, amp, tau=dur * 0.4, harm=0.45), pan)


def wobble_tone(f_from, f_to, amp=0.22):
    dur = (f_to - f_from) / FPS
    N = int(dur * SR)
    out, ph = [], 0.0
    for i in range(N):
        f = 300 * (1 + 0.35 * math.sin(2 * math.pi * 3.2 * i / SR))
        ph += 2 * math.pi * f / SR
        fade = min(1.0, i / (SR * 0.05)) * min(1.0, (N - i) / (SR * 0.15))
        out.append(math.sin(ph) * fade * amp)
    return out


# ---- cue sheet. Frames mirror T in src/KidsComedy.tsx ----------------------
place(0, hop(0.26), -0.2)
place(26, thud(0.32), -0.2)
place(34, sweep(220, 430, 0.22, 0.2, tau=0.14), -0.2)     # wind-up
place(56, hop(0.34), -0.2)
place(72, thud(0.62), -0.1)
place(72, rattle(72, 110, 0.3), 0.15)
arpeggio([392, 330, 262, 196], 6, 0.42, 0.26, -0.15, start=118)   # the sad slide
place(142, sweep(700, 300, 0.3, 0.3, tau=0.18), 0.45)     # yellow barges in
place(160, bonk(0.6), 0.1)
place(178, hop(0.34), 0.2)
place(178, rattle(182, 206, 0.3), 0.15)
arpeggio([523, 659, 784, 1047], 5, 0.5, 0.3, 0.3, start=206)      # yellow's fanfare
for k, f in enumerate([232, 243, 254]):
    place(f, hop(0.24), 0.3 + k * 0.1)
place(292, sweep(200, 520, 0.4, 0.26, tau=0.26), -0.2)    # the big wind-up
place(306, hop(0.4), -0.2)
place(322, thud(0.7), -0.1)
place(324, boing(0.55), 0.0)
place(346, bonk(0.85), -0.1)
place(346, wobble_tone(346, 378, 0.2), -0.1)
arpeggio([784, 988, 1319], 5, 0.55, 0.32, 0.0, start=380)         # it landed on six
place(392, tone(1047, 0.2, 0.3, tau=0.09), -0.1)
for k, f in enumerate([404, 413, 422, 431, 440]):
    place(f, hop(0.3), -0.1 - k * 0.04)
place(452, sweep(130, 90, 0.5, 0.3, tau=0.3), 0.0)        # the board creaks open
place(462, sweep(900, 110, 0.6, 0.4, tau=0.4), 0.0)       # the fall
place(480, thud(0.6), -0.2)
place(484, arpeggio([330, 262], 5, 0.4, 0.22, -0.2, start=484) or [], -0.2)
place(508, tone(520, 0.12, 0.22, tau=0.05), -0.05)
place(514, tone(520, 0.12, 0.2, tau=0.05), -0.05)
arpeggio([523, 784], 7, 0.7, 0.24, 0.0, start=520)

peak = max(1e-9, max(max(abs(v) for v in left), max(abs(v) for v in right)))
norm = min(1.0, 0.85 / peak)
os.makedirs(os.path.join(HERE, "public", VID), exist_ok=True)
with wave.open(os.path.join(HERE, "public", VID, "sfx.wav"), "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    buf = bytearray()
    for i in range(n):
        for v in (left[i] * norm, right[i] * norm):
            buf += struct.pack("<h", int(max(-1.0, min(1.0, math.tanh(v * 1.05))) * 32767))
    w.writeframes(bytes(buf))
print(f"-> public/{VID}/sfx.wav ({n / SR:.1f}s)")
