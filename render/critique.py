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
