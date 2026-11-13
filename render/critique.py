#!/usr/bin/env python3
"""Measure a rendered Short against the editorial gates.

Reads out/<id>-final.mp4 plus the render's own data JSON, writes
out/<id>.metrics.json, and exits non-zero when a gate fails.

    python3 critique.py <id> [--json]

exit 0  every gate passed
exit 1  one or more gates failed
exit 2  the render is invalid — missing, empty, or silent

Design note: every probe reports `ran`. A probe that could not run returns
None for the metrics it feeds, and None fails its gate as "not measured".
An empty result and a broken parser must never look alike — that is how the
old flat-black rule passed QC while the screen was black.

ponytail: ffmpeg filters do all the measuring. No numpy, no OpenCV.
"""
import json
import re
import subprocess

# ---------------------------------------------------------------- probes


def _run(args):
    """Run a command, never raise. Returns (rc, stdout, stderr)."""
    try:
        p = subprocess.run(args, capture_output=True, text=True, timeout=300)
        return p.returncode, p.stdout, p.stderr
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return 1, "", ""


def _ran(rc, err):
    """Did ffmpeg actually process frames?

    Filter-name matching is not enough: freezedetect only names itself in the
    log when it *finds* a freeze, so a clean video would look like a broken
    probe. The progress line proves frames went through either way.
    """
    return rc == 0 and bool(re.search(r"frame=\s*\d+", err))


def probe(path):
    """{ran, duration, has_audio, width, height} via ffprobe."""
    rc, out, _ = _run(["ffprobe", "-v", "error", "-show_format",
                       "-show_streams", "-of", "json", path])
    blank = {"ran": False, "duration": 0.0, "has_audio": False,
             "width": 0, "height": 0}
    if rc != 0 or not out:
        return blank
    try:
        d = json.loads(out)
    except json.JSONDecodeError:
        return blank
    streams = d.get("streams", [])
    video = next((s for s in streams if s.get("codec_type") == "video"), {})
    return {
        "ran": True,
        "duration": float(d.get("format", {}).get("duration", 0.0)),
        "has_audio": any(s.get("codec_type") == "audio" for s in streams),
        "width": int(video.get("width", 0)),
        "height": int(video.get("height", 0)),
    }


def cuts(path, threshold=0.3):
    """{ran, times} — timestamps where the picture changes wholesale."""
    rc, _, err = _run(["ffmpeg", "-i", path, "-vf",
                       f"select='gt(scene,{threshold})',showinfo",
                       "-f", "null", "-"])
    ran = _ran(rc, err)
    times = [float(t) for t in re.findall(r"pts_time:([\d.]+)", err)] if ran else []
    return {"ran": ran, "times": times}


def freezes(path, noise=0.003, dur=1.0):
    """{ran, spans} — stretches where nothing moved."""
    rc, _, err = _run(["ffmpeg", "-i", path, "-vf",
                       f"freezedetect=n={noise}:d={dur}", "-f", "null", "-"])
    ran = _ran(rc, err)
    spans = []
    if ran:
        starts = [float(t) for t in re.findall(r"freeze_start: ([\d.]+)", err)]
        ends = [float(t) for t in re.findall(r"freeze_end: ([\d.]+)", err)]
        end_of_clip = probe(path)["duration"]
        for i, s in enumerate(starts):
            spans.append((s, ends[i] if i < len(ends) else end_of_clip))
    return {"ran": ran, "spans": spans}


# ----------------------------------------------------------------- gates
# Values from pipeline/editorial-loop.md. The Senior Editor cannot waive
# these; only Himanshu can.
GATES = {
    "hold": {"HOOK": 1.2, "EXPLAIN": 2.5, "REVEAL": 4.0, "CLOSE": 4.0, None: 4.0},
    "freeze_max": 1.0,        # seconds a shot may sit motionless
    "luma_spread_min": 10.0,  # YHIGH-YLOW: a visible ground, not flat dark
    "ground_coverage_min": 0.5,
    "template_max": 2,        # times one scene template may appear
    "bg_max": 3,
    "overlap_max": 0.5,       # on-screen text vs the spoken line
    "novel_shots_min": 2,
    "pause_stdev_min": 0.25,
    "wps_spread_min": 0.15,
    "money_pause_min": 0.5,
}


def _strip(s):
    """Drop the *accent* markup the renderer reads, keeping the words."""
    return (s or "").replace("*", "").strip()


# On-screen copy, per scene type. Mirrors what Short.tsx actually draws.
_SCREEN = {
    "hook": lambda s: s.get("text", ""),
    "line": lambda s: s.get("text", ""),
    "number": lambda s: f"{s.get('value', '')} {s.get('label', '')}",
    "grid": lambda s: f"{s.get('label', '')} {s.get('sub', '')}",
    "timeline": lambda s: s.get("caption", ""),
    "compare": lambda s: f"{s.get('aLabel', '')} {s.get('bLabel', '')}",
}

MIN_NUMBER_SEC = 2.0  # mirrors src/theme.ts
MIN_SEC = 0.9         # mirrors secondsFor() in src/Short.tsx


