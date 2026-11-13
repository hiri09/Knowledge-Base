# Editorial Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the measurement harness and the four editorial roles, so a Short is judged on its rendered pixels before Himanshu ever sees it.

**Architecture:** `critique.py` extracts hard numbers from the final mp4 using ffmpeg filters and the render's own data JSON, writes `metrics.json`, and exits non-zero on gate failure. Four role specs in `pipeline/agents/` define who produces and who rejects. Two renderer root-cause fixes remove the mechanical uniformity the numbers would otherwise flag on every video forever.

**Tech Stack:** Python 3 stdlib only (no numpy, no OpenCV), ffmpeg/ffprobe (already a dependency of `finish.sh`), TypeScript/React for the two Remotion fixes, markdown for the role specs.

**Spec:** `pipeline/editorial-loop.md`

## Global Constraints

- **Python stdlib only.** No new pip dependency. `json`, `subprocess`, `re`, `pathlib`, `statistics`, `argparse`.
- **ffmpeg only for measurement.** Filters: `select/showinfo`, `freezedetect`, `signalstats`, `blackdetect`, `silencedetect`, `astats`. No CV library.
- **Tests are plain `assert` in `render/test_critique.py`**, run with `python3 test_critique.py`. No pytest, no fixtures directory — test clips are generated with `ffmpeg -f lavfi` into a temp dir and deleted. This matches the repo, which has no test framework.
- **Fixture clips are 320x568** (portrait, 1/3 scale) to keep tests under a few seconds.
- **Gate values are exactly those in the spec's "Hard gates" block.** Copy them verbatim; do not round or re-derive.
- **Exit codes:** `0` all gates pass · `1` one or more gate failures · `2` render invalid (missing file, zero duration, or no audio stream).
- **A measurement that could not run is a failure, never a pass.** Every probe returns a `ran: bool` alongside its data.
- **Scene durations come from `data/<id>.audio.json` `durations[]`, not from `sec`.** `sec` is a floor only — `Short.tsx:36` already treats it that way.

## Review Focus

Five conditions the spec implies but no task's own tests would otherwise exercise, most dangerous first. Each is pinned to a task below.

1. **A probe that silently returns nothing scores as perfect.** `freezedetect` finding no freezes and `freezedetect` failing to run both produce an empty list. This is the same class of bug as the flat-black rule passing QC — absence of evidence read as evidence of absence. → Task 1, `ran` flag asserted.
2. **Scene count and audio `durations[]` length disagree.** Produces an `IndexError` mid-run, or worse, silently truncates. It must be a reported finding. → Task 2.
3. **A video with no audio stream, or a missing mp4.** Must reach the exit-code-2 automatic zero, not a traceback. → Task 6.
4. **A scene with no `vo` field** (a pure visual beat). Divides by zero in words-per-second and in token overlap. → Tasks 4 and 5.
5. **Accent markup in on-screen text.** `"In 2010, *Rhode Island* guaranteed a loan."` must have `*` stripped before token overlap, or every marked line understates its overlap with the narration. → Task 4.

---

## File Structure

| File | Responsibility | New? |
|---|---|---|
| `render/critique.py` | the whole harness — probes, metrics, gates, report, CLI | create |
| `render/test_critique.py` | one runnable check per metric group | create |
| `render/src/Short.tsx` | stop deriving visuals from scene index | modify, `:32`, `:116-119` |
| `render/src/DataScenes.tsx` | timeline track spans its marks, not its container | modify, `Timeline` |
| `render/data/001-38-studios.json` | explicit `beat`/`bg`/`anim`/`pos` per scene | modify |
| `pipeline/agents/director.md` | owns story and performance; signs the direction sheet | create |
| `pipeline/agents/assistant-director.md` | turns script into beats and shot specs | create |
| `pipeline/agents/editor.md` | owns the frame; builds to spec | create |
| `pipeline/agents/senior-editor.md` | owns the verdict; extracts its own frames | create |
| `channel/review-feedback.md` | annotate each rule with the gate that now enforces it | modify |
| `pipeline/README.md` | the loop enters the flow diagram | modify |
| `~/.claude/skills/shorts-edit/SKILL.md` | drives both loops | create |

