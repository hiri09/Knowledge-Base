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


def test_pauses_are_not_added_twice():
    # build-audio.py appends each scene's pause to its own clip with
    # apad=pad_dur, so durations[i] already contains it. Adding it again
    # pushes every later shot past the end of the video.
    data = {"scenes": [
        {"type": "line", "text": "a", "vo": "a", "pause": 0.5, "sec": 1},
        {"type": "line", "text": "b", "vo": "b", "pause": 0.0, "sec": 1},
    ]}
    s = critique.shots(data, {"durations": [2.0, 3.0]})["shots"]
    assert s[0]["start"] == 0.0
    assert s[1]["start"] == 2.0
    assert s[1]["end"] == 5.0


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


# ---------------------------------------------------------------- task 3

NO_FREEZE = {"ran": True, "spans": []}
NO_LUMA = {"ran": True, "samples": []}


def test_hold_gate_per_beat_class():
    assert critique.GATES["hold"]["HOOK"] == 1.2
    assert critique.GATES["hold"]["EXPLAIN"] == 2.5
    assert critique.GATES["hold"]["REVEAL"] == 4.0


def test_frozen_shot_is_attributed_to_the_right_shot():
    sh = [{"i": 0, "start": 0.0, "end": 2.0}, {"i": 1, "start": 2.0, "end": 6.0}]
    m = critique.visual_metrics(sh, {"ran": True, "spans": [(2.4, 5.8)]}, NO_LUMA)
    assert m["shots"][0]["frozen_for"] == 0
    assert m["shots"][1]["frozen_for"] > 3.0


def test_luma_spread_is_windowed_to_the_shot():
    sh = [{"i": 0, "start": 0.0, "end": 1.0}, {"i": 1, "start": 1.0, "end": 2.0}]
    lm = {"ran": True, "samples": [(0.0, 22, 25, 29), (0.5, 22, 25, 29),
                                   (1.0, 19, 72, 40), (1.5, 19, 70, 40)]}
    m = critique.visual_metrics(sh, NO_FREEZE, lm)
    assert m["shots"][0]["luma_spread"] == 3      # the frames he circled
    assert m["shots"][1]["luma_spread"] > 50      # the statehouse photo


def test_ground_coverage_is_runtime_weighted_not_shot_counted():
    sh = [{"i": 0, "start": 0, "end": 10, "ground": "capitol"},
          {"i": 1, "start": 10, "end": 12, "ground": None},
          {"i": 2, "start": 12, "end": 14, "ground": None}]
    assert critique.visual_metrics(sh, NO_FREEZE, NO_LUMA)["ground_coverage"] > 0.5


def test_consecutive_background_repeat_is_flagged():
    sh = [{"i": 0, "bg": "glow", "start": 0, "end": 1},
          {"i": 1, "bg": "glow", "start": 1, "end": 2}]
    m = critique.visual_metrics(sh, NO_FREEZE, NO_LUMA)
    assert any(r["dim"] == "bg" for r in m["consecutive_repeats"])


def test_consecutive_entrance_animation_is_flagged():
    sh = [{"i": 0, "anim": "rise", "start": 0, "end": 1},
          {"i": 1, "anim": "rise", "start": 1, "end": 2}]
    m = critique.visual_metrics(sh, NO_FREEZE, NO_LUMA)
    assert any(r["dim"] == "anim" for r in m["consecutive_repeats"])


def test_a_template_used_three_times_is_tallied():
    sh = [{"i": i, "type": "timeline", "start": i, "end": i + 1} for i in range(3)]
    assert critique.visual_metrics(sh, NO_FREEZE, NO_LUMA)["template_counts"]["timeline"] == 3


def test_alternating_backgrounds_are_not_flagged():
    sh = [{"i": 0, "bg": "glow", "start": 0, "end": 1},
          {"i": 1, "bg": "bars", "start": 1, "end": 2},
          {"i": 2, "bg": "glow", "start": 2, "end": 3}]
    assert critique.visual_metrics(sh, NO_FREEZE, NO_LUMA)["consecutive_repeats"] == []