def shots(data, audio):
    """{ran, shots, drift} — what was meant to be on screen, and when.

    Durations come from the narration, exactly as Short.tsx does it: `sec` in
    the data file is only a floor. Picture and voice cannot drift because the
    picture is cut to the voice.
    """
    scenes = data.get("scenes", [])
    durations = (audio or {}).get("durations", [])
    drift = []
    if len(durations) != len(scenes):
        drift.append(f"scene count {len(scenes)} != narration count {len(durations)}")

    out = []
    t = 0.0
    for i, s in enumerate(scenes):
        kind = s.get("type")
        if kind not in _SCREEN:
            drift.append(f"scene {i}: unknown type {kind!r}")
        floor = MIN_NUMBER_SEC if kind == "number" else MIN_SEC
        spoken = durations[i] if i < len(durations) else None
        hold = max(floor, spoken if spoken is not None else s.get("sec", floor))
        screen = _strip(_SCREEN.get(kind, lambda _s: "")(s))
        out.append({
            "i": i,
            "type": kind,
            "beat": s.get("beat"),
            "bg": s.get("bg"),
            "anim": s.get("anim"),
            "pos": s.get("pos"),
            "start": round(t, 3),
            "end": round(t + hold, 3),
            "hold": hold,
            "vo": s.get("vo", ""),
            "screen_text": screen,
            "ground": s.get("media"),
            "source": s.get("source"),
        })
        t += hold + s.get("pause", 0.0)

    return {"ran": bool(scenes), "shots": out, "drift": drift}


def _tokens(s):
    return set(re.findall(r"[a-z0-9$]+", _strip(s).lower()))


def information_gain(shot_list):
    """How much of the screen is just a caption of the narration.

    overlap = share of on-screen words the voice also says. 1.0 means the
    viewer is reading along; there is nothing to look at. Numerals against
    spelled-out numbers deliberately do not match — a screen showing "$75M"
    while the voice says "seventy five million" is giving the eye its own job.
    """
    per = []
    for s in shot_list:
        screen, vo = _tokens(s.get("screen_text")), _tokens(s.get("vo"))
        overlap = (len(screen & vo) / len(screen)) if screen and vo else None
        per.append({"i": s["i"], "overlap": overlap})
    scored = [p["overlap"] for p in per if p["overlap"] is not None]
    return {
        "per_shot": per,
        "worst": max(scored) if scored else None,
        "novel_shots": sum(1 for o in scored if o < GATES["overlap_max"]),
    }


def visual_metrics(shot_list, freeze, lum):
    """Per-shot motion and ground, plus whole-video repetition tallies.

    An unmeasured value is None, never 0 — evaluate() fails None as
    "not measured" so a broken probe can never score as a clean video.
    """
    per = []
    for s in shot_list:
        start, end = s["start"], s["end"]
        if freeze.get("ran"):
            frozen = sum(max(0.0, min(end, b) - max(start, a))
                         for a, b in freeze.get("spans", []))
        else:
            frozen = None
        if lum.get("ran"):
            window = [x for x in lum.get("samples", []) if start <= x[0] < end]
            spread = (sum(x[2] - x[1] for x in window) / len(window)) if window else None
        else:
            spread = None
        per.append({**s, "frozen_for": frozen, "luma_spread": spread})

    runtime = max((s["end"] for s in shot_list), default=0.0)
    grounded = sum(s["end"] - s["start"] for s in shot_list if s.get("ground"))

    repeats = []
    for dim in ("bg", "anim", "type"):
        for a, b in zip(shot_list, shot_list[1:]):
            if a.get(dim) is not None and a.get(dim) == b.get(dim):
                repeats.append({"dim": dim, "i": b["i"], "value": b[dim]})

    def tally(dim):
        counts = {}
        for s in shot_list:
            v = s.get(dim)
            if v is not None:
                counts[v] = counts.get(v, 0) + 1
        return counts

    return {
        "shots": per,
        "ground_coverage": (grounded / runtime) if runtime else 0.0,
        "template_counts": tally("type"),
        "bg_counts": tally("bg"),
        "consecutive_repeats": repeats,
    }


def luma(path, fps=2):
    """{ran, samples} of (t, ylow, yhigh, yavg).

    Spread (yhigh - ylow) is what detects a frame with no visible ground.
    Average luminance cannot: pure black reads as 16 in limited-range
    yuv420p, comfortably above any sane floor.
    """
    rc, out, err = _run(["ffmpeg", "-i", path, "-vf",
                         f"fps={fps},signalstats,metadata=print:file=-",
                         "-f", "null", "-"])
    ran = _ran(rc, err)
    samples = []
    if ran:
        cur = {}
        # metadata=print:file=- lands on stderr in current ffmpeg builds and on
        # stdout in older ones. Read both rather than betting on either.
        for line in (out + "\n" + err).splitlines():
            if line.startswith("frame:"):
                if cur.get("t") is not None and "YLOW" in cur:
                    samples.append((cur["t"], cur["YLOW"], cur["YHIGH"], cur["YAVG"]))
                m = re.search(r"pts_time:([\d.]+)", line)
                cur = {"t": float(m.group(1)) if m else None}
            else:
                m = re.match(r"lavfi\.signalstats\.(Y\w+)=([\d.]+)", line.strip())
                if m:
                    cur[m.group(1)] = float(m.group(2))
        if cur.get("t") is not None and "YLOW" in cur:
            samples.append((cur["t"], cur["YLOW"], cur["YHIGH"], cur["YAVG"]))
    return {"ran": ran, "samples": samples}