---

### Task 1: ffmpeg probes

Four functions that shell out to ffmpeg and parse stderr. Every one reports whether it actually ran.

**Files:**
- Create: `render/critique.py`
- Create: `render/test_critique.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `probe(path: str) -> dict` → `{ran, duration: float, has_audio: bool, width: int, height: int}` via `ffprobe -show_format -show_streams -of json`
  - `cuts(path: str, threshold: float = 0.3) -> dict` → `{ran, times: list[float]}` via `-vf "select='gt(scene,{threshold})',showinfo" -f null -`, parsing `pts_time:` out of stderr
  - `freezes(path: str, noise: float = 0.003, dur: float = 1.0) -> dict` → `{ran, spans: list[tuple[float, float]]}` via `freezedetect=n={noise}:d={dur}`, pairing `freeze_start` with `freeze_end`
  - `luma(path: str, fps: float = 2) -> dict` → `{ran, samples: list[tuple[float, float]]}` of `(t, YAVG)` via `-vf "fps={fps},signalstats,metadata=print:key=lavfi.signalstats.YAVG"`
- `ran` is `True` only when the ffmpeg call exited 0 **and** stderr matched the expected shape at least once. A clip known to contain the feature is what proves the parser; see the tests.

- [ ] **Step 1: Write the failing tests**

```python
import critique, subprocess, tempfile, pathlib

def _clip(d, name, *filters):
    """Build a lavfi test clip. Returns its path."""
    p = str(pathlib.Path(d) / name)
    subprocess.run(["ffmpeg", "-v", "error", "-y", *sum(([*f] for f in filters), []), p], check=True)
    return p

def test_probe_reads_duration_and_audio():
    # 2s of colour with a sine track
    assert critique.probe(CLIP_AV)["ran"] is True
    assert abs(critique.probe(CLIP_AV)["duration"] - 2.0) < 0.15
    assert critique.probe(CLIP_AV)["has_audio"] is True

def test_probe_reports_missing_audio():
    assert critique.probe(CLIP_SILENT)["has_audio"] is False

def test_cuts_finds_the_join_in_a_two_colour_clip():
    # red 1s concat blue 1s -> exactly one cut, near t=1.0
    r = critique.cuts(CLIP_TWO_COLOUR)
    assert r["ran"] is True
    assert len(r["times"]) == 1
    assert abs(r["times"][0] - 1.0) < 0.2

def test_freezes_finds_a_static_clip():
    # 3s of a single flat colour is frozen end to end
    r = critique.freezes(CLIP_STATIC)
    assert r["ran"] is True
    assert len(r["spans"]) == 1
    assert r["spans"][0][1] - r["spans"][0][0] > 1.5

def test_freezes_finds_nothing_in_moving_footage_but_still_ran():
    # the dangerous case: empty result must not be indistinguishable from failure
    r = critique.freezes(CLIP_TESTSRC)
    assert r["ran"] is True
    assert r["spans"] == []

def test_luma_separates_black_from_grey():
    assert critique.luma(CLIP_BLACK)["samples"][0][1] < 5
    assert critique.luma(CLIP_GREY)["samples"][0][1] > 100

def test_probe_on_missing_file_does_not_raise():
    assert critique.probe("/nonexistent.mp4")["ran"] is False
