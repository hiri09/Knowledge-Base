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
import statistics
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
        beat = s.get("beat")
        if beat is not None and beat not in GATES["hold"]:
            # Unflagged, a typo'd beat quietly takes the most permissive hold
            # limit — a gate passing because nobody checked the input.
            drift.append(f"scene {i}: unknown beat {beat!r}")
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
        # No pause added: build-audio.py already padded each clip with it.
        t += hold

    return {"ran": bool(scenes), "shots": out, "drift": drift}


def cut_drift(shot_list, cut_result):
    """Did the picture actually change as often as the data file intended?

    The JSON is authoritative for intent, the detector for what rendered.
    Transitions that fade rather than cut are legitimately missed, so this
    only speaks up when the gap is wide enough to mean something is wrong.
    """
    if not cut_result.get("ran"):
        return []
    intended, detected = max(0, len(shot_list) - 1), len(cut_result.get("times", []))
    if detected < intended / 2:
        return [f"{detected} visible cuts for {len(shot_list)} shots — "
                f"transitions are not registering as picture changes"]
    return []


MONEY = re.compile(r"\$[\d.,]+\s?[MBK]?", re.I)


def audio_metrics(shot_list, data):
    """Pause and pace. Uniformity is the machine tell, so spread is the metric.

    A constant gap after every sentence and one speaking rate throughout are
    what "it sounds AI" actually means — not the timbre.
    """
    scenes = data.get("scenes", [])
    pauses = [s.get("pause", 0.0) for s in scenes]
    wps = [(len(s["vo"].split()) / s["hold"]) if s.get("vo") and s.get("hold") else None
           for s in shot_list]
    live = [w for w in wps if w]
    spread = ((max(live) - min(live)) / (sum(live) / len(live))) if live else None

    money = []
    for s in shot_list:
        if MONEY.search(s.get("screen_text", "") or "") or MONEY.search(s.get("vo", "") or ""):
            i = s["i"]
            money.append({"i": i, "pause": pauses[i] if i < len(pauses) else 0.0})

    return {
        "pauses": pauses,
        "pause_stdev": statistics.pstdev(pauses) if len(pauses) > 1 else None,
        "wps": wps,
        "wps_spread": spread,
        "money_pauses": money,
    }


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

    # Visual identity, not raw scene type: a line over the statehouse and a
    # line over an empty office are different screens. Counting the template
    # alone would fail every video with more shots than templates.
    for s in per:
        s["look"] = f"{s.get('type')}:{s.get('ground') or s.get('bg')}"
    looks = {s["i"]: s["look"] for s in per}

    repeats = []
    for dim in ("bg", "anim", "look"):
        seq = [(s["i"], looks[s["i"]] if dim == "look" else s.get(dim)) for s in shot_list]
        for (_, a), (i, b) in zip(seq, seq[1:]):
            if a is not None and a == b:
                repeats.append({"dim": dim, "i": i, "value": b})

    def tally(get):
        counts = {}
        for s in shot_list:
            v = get(s)
            if v is not None:
                counts[v] = counts.get(v, 0) + 1
        return counts

    return {
        "shots": per,
        "ground_coverage": (grounded / runtime) if runtime else 0.0,
        "template_counts": tally(lambda s: looks.get(s["i"])),
        "bg_counts": tally(lambda s: s.get("bg")),
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


# ------------------------------------------------------------ evaluation

def _fail(gate, got, limit, shot=None, reason=None):
    return {"gate": gate, "shot": shot, "got": got, "limit": limit,
            "reason": reason or f"{got} vs limit {limit}"}


def evaluate(metrics):
    """Hard gates only. Taste is the Senior Editor's job, not this function's.

    None means the probe did not run, and that fails. Absence of evidence is
    never evidence of absence here.
    """
    out = []
    for s in metrics["shots"]:
        i = s["i"]
        limit = GATES["hold"].get(s.get("beat"), GATES["hold"][None])
        if s["hold"] > limit:
            out.append(_fail("hold", round(s["hold"], 2), limit, i))
        for key, gate, worse in (
            ("frozen_for", "freeze", lambda v, L: v >= L),
            ("luma_spread", "luma_spread", lambda v, L: v < L),
        ):
            limit = GATES["freeze_max"] if gate == "freeze" else GATES["luma_spread_min"]
            v = s.get(key)
            if v is None:
                out.append(_fail(gate, None, limit, i, "not measured"))
            elif worse(v, limit):
                out.append(_fail(gate, round(v, 2), limit, i))

    if metrics["ground_coverage"] < GATES["ground_coverage_min"]:
        out.append(_fail("ground_coverage", round(metrics["ground_coverage"], 2),
                         GATES["ground_coverage_min"]))

    for kind, n in metrics.get("template_counts", {}).items():
        if n > GATES["template_max"]:
            out.append(_fail("repetition", f"{kind} x{n}", GATES["template_max"]))
    for bg, n in metrics.get("bg_counts", {}).items():
        if n > GATES["bg_max"]:
            out.append(_fail("repetition", f"bg {bg} x{n}", GATES["bg_max"]))
    for r in metrics.get("consecutive_repeats", []):
        out.append(_fail("repetition", f"{r['dim']} {r['value']} twice in a row",
                         "never", r["i"]))

    info = metrics.get("info", {})
    for p in info.get("per_shot", []):
        if p["overlap"] is not None and p["overlap"] > GATES["overlap_max"]:
            out.append(_fail("information_gain", round(p["overlap"], 2),
                             GATES["overlap_max"], p["i"]))
    if info.get("novel_shots", 0) < GATES["novel_shots_min"]:
        out.append(_fail("information_gain", info.get("novel_shots", 0),
                         GATES["novel_shots_min"], None, "too few shots add anything"))

    audio = metrics.get("audio", {})
    for key, gate in (("pause_stdev", "pause_stdev"), ("wps_spread", "wps_spread")):
        v, limit = audio.get(key), GATES[f"{key}_min"]
        if v is None:
            out.append(_fail(gate, None, limit, None, "not measured"))
        elif v < limit:
            out.append(_fail(gate, round(v, 3), limit))
    for m in audio.get("money_pauses", []):
        if m["pause"] < GATES["money_pause_min"]:
            out.append(_fail("money_pause", m["pause"], GATES["money_pause_min"], m["i"]))

    for d in metrics.get("drift", []):
        out.append(_fail("drift", d, "none", None, d))
    return out


def report(metrics, failures):
    """The per-shot table the Senior Editor reads. Numbers, not adjectives."""
    by_shot = {}
    for f in failures:
        by_shot.setdefault(f["shot"], []).append(f)

    lines = [f"{metrics['id']}  —  {metrics['duration']:.1f}s, {len(metrics['shots'])} shots",
             ""]
    for s in metrics["shots"]:
        bad = by_shot.get(s["i"], [])
        head = f"SHOT {s['i']}  {(s.get('beat') or '?'):<7} {s.get('type', ''):<9}"
        lines.append(f"{head} {'REJECT' if bad else 'ok'}")
        if bad:
            for f in bad:
                lines.append(f"    {f['gate']:<17} {str(f['got']):<10} limit {f['limit']}")
    video = by_shot.get(None, [])
    if video:
        lines += ["", "WHOLE VIDEO"]
        for f in video:
            lines.append(f"    {f['gate']:<17} {str(f['got']):<10} limit {f['limit']}")
    lines += ["", f"{'FAIL — ' + str(len(failures)) + ' gate failures' if failures else 'PASS — all gates clear'}"]
    return "\n".join(lines)


# ------------------------------------------------------------------ main

def measure(root, vid):
    """Everything, merged. Returns (metrics, exit_code_if_invalid)."""
    import pathlib
    root = pathlib.Path(root)
    mp4 = root / "out" / f"{vid}-final.mp4"
    info = probe(str(mp4))
    if not info["ran"] or info["duration"] <= 0 or not info["has_audio"]:
        return None, 2
    data = json.loads((root / "data" / f"{vid}.json").read_text())
    audio_path = root / "data" / f"{vid}.audio.json"
    audio = json.loads(audio_path.read_text()) if audio_path.exists() else {}

    st = shots(data, audio)
    vm = visual_metrics(st["shots"], freezes(str(mp4)), luma(str(mp4)))
    metrics = {"id": vid, "duration": info["duration"], **vm,
               "info": information_gain(st["shots"]),
               "audio": audio_metrics(st["shots"], data),
               "drift": st["drift"] + cut_drift(st["shots"], cuts(str(mp4)))}
    return metrics, 0


def main(argv):
    import argparse
    import pathlib
    ap = argparse.ArgumentParser()
    ap.add_argument("id")
    ap.add_argument("--json", action="store_true")
    ap.add_argument("--root", default=str(pathlib.Path(__file__).parent))
    a = ap.parse_args(argv)

    metrics, bad = measure(a.root, a.id)
    if bad:
        print(f"{a.id}: no usable render — missing, empty, or silent. score 0")
        return 2

    failures = evaluate(metrics)
    (pathlib.Path(a.root) / "out" / f"{a.id}.metrics.json").write_text(
        json.dumps({"metrics": metrics, "failures": failures}, indent=2))
    print(json.dumps(failures, indent=2) if a.json else report(metrics, failures))
    return 1 if failures else 0


if __name__ == "__main__":
    import sys
    raise SystemExit(main(sys.argv[1:]))
