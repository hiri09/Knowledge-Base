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


# ---------------------------------------------------------------- task 2

def test_shots_uses_audio_durations_not_sec():
    data = {"scenes": [{"type": "line", "text": "a", "sec": 3, "vo": "a", "pause": 0.5}]}
    assert critique.shots(data, {"durations": [4.4]})["shots"][0]["hold"] == 4.4


def test_shots_applies_the_number_floor():
    # mirrors MIN_NUMBER_SEC in src/theme.ts — a money figure is never flashed
    data = {"scenes": [{"type": "number", "value": "$75M", "label": "x",
                        "sec": 3, "vo": "x", "pause": 0}]}
    assert critique.shots(data, {"durations": [1.0]})["shots"][0]["hold"] == 2.0


def test_start_times_accumulate_holds_and_pauses():
    data = {"scenes": [
        {"type": "line", "text": "a", "vo": "a", "pause": 0.5, "sec": 1},
        {"type": "line", "text": "b", "vo": "b", "pause": 0.0, "sec": 1},
    ]}
    s = critique.shots(data, {"durations": [2.0, 3.0]})["shots"]
    assert s[0]["start"] == 0.0
    assert s[1]["start"] == 2.5
    assert s[1]["end"] == 5.5


def test_scene_count_mismatch_is_drift_not_a_crash():
    data = {"scenes": [{"type": "line", "text": "a", "vo": "a", "sec": 1, "pause": 0}]}
    r = critique.shots(data, {"durations": [1.0, 2.0]})
    assert r["shots"]
    assert any("count" in d for d in r["drift"]), r["drift"]


def test_screen_text_strips_accent_markers():
    data = {"scenes": [{"type": "line", "text": "In 2010, *Rhode Island* guaranteed a loan.",
                        "vo": "x", "sec": 1, "pause": 0}]}
    assert "*" not in critique.shots(data, {"durations": [1.0]})["shots"][0]["screen_text"]


def test_screen_text_is_read_per_scene_type():
    data = {"scenes": [
        {"type": "number", "value": "$75M", "label": "Guaranteed by the state",
         "vo": "x", "sec": 1, "pause": 0},
        {"type": "timeline", "caption": "90 DAYS", "marks": [], "head": 1,
         "vo": "x", "sec": 1, "pause": 0},
        {"type": "grid", "label": "COPIES SOLD", "sub": "Amalur, 2012",
         "total": 1, "filled": 1, "mode": "fill", "vo": "x", "sec": 1, "pause": 0},
    ]}
    s = critique.shots(data, {"durations": [1.0, 1.0, 1.0]})["shots"]
    assert "$75M" in s[0]["screen_text"] and "Guaranteed" in s[0]["screen_text"]
    assert s[1]["screen_text"] == "90 DAYS"
    assert "COPIES SOLD" in s[2]["screen_text"]


def test_an_unknown_scene_type_is_drift_not_an_exception():
    data = {"scenes": [{"type": "hologram", "vo": "x", "sec": 1, "pause": 0}]}
    r = critique.shots(data, {"durations": [1.0]})
    assert r["shots"][0]["screen_text"] == ""
    assert any("hologram" in d for d in r["drift"])


def test_ground_comes_from_the_media_slug():
    data = {"scenes": [{"type": "line", "text": "a", "vo": "a", "sec": 1,
                        "pause": 0, "media": "capitol"}]}
    assert critique.shots(data, {"durations": [1.0]})["shots"][0]["ground"] == "capitol"


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