```

Clips, all 320x568, built once in a module-level `tempfile.TemporaryDirectory()`:

| Name | lavfi source |
|---|---|
| `CLIP_AV` | `color=c=red:s=320x568:d=2` + `sine=f=440:d=2` |
| `CLIP_SILENT` | `color=c=red:s=320x568:d=2` |
| `CLIP_TWO_COLOUR` | two 1s `color` clips concatenated |
| `CLIP_STATIC` | `color=c=#202020:s=320x568:d=3` |
| `CLIP_TESTSRC` | `testsrc=s=320x568:d=3` |
| `CLIP_BLACK` | `color=c=black:s=320x568:d=1` |
| `CLIP_GREY` | `color=c=#808080:s=320x568:d=1` |

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd render && python3 test_critique.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'critique'`

- [ ] **Step 3: Implement the four probes in `render/critique.py`**

Each runs `subprocess.run([...], capture_output=True, text=True)` and parses stderr with a regex. `freezedetect` emits `freeze_start: N` and `freeze_end: N` on separate lines — pair them in order, and close any unpaired final `freeze_start` at the clip duration. `signalstats` emits `lavfi.signalstats.YAVG=N` paired with a preceding `pts_time:N`. Catch `FileNotFoundError` and non-zero exit, returning `ran: False` rather than raising.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd render && python3 test_critique.py`
Expected: all assertions pass, no output

- [ ] **Step 5: Commit**

```bash
git add render/critique.py render/test_critique.py
git commit -m "critique: ffmpeg probes for cuts, freezes and luminance"
```

---

### Task 2: The shot table

Turn the data JSON and the audio durations into the authoritative list of what was *meant* to be on screen and when.

**Files:**
- Modify: `render/critique.py`
- Modify: `render/test_critique.py`

**Interfaces:**
- Consumes: Task 1's `probe`.
- Produces: `shots(data: dict, audio: dict) -> dict` → `{ran, shots: list[dict], drift: list[str]}` where each shot is
  `{i, type, beat, bg, anim, pos, start, end, hold, vo, screen_text, ground, source}`.
  - `hold` = `max(floor, durations[i])` where floor is `2.2` for `type == "number"` (`MIN_NUMBER_SEC`) else `0.9` — mirroring `Short.tsx:36`. `start` is the running sum of prior holds plus prior `pause` values.
  - `screen_text` is the on-screen copy: `text` for `hook`/`line`, `f"{value} {label}"` for `number`, `f"{label} {sub}"` for `grid`, `caption` for `timeline`, `f"{aLabel} {bLabel}"` for `compare`. Accent markers stripped.
  - `ground` is `scene.get("media")` or `None`.
  - `beat`/`bg`/`anim`/`pos` are read from the scene; absent means `None` (Task 7 makes them explicit).
  - `drift` carries a line per inconsistency — scene count vs `durations` length being the first.

- [ ] **Step 1: Write the failing tests**

```python
def test_shots_uses_audio_durations_not_sec():
    data = {"scenes": [{"type": "line", "text": "a", "sec": 3, "vo": "a", "pause": 0.5}]}
    audio = {"durations": [4.4]}
    assert critique.shots(data, audio)["shots"][0]["hold"] == 4.4

def test_shots_applies_the_number_floor():
    data = {"scenes": [{"type": "number", "value": "$75M", "label": "x", "sec": 3, "vo": "x", "pause": 0}]}
    assert critique.shots(data, {"durations": [1.0]})["shots"][0]["hold"] == 2.2

def test_start_times_accumulate_holds_and_pauses():
    data = {"scenes": [
        {"type": "line", "text": "a", "vo": "a", "pause": 0.5, "sec": 1},
        {"type": "line", "text": "b", "vo": "b", "pause": 0.0, "sec": 1},
    ]}
    s = critique.shots(data, {"durations": [2.0, 3.0]})["shots"]
    assert s[0]["start"] == 0.0
    assert s[1]["start"] == 2.5

def test_scene_count_mismatch_is_drift_not_a_crash():
    data = {"scenes": [{"type": "line", "text": "a", "vo": "a", "sec": 1, "pause": 0}]}
    r = critique.shots(data, {"durations": [1.0, 2.0]})
    assert r["shots"]          # still produced what it could
    assert any("count" in d for d in r["drift"])

def test_screen_text_strips_accent_markers():
    data = {"scenes": [{"type": "line", "text": "In 2010, *Rhode Island* guaranteed a loan.",
                        "vo": "x", "sec": 1, "pause": 0}]}
    assert "*" not in critique.shots(data, {"durations": [1.0]})["shots"][0]["screen_text"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd render && python3 test_critique.py`