def test_a_probe_that_did_not_run_yields_unknown_not_zero():
    sh = [{"i": 0, "start": 0, "end": 4}]
    m = critique.visual_metrics(sh, {"ran": False, "spans": []}, {"ran": False, "samples": []})
    assert m["shots"][0]["frozen_for"] is None
    assert m["shots"][0]["luma_spread"] is None


# ---------------------------------------------------------------- task 4

def test_verbatim_caption_scores_total_overlap():
    sh = [{"i": 0, "screen_text": "Reviews were warm. It sold over a million copies.",
           "vo": "Reviews were warm. It sold over a million copies."}]
    assert critique.information_gain(sh)["per_shot"][0]["overlap"] == 1.0


def test_a_screen_that_adds_information_scores_low():
    sh = [{"i": 0, "screen_text": "$75M guaranteed by the state",
           "vo": "In twenty ten, Rhode Island guaranteed a loan."}]
    assert critique.information_gain(sh)["per_shot"][0]["overlap"] < 0.5


def test_accent_markup_does_not_inflate_novelty():
    sh = [{"i": 0, "screen_text": "In 2010, Rhode Island guaranteed a loan.",
           "vo": "In twenty ten, Rhode Island guaranteed a loan."}]
    assert critique.information_gain(sh)["per_shot"][0]["overlap"] > 0.5


def test_a_silent_visual_beat_is_excluded_not_divided_by_zero():
    sh = [{"i": 0, "screen_text": "90 DAYS", "vo": ""}]
    assert critique.information_gain(sh)["per_shot"][0]["overlap"] is None


def test_novel_shots_counts_only_those_below_the_gate():
    sh = [{"i": 0, "screen_text": "a b c d", "vo": "a b c d"},
          {"i": 1, "screen_text": "$75M", "vo": "the state signed"},
          {"i": 2, "screen_text": "450 jobs", "vo": "nobody was hired"}]
    assert critique.information_gain(sh)["novel_shots"] == 2


# ---------------------------------------------------------------- task 5

def test_uniform_pauses_produce_near_zero_stdev():
    sh = [{"i": i, "vo": "a b c", "hold": 2.0, "screen_text": ""} for i in range(4)]
    data = {"scenes": [{"pause": 0.5} for _ in range(4)]}
    assert critique.audio_metrics(sh, data)["pause_stdev"] < 0.05


def test_varied_pauses_clear_the_gate():
    sh = [{"i": i, "vo": "a b c", "hold": 2.0, "screen_text": ""} for i in range(4)]
    data = {"scenes": [{"pause": p} for p in (0.2, 1.1, 0.4, 0.9)]}
    assert critique.audio_metrics(sh, data)["pause_stdev"] >= 0.25


def test_money_figure_pause_is_reported():
    sh = [{"i": 0, "vo": "Seventy five million dollars", "screen_text": "$75M", "hold": 3.0}]
    data = {"scenes": [{"pause": 0.2}]}
    assert critique.audio_metrics(sh, data)["money_pauses"][0]["pause"] == 0.2


def test_a_scene_with_no_narration_does_not_divide_by_zero():
    sh = [{"i": 0, "vo": "", "hold": 2.0, "screen_text": ""}]
    assert critique.audio_metrics(sh, {"scenes": [{"pause": 0.3}]})["wps"][0] is None


def test_wps_spread_detects_one_flat_pace_throughout():
    sh = [{"i": i, "vo": "one two three four", "hold": 2.0, "screen_text": ""}
          for i in range(4)]
    data = {"scenes": [{"pause": 0.5} for _ in range(4)]}
    assert critique.audio_metrics(sh, data)["wps_spread"] == 0.0


# ---------------------------------------------------------------- task 6

