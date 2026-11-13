#!/usr/bin/env python3
"""Runnable check for critique.py. No framework — python3 test_critique.py.

Test clips are built with ffmpeg lavfi into a temp dir and thrown away, so
there are no fixtures to commit and nothing to keep in sync.
"""
import atexit
import pathlib
import subprocess
import tempfile

import critique

_DIR = tempfile.TemporaryDirectory()
atexit.register(_DIR.cleanup)
_D = pathlib.Path(_DIR.name)

S = "320x568"  # portrait, 1/3 scale — keeps the suite a few seconds


def _ff(name, *args):
    p = str(_D / name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", *args, "-c:v", "libx264",
                    "-pix_fmt", "yuv420p", p], check=True)
    return p


CLIP_AV = _ff("av.mp4", "-f", "lavfi", "-i", f"color=c=red:s={S}:d=2",
              "-f", "lavfi", "-i", "sine=f=440:d=2", "-shortest")
CLIP_SILENT = _ff("silent.mp4", "-f", "lavfi", "-i", f"color=c=red:s={S}:d=2")
CLIP_TWO_COLOUR = _ff("two.mp4",
                      "-f", "lavfi", "-i", f"color=c=red:s={S}:d=1",
                      "-f", "lavfi", "-i", f"color=c=blue:s={S}:d=1",
                      "-filter_complex", "[0][1]concat=n=2:v=1:a=0")
CLIP_STATIC = _ff("static.mp4", "-f", "lavfi", "-i", f"color=c=0x202020:s={S}:d=3")
CLIP_TESTSRC = _ff("testsrc.mp4", "-f", "lavfi", "-i", f"testsrc=s={S}:d=3")
CLIP_BLACK = _ff("black.mp4", "-f", "lavfi", "-i", f"color=c=black:s={S}:d=1")


# ---------------------------------------------------------------- task 1

def test_probe_reads_duration_and_audio():
    r = critique.probe(CLIP_AV)
    assert r["ran"] is True
    assert abs(r["duration"] - 2.0) < 0.15, r["duration"]
    assert r["has_audio"] is True


def test_probe_reports_missing_audio():
    assert critique.probe(CLIP_SILENT)["has_audio"] is False


def test_probe_on_missing_file_does_not_raise():
    assert critique.probe("/nonexistent.mp4")["ran"] is False


def test_cuts_finds_the_join_in_a_two_colour_clip():
    r = critique.cuts(CLIP_TWO_COLOUR)
    assert r["ran"] is True
    assert len(r["times"]) == 1, r["times"]
    assert abs(r["times"][0] - 1.0) < 0.2, r["times"]


def test_freezes_finds_a_static_clip():
    r = critique.freezes(CLIP_STATIC)
    assert r["ran"] is True
    assert len(r["spans"]) == 1, r["spans"]
    assert r["spans"][0][1] - r["spans"][0][0] > 1.5, r["spans"]


def test_freezes_finds_nothing_in_moving_footage_but_still_ran():
    # The dangerous case: an empty result must be distinguishable from a
    # probe that never ran, or a broken parser scores as a perfect video.
    r = critique.freezes(CLIP_TESTSRC)
    assert r["ran"] is True
    assert r["spans"] == []


def test_luma_reports_zero_spread_for_a_flat_frame():
    # Pure black measures YAVG=16 in limited-range yuv420p, so average
    # luminance cannot detect it. Spread can: a flat frame has none.
    s = critique.luma(CLIP_BLACK)["samples"]
    assert s, "no samples"
    assert s[0][2] - s[0][1] == 0


def test_luma_reports_wide_spread_for_a_structured_frame():
    s = critique.luma(CLIP_TESTSRC)["samples"]
    assert s[0][2] - s[0][1] > 10


def test_luma_on_missing_file_reports_it_did_not_run():
    assert critique.luma("/nonexistent.mp4")["ran"] is False


# ---------------------------------------------------------------- runner

def main():
    tests = [(n, f) for n, f in sorted(globals().items())
             if n.startswith("test_") and callable(f)]
    failed = 0
    for name, fn in tests:
        try:
            fn()
        except Exception as e:
            failed += 1
            print(f"FAIL {name}: {type(e).__name__}: {e}")
    print(f"{len(tests) - failed}/{len(tests)} passed")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