Expected: FAIL with `AttributeError: module 'critique' has no attribute 'shots'`

- [ ] **Step 3: Implement `shots(data, audio)` in `render/critique.py`**

Per-type `screen_text` extraction is a dict of lambdas keyed on `type`; an unknown type contributes `""` and a `drift` line rather than raising.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd render && python3 test_critique.py`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add render/critique.py render/test_critique.py
git commit -m "critique: shot table from data JSON and narration durations"
```

---

### Task 3: Visual metrics and their gates

**Files:**
- Modify: `render/critique.py`
- Modify: `render/test_critique.py`

**Interfaces:**
- Consumes: Task 1 (`freezes`, `luma`), Task 2 (`shots`).
- Produces: `visual_metrics(shots: list[dict], freezes: dict, luma: dict) -> dict` → per-shot
  `{i, hold, frozen_for, mean_luma, ground, bg, beat}` plus video-level
  `{ground_coverage: float, template_counts: dict, bg_counts: dict, consecutive_repeats: list}`.
  A shot's `mean_luma` is the mean of `luma` samples falling inside `[start, end)`; `frozen_for` is the overlap in seconds between its span and any freeze span.
  `consecutive_repeats` covers **all three** repeating dimensions — `bg`, `anim` and `type` (the scene template) — each entry `{dim, i, value}`. `template_counts` and `bg_counts` are whole-video tallies.
- Gate limits live in one module-level dict `GATES`, values copied verbatim from the spec.

- [ ] **Step 1: Write the failing tests**

```python
def test_hold_gate_per_beat_class():
    assert critique.GATES["hold"]["HOOK"] == 1.2
    assert critique.GATES["hold"]["EXPLAIN"] == 2.5
    assert critique.GATES["hold"]["REVEAL"] == 4.0

def test_frozen_shot_is_attributed_to_the_right_shot():
    shots = [{"i": 0, "start": 0.0, "end": 2.0}, {"i": 1, "start": 2.0, "end": 6.0}]
    fz = {"ran": True, "spans": [(2.4, 5.8)]}
    m = critique.visual_metrics(shots, fz, {"ran": True, "samples": []})
    assert m["shots"][0]["frozen_for"] == 0
    assert m["shots"][1]["frozen_for"] > 3.0

def test_mean_luma_is_windowed_to_the_shot():
    shots = [{"i": 0, "start": 0.0, "end": 1.0}, {"i": 1, "start": 1.0, "end": 2.0}]
    lm = {"ran": True, "samples": [(0.0, 2.0), (0.5, 2.0), (1.0, 150.0), (1.5, 150.0)]}
    m = critique.visual_metrics(shots, {"ran": True, "spans": []}, lm)
    assert m["shots"][0]["mean_luma"] < 5      # the flat-black failure
    assert m["shots"][1]["mean_luma"] > 100

def test_ground_coverage_is_runtime_weighted_not_shot_counted():
    # one long grounded shot among three short bare ones is still >50%
    shots = [{"i": 0, "start": 0, "end": 10, "ground": "capitol"},
             {"i": 1, "start": 10, "end": 12, "ground": None},
             {"i": 2, "start": 12, "end": 14, "ground": None}]
    m = critique.visual_metrics(shots, {"ran": True, "spans": []}, {"ran": True, "samples": []})
    assert m["ground_coverage"] > 0.5

def test_consecutive_background_repeat_is_flagged():
    shots = [{"i": 0, "bg": "glow", "start": 0, "end": 1}, {"i": 1, "bg": "glow", "start": 1, "end": 2}]
    m = critique.visual_metrics(shots, {"ran": True, "spans": []}, {"ran": True, "samples": []})
    assert any(r["dim"] == "bg" for r in m["consecutive_repeats"])

def test_consecutive_entrance_animation_is_flagged():
    shots = [{"i": 0, "anim": "rise", "start": 0, "end": 1}, {"i": 1, "anim": "rise", "start": 1, "end": 2}]
    m = critique.visual_metrics(shots, {"ran": True, "spans": []}, {"ran": True, "samples": []})
    assert any(r["dim"] == "anim" for r in m["consecutive_repeats"])

def test_a_template_used_three_times_is_tallied():
    shots = [{"i": i, "type": "timeline", "start": i, "end": i + 1} for i in range(3)]
    m = critique.visual_metrics(shots, {"ran": True, "spans": []}, {"ran": True, "samples": []})
    assert m["template_counts"]["timeline"] == 3

def test_a_probe_that_did_not_run_fails_rather_than_passes():
    m = critique.visual_metrics([{"i": 0, "start": 0, "end": 4}],
                                {"ran": False, "spans": []}, {"ran": True, "samples": []})
    assert m["shots"][0]["frozen_for"] is None    # unknown, not zero
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd render && python3 test_critique.py`
Expected: FAIL — `GATES` and `visual_metrics` undefined