def _metrics(**over):
    m = {"id": "t", "duration": 10.0,
         "shots": [{"i": 0, "beat": "EXPLAIN", "type": "line", "hold": 2.0,
                    "luma_spread": 40.0, "frozen_for": 0.0, "ground": "x"}],
         "ground_coverage": 0.9, "template_counts": {}, "bg_counts": {},
         "consecutive_repeats": [],
         "info": {"per_shot": [], "worst": 0.2, "novel_shots": 3},
         "audio": {"pause_stdev": 0.4, "wps_spread": 0.3, "money_pauses": []},
         "drift": []}
    m.update(over)
    return m


def test_a_long_explain_hold_fails_its_gate():
    m = _metrics(shots=[{"i": 7, "beat": "EXPLAIN", "type": "line", "hold": 4.2,
                         "luma_spread": 40.0, "frozen_for": 0.0, "ground": "x"}])
    assert any(f["gate"] == "hold" and f["shot"] == 7 for f in critique.evaluate(m))


def test_a_reveal_may_hold_longer_than_an_explain():
    m = _metrics(shots=[{"i": 3, "beat": "REVEAL", "type": "number", "hold": 3.5,
                         "luma_spread": 40.0, "frozen_for": 0.0, "ground": "x"}])
    assert not any(f["gate"] == "hold" for f in critique.evaluate(m))


def test_a_flat_dark_shot_fails_the_spread_gate():
    m = _metrics(shots=[{"i": 2, "beat": "EXPLAIN", "type": "line", "hold": 2.0,
                         "luma_spread": 3.0, "frozen_for": 0.0, "ground": None}])
    assert any(f["gate"] == "luma_spread" and f["shot"] == 2 for f in critique.evaluate(m))


def test_an_unmeasured_metric_fails_rather_than_passes():
    m = _metrics(shots=[{"i": 0, "beat": "EXPLAIN", "type": "line", "hold": 2.0,
                         "luma_spread": None, "frozen_for": None, "ground": "x"}])
    assert any(f["reason"] == "not measured" for f in critique.evaluate(m))


def test_a_template_used_three_times_fails_the_repetition_gate():
    assert any(f["gate"] == "repetition"
               for f in critique.evaluate(_metrics(template_counts={"timeline": 3})))


def test_uniform_pauses_fail_the_audio_gate():
    m = _metrics(audio={"pause_stdev": 0.02, "wps_spread": 0.3, "money_pauses": []})
    assert any(f["gate"] == "pause_stdev" for f in critique.evaluate(m))


def test_a_money_figure_with_no_pause_after_it_fails():
    m = _metrics(audio={"pause_stdev": 0.4, "wps_spread": 0.3,
                        "money_pauses": [{"i": 3, "pause": 0.2}]})
    assert any(f["gate"] == "money_pause" and f["shot"] == 3 for f in critique.evaluate(m))


def test_a_clean_video_produces_no_failures():
    assert critique.evaluate(_metrics()) == []


def test_report_names_the_shot_and_the_limit():
    m = _metrics(shots=[{"i": 7, "beat": "EXPLAIN", "type": "line", "hold": 4.2,
                         "luma_spread": 3.0, "frozen_for": 3.8, "ground": None}])
    out = critique.report(m, critique.evaluate(m))
    assert "SHOT 7" in out and "REJECT" in out and "2.5" in out


def test_report_says_pass_when_nothing_failed():
    assert "PASS" in critique.report(_metrics(), [])


def test_missing_render_exits_two():
    assert critique.main(["nonexistent-id", "--root", str(_D)]) == 2


def test_a_render_with_no_audio_exits_two():
    root = _D / "silentroot"
    (root / "out").mkdir(parents=True, exist_ok=True)
    (root / "data").mkdir(parents=True, exist_ok=True)
    subprocess.run(["cp", CLIP_SILENT, str(root / "out" / "s-final.mp4")], check=True)
    (root / "data" / "s.json").write_text(
        '{"id":"s","scenes":[{"type":"line","text":"a","vo":"a","sec":1,"pause":0}]}')
    (root / "data" / "s.audio.json").write_text('{"durations":[1.0]}')
    assert critique.main(["s", "--root", str(root)]) == 2


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