- [ ] **Step 3: Implement `GATES` and `visual_metrics(shots, freezes, luma)`**

When a probe reports `ran: False`, the metrics it feeds are `None`, never `0`. Task 6's gate evaluation treats `None` as a failure with reason `"not measured"`. This is Review Focus item 1.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd render && python3 test_critique.py`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add render/critique.py render/test_critique.py
git commit -m "critique: hold, freeze, luminance, ground and repetition metrics"
```

---

### Task 4: Information gain

The metric behind "just reading the text".

**Files:**
- Modify: `render/critique.py`
- Modify: `render/test_critique.py`

**Interfaces:**
- Consumes: Task 2 (`shots`).
- Produces: `information_gain(shots: list[dict]) -> dict` → `{per_shot: list[{i, overlap: float|None}], worst: float, novel_shots: int}`.
  `overlap` is `len(screen_tokens & vo_tokens) / len(screen_tokens)`, tokens lowercased, stripped of punctuation and accent markers. A shot with empty `screen_text` or empty `vo` has `overlap: None` and is excluded from `worst`. `novel_shots` counts shots with `overlap < 0.5`.

- [ ] **Step 1: Write the failing tests**

```python
def test_verbatim_caption_scores_total_overlap():
    shots = [{"i": 0, "screen_text": "Reviews were warm. It sold over a million copies.",
              "vo": "Reviews were warm. It sold over a million copies."}]
    assert critique.information_gain(shots)["per_shot"][0]["overlap"] == 1.0

def test_a_screen_that_adds_information_scores_low():
    shots = [{"i": 0, "screen_text": "$75M guaranteed by the state",
              "vo": "In twenty ten, Rhode Island guaranteed a loan."}]
    assert critique.information_gain(shots)["per_shot"][0]["overlap"] < 0.5

def test_accent_markup_does_not_inflate_novelty():
    shots = [{"i": 0, "screen_text": "In 2010, Rhode Island guaranteed a loan.",
              "vo": "In twenty ten, Rhode Island guaranteed a loan."}]
    assert critique.information_gain(shots)["per_shot"][0]["overlap"] > 0.5

def test_a_silent_visual_beat_is_excluded_not_divided_by_zero():
    shots = [{"i": 0, "screen_text": "90 DAYS", "vo": ""}]
    r = critique.information_gain(shots)
    assert r["per_shot"][0]["overlap"] is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd render && python3 test_critique.py`
Expected: FAIL — `information_gain` undefined

- [ ] **Step 3: Implement `information_gain(shots)`**

Tokenise with `re.findall(r"[a-z0-9$]+", s.lower())`. Numerals and their spelled-out forms will not match (`2010` vs `twenty ten`) — that is correct and intended: a screen showing a figure the narration says in words *is* adding something to read.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd render && python3 test_critique.py`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add render/critique.py render/test_critique.py
git commit -m "critique: information gain between screen text and narration"
```

---

### Task 5: Audio metrics

**Files:**
- Modify: `render/critique.py`
- Modify: `render/test_critique.py`

**Interfaces:**
- Consumes: Task 2 (`shots`).
- Produces: `audio_metrics(shots: list[dict], data: dict) -> dict` → `{pauses: list[float], pause_stdev: float|None, wps: list[float|None], wps_spread: float|None, money_pauses: list[{i, pause}]}`.
  `pauses` is each scene's `pause`. `wps` is `len(vo.split()) / hold`, `None` for a scene with no `vo`. `wps_spread` is `(max - min) / mean` over the non-`None` values. `money_pauses` lists shots whose `vo` or `screen_text` matches `r"\$[\d.,]+[MBK]?"` together with the pause that followed.

- [ ] **Step 1: Write the failing tests**

```python
def test_uniform_pauses_produce_near_zero_stdev():
    shots = [{"i": i, "vo": "a b c", "hold": 2.0} for i in range(4)]
    data = {"scenes": [{"pause": 0.5} for _ in range(4)]}
    assert critique.audio_metrics(shots, data)["pause_stdev"] < 0.05

def test_varied_pauses_clear_the_gate():
    shots = [{"i": i, "vo": "a b c", "hold": 2.0} for i in range(4)]
    data = {"scenes": [{"pause": p} for p in (0.2, 1.1, 0.4, 0.9)]}
    assert critique.audio_metrics(shots, data)["pause_stdev"] >= 0.25

def test_money_figure_pause_is_reported():
    shots = [{"i": 0, "vo": "Seventy five million dollars", "screen_text": "$75M", "hold": 3.0}]
    data = {"scenes": [{"pause": 0.2}]}
    assert critique.audio_metrics(shots, data)["money_pauses"][0]["pause"] == 0.2

def test_a_scene_with_no_narration_does_not_divide_by_zero():
    shots = [{"i": 0, "vo": "", "hold": 2.0}]
    assert critique.audio_metrics(shots, {"scenes": [{"pause": 0.3}]})["wps"][0] is None
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd render && python3 test_critique.py`
Expected: FAIL — `audio_metrics` undefined

- [ ] **Step 3: Implement `audio_metrics(shots, data)` using `statistics.pstdev`**

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd render && python3 test_critique.py`
Expected: all pass

- [ ] **Step 5: Commit**

```bash
git add render/critique.py render/test_critique.py
git commit -m "critique: pause and pace metrics from the narration plan"
```

---

### Task 6: Gates, report and CLI

The part the Senior Editor actually reads.

**Files:**
- Modify: `render/critique.py`
- Modify: `render/test_critique.py`

**Interfaces:**
- Consumes: Tasks 1–5. `metrics` is the single merged dict assembled by `main`:
  `{id, duration, shots, ground_coverage, template_counts, bg_counts, consecutive_repeats, info, audio, drift}`
  — `visual_metrics`' output at the top level, Task 4's result under `info`, Task 5's under `audio`, Task 2's `drift` carried through.
- Produces:
  - `evaluate(metrics: dict) -> list[dict]` → failures, each `{gate, shot: int|None, got, limit, reason}`. A metric of `None` fails with `reason: "not measured"`.
  - `report(metrics: dict, failures: list[dict]) -> str` → the readable per-shot table in the spec's rejection format.
  - `main(argv) -> int` → `0` pass, `1` gate failures, `2` render invalid. Writes `out/<id>.metrics.json`. `--json` prints machine output instead of the table.
- CLI: `python3 critique.py <id> [--json]`, reading `out/<id>-final.mp4`, `data/<id>.json`, `data/<id>.audio.json`.

- [ ] **Step 1: Write the failing tests**

```python
def test_a_long_explain_hold_fails_its_gate():
    m = {"shots": [{"i": 7, "beat": "EXPLAIN", "hold": 4.2, "mean_luma": 40,
                    "frozen_for": 0, "ground": "x"}], "ground_coverage": 0.9,
         "consecutive_repeats": [], "info": {"per_shot": []}, "audio": {}}
    f = critique.evaluate(m)
    assert any(x["gate"] == "hold" and x["shot"] == 7 for x in f)

def test_an_unmeasured_metric_fails_rather_than_passes():
    m = {"shots": [{"i": 0, "beat": "EXPLAIN", "hold": 2.0, "mean_luma": None,
                    "frozen_for": None, "ground": "x"}], "ground_coverage": 0.9,
         "consecutive_repeats": [], "info": {"per_shot": []}, "audio": {}}
    assert any(x["reason"] == "not measured" for x in critique.evaluate(m))

def test_a_template_used_three_times_fails_the_repetition_gate():
    m = {"shots": [], "ground_coverage": 0.9, "consecutive_repeats": [],
         "template_counts": {"timeline": 3}, "bg_counts": {},
         "info": {"per_shot": []}, "audio": {}}
    assert any(x["gate"] == "repetition" for x in critique.evaluate(m))

def test_report_names_the_shot_and_the_limit():
    out = critique.report(M_FAILING, critique.evaluate(M_FAILING))
    assert "SHOT 7" in out and "REJECT" in out and "2.5" in out

def test_missing_render_exits_two():
    assert critique.main(["nonexistent-id"]) == 2

def test_a_render_with_no_audio_exits_two():
    assert critique.main([SILENT_ID]) == 2
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd render && python3 test_critique.py`
Expected: FAIL — `evaluate` undefined

- [ ] **Step 3: Implement `evaluate`, `report` and `main`**

`main` checks `probe()` first and short-circuits to `2` before any other work — Review Focus item 3. The report's per-shot block follows the spec's format exactly, since it is what a human reads at round 3.

- [ ] **Step 4: Run tests to verify they pass, then run it on the real video**

Run: `cd render && python3 test_critique.py && python3 critique.py 001-38-studios`
Expected: tests pass; the real video **fails** on hold length, luminance, ground coverage, repetition and information gain. A pass here means the gates are wrong — video 001 is the known-bad reference.

- [ ] **Step 5: Commit**

```bash
git add render/critique.py render/test_critique.py
git commit -m "critique: gates, report and CLI"
```

---

### Task 7: Visuals stop being a function of scene index

Root cause of "same screen is used again". `Short.tsx:116-119` derives animation, position and background from `i % len`, so with 4 backgrounds and 11 scenes the cycle repeats three times in fixed order and nobody ever chose anything.

**Files:**
- Modify: `render/src/Short.tsx` (`:32`, `:116-119`, the `Scene` type at `:8-13`)
- Modify: `render/data/001-38-studios.json`

**Interfaces:**
- Consumes: nothing.
- Produces: every `Scene` variant gains four optional fields — `beat?: 'HOOK'|'EXPLAIN'|'REVEAL'|'CLOSE'`, `bg?: BgKind`, `anim?: keyof typeof ANIMS`, `pos?: typeof POSITIONS[number]`. Task 2's `shots()` already reads them.
- The modulo fallback stays as a default for a scene that specifies nothing, so an unmigrated data file still renders.

- [ ] **Step 1: Add the four fields to the `Scene` union and read them in the renderer**

`const bg = scene.bg ?? BGS[i % BGS.length];` and the same shape for `anim` and `pos`. `beat` is not consumed by the renderer at all — it exists for `critique.py` and for the AD.

- [ ] **Step 2: Annotate all 13 scenes in `001-38-studios.json`**

Assign `beat` by the script's structure: scene 0 `HOOK`, the `number` and `compare` scenes `REVEAL`, the last scene `CLOSE`, the rest `EXPLAIN`. Choose `bg` deliberately so no kind runs twice consecutively and none appears more than three times.

- [ ] **Step 3: Re-render and verify the repetition gate improves**

Run: `cd render && npm run render && python3 critique.py 001-38-studios`
Expected: `consecutive_repeats` empty and `bg_counts` all ≤ 3. Hold, luminance and ground gates still fail — those are Plan 2 and the roles' job, not this task's.

- [ ] **Step 4: Commit**

```bash
git add render/src/Short.tsx render/data/001-38-studios.json
git commit -m "render: scenes choose their own background, motion and position"
```

---

### Task 8: Timeline track spans its marks

The red line running past the last dot in his screenshots. `DataScenes.tsx` draws the track across the full 820px container while marks sit at `at * 100%`, so a last mark at `at: 0.9` leaves 10% of track hanging into nothing.

**Files:**
- Modify: `render/src/DataScenes.tsx` (`Timeline`)

**Interfaces:**
- Consumes: nothing. `Timeline`'s props are unchanged.
- Produces: the track element inset to `left: min(at)*100%`, `right: (1 - max(at))*100%`, with the progress fill measured against that span rather than the container.

- [ ] **Step 1: Inset the track and rebase the fill**

The fill's width becomes `(p - min) / (max - min)` clamped to `[0, 1]`, so `head` keeps meaning "fraction of the timeline travelled".

- [ ] **Step 2: Render a still of each timeline scene and look at it**

Run: `cd render && npx remotion still Short out/t1.png --frame=150 && npx remotion still Short out/t2.png --frame=620`
Expected: no track visible beyond the first or last dot in either.

- [ ] **Step 3: Commit**

```bash
git add render/src/DataScenes.tsx
git commit -m "render: timeline track spans its marks, not its container"
```

---

### Task 9: The four role specs

**Files:**
- Create: `pipeline/agents/director.md`, `assistant-director.md`, `editor.md`, `senior-editor.md`
- Modify: `channel/review-feedback.md`, `pipeline/README.md`

**Interfaces:**
- Consumes: `critique.py`'s report format and exit codes; the spec's role table and stopping rules.
- Produces: four specs in the house style of `pipeline/agents/scriptwriter.md` — `## Read first`, the job, hard rules, `## Output format`.

- [ ] **Step 1: Write the four specs**

Each one states its artifact, what it may reject, and its stopping rule. Non-negotiables to carry verbatim from the spec: the Senior Editor extracts its own frames from the final mp4 and never scores the Editor's description; after round 1 only hard-gate failures may block; a well-built shot that should not exist escalates to the Director, not back to the Editor.

- [ ] **Step 2: Annotate the standing rules with their gates**

In `channel/review-feedback.md`, append `→ gate: <name> <limit>` to each rule now enforced by a number. Rules with no number stay prose and stay advisory.

- [ ] **Step 3: Add the loop to the flow diagram in `pipeline/README.md`**

Between stage 5 RENDER and stage 6 QC.

- [ ] **Step 4: Commit**

```bash
git add pipeline/agents channel/review-feedback.md pipeline/README.md
git commit -m "pipeline: director, AD, editor and senior editor roles"
```

---

### Task 10: The `shorts-edit` skill

**Files:**
- Create: `~/.claude/skills/shorts-edit/SKILL.md`

**Interfaces:**
- Consumes: the four role specs, `critique.py`.
- Produces: a skill that runs Loop 1 then Loop 2 for a given video id, enforcing the round limits. Written so the roles can be followed inline in one session or dispatched as subagents — neither is assumed.

- [ ] **Step 1: Write the skill**

Frontmatter `name` and `description` per the house pattern in `~/.claude/skills/knowledge-base/`. Body routes to `pipeline/editorial-loop.md` and the role specs rather than restating them.

- [ ] **Step 2: Verify it loads**

Run: `ls ~/.claude/skills/shorts-edit/SKILL.md && head -5 ~/.claude/skills/shorts-edit/SKILL.md`
Expected: valid frontmatter with `name: shorts-edit`

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "skill: shorts-edit drives the editorial loop"
```

---

## Not in this plan

Deliberately split out, because they are a separate subsystem with a separate blocker:

**Plan 2 — Pantry and voice.** Pexels video fetch, Internet Archive source, the Chatterbox/Kokoro bake-off, per-line performance tags in `build-audio.py`. Blocked on a free Pexels key for the first half; the voice half is a spike that must be *heard* before it is specified.

**Renderer craft work** — step-not-slide motion, paper texture, snap transitions. The spec is explicit that these get built when a shot spec asks for one, not speculatively.
