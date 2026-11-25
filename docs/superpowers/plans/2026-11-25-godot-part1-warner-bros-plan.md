# Warner Bros. Discovery — Part 1 (Godot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `render-godot/` Godot project from nothing, build the
reusable style kit (palette, toon shading, faceless character, a data-card
diagram component), and produce a reviewable Part 1 cut (script beats 0-3:
Thesis Plant, Origin, The Empire Grows, The Want) with placeholder narration,
ready to go through the `shorts-edit` editorial loop.

**Architecture:** Each beat is a hand-authored Godot scene (`.tscn`), not
generated from a JSON data file — this project deliberately has no generic
auto-render pipeline (see the design doc's "hand-built per video" decision).
3D toon-shaded scenes handle character/story beats; a 2D `Control`-based
data-card system handles the family-tree/org-chart beat. Both are built once
here as reusable kit, then every later part and every later video reuses
them — only the beat-specific scene content differs. Placeholder audio is
generated once per beat with the existing Piper voice models (English-only;
no Hindi/Hinglish model is installed — see Global Constraints) purely to
get timing right, not for pronunciation quality.

**Tech Stack:** Godot 4.7.2 (`/opt/homebrew/bin/godot`), GDScript, Piper TTS
(already-installed `en_GB-alan-medium` or `en_US-ryan-high` ONNX models under
`render/models/piper/`), ffmpeg (already installed) for final video/audio
muxing.

**Spec:** `~/.claude/knowledge-base/docs/superpowers/specs/2026-11-25-godot-pipeline-design.md`
(production pipeline design) and `~/.claude/knowledge-base/channel/scripts/001-warner-bros-discovery.md`
(approved script, beats 0-3 are this plan's scope). Read both before starting.

## Global Constraints

- Godot version: 4.7.2 exactly (`config/features=PackedStringArray("4.7", ...)` in `project.godot`).
- Resolution/FPS for this long-form video: **1920x1080 @ 30fps** (standard
  YouTube widescreen — this is long-form, distinct from the 1080x1920
  vertical format used for Shorts cut-downs later; my call, not yet
  contradicted by anything in the design doc).
- Palette values are fixed, copied from `render/src/theme.ts` (do not
  re-derive): bg `#F2EDE3`, bgLift `#FDFBF6`, shadow `#7F8799`, highlight
  `#FFF4E2`, muted `#8D8779`, text `#15171C`, accent `#E23D23`, palette.blue
  `#2D6BE4`, palette.teal `#0E9C8E`, palette.gold `#E8A317`, palette.plum
  `#7B3F8C`, palette.ink `#1D2433`.
- Figure character proportions are fixed, copied from `render/src/props.tsx`
  (do not re-derive): body `CylinderMesh` radius 0.29 (bottom) / 0.44 (top,
  i.e. tapered — Godot's `CylinderMesh` top/bottom radii are reversed from
  Three.js's, confirm orientation visually in Task 5), height 1.24; head
  `SphereMesh` radius 0.36; brow boxes 0.1 x 0.022 x 0.008 positioned at
  x=±0.13, y=1.75, z=0.335.
- Outline technique is fixed: inverted-hull — duplicate the mesh, scale it
  up by a `thickness` factor (default 1.045, per-part overrides as in the
  old kit: 1.01–1.1 depending on part), render only back faces, flat ink
  color (`#17131C` for the outline, distinct from the `ink` palette entry
  above — this was `SET.ink` in the old kit, keep it distinct).
- No Hindi/Hinglish Piper voice model is installed (`render/models/piper/`
  has only `en_GB-alan-medium.onnx` and `en_US-ryan-high.onnx`). Placeholder
  audio for this Hinglish script WILL mispronounce most words. This is
  accepted and intentional for Part 1 — the placeholder's only job is
  getting beat/shot *durations* right for animation timing, not to sound
  correct. **Never play this placeholder for Himanshu as if it represents
  final quality** — the `shorts-edit` skill's Gate 3 rule applies to this
  too.
- No generic JSON-driven scene data format exists or should be created —
  each beat's content lives directly in its own `.tscn`/`.gd` files.

## Review Focus

- **The movie-maker export is invoked against a scene that never calls
  `get_tree().quit()`** — this must not hang forever; the verification task
  (Task 1) specifically proves the quit-on-finish contract works before any
  real content is built on top of it.
- **The outline (inverted-hull) technique rendering inverted/inside-out** —
  a common failure mode of this technique is getting the `CullMode` backwards
  and seeing the outline mesh occlude the real mesh instead of ringing it;
  Task 4's test must visually confirm (screenshot) the outline reads as a
  thin ring, not a solid blob.
- **Piper mispronouncing Hinglish so badly a word's audio duration is wildly
  off from a human reading it** (e.g. a transliterated number or proper noun
  taking 3x as long as it should) — Task 7 must sanity-check derived
  durations by ear/waveform against a rough expectation, not just trust
  whatever Piper returns.
- **The family-tree component being given a parent label that was never
  added** (e.g. if Beat 2's content adds "Cartoon Network" under "Turner"
  before "Turner" itself exists) — `add_node` must fail loudly (assert/push
  error), not silently draw a disconnected node.

---

### Task 1: Godot project scaffold + movie-maker export verified

**Files:**
- Create: `render-godot/project.godot`
- Create: `render-godot/scenes/_export_test/quit_test.tscn`
- Create: `render-godot/scenes/_export_test/quit_test.gd`
- Create: `render-godot/.gitignore`

**Interfaces:**
- Produces: a working Godot project at 1920x1080@30fps, and a confirmed,
  copy-pasteable movie-maker CLI invocation that every later export task
  reuses verbatim (just swapping the scene path and output path).

- [ ] **Step 1: Create the Godot project**

Open Godot 4.7.2, create a new project at `render-godot/` (or hand-write
`project.godot` with `config/features=PackedStringArray("4.7", "Forward Plus")`,
`run/main_scene` left unset for now, `display/window/size/viewport_width=1920`,
`display/window/size/viewport_height=1080`). Add a `.gitignore` excluding
`.godot/`, `*.translation`, and an `out/` directory for rendered output.

- [ ] **Step 2: Write a minimal scene that proves the quit-on-finish contract**

`quit_test.tscn`: a `Node2D` root with a `ColorRect` (any color) and a
`Timer` child (`wait_time = 2.0`, `one_shot = true`, `autostart = true`).
`quit_test.gd` attached to root: on the Timer's `timeout` signal, call
`get_tree().quit()`.

- [ ] **Step 3: Run the movie-maker export and verify a playable file results**

Run: `/opt/homebrew/bin/godot --path render-godot --write-movie out/_test.avi res://scenes/_export_test/quit_test.tscn --fixed-fps 30`
Expected: command exits on its own (does not hang) within a few seconds
after the 2-second in-scene timer, and `render-godot/out/_test.avi` exists
and is playable (`ffprobe render-godot/out/_test.avi` reports a video stream
with duration ≈ 2s at 30fps). If the process hangs, the scene isn't quitting
— fix `quit_test.gd` before moving on; nothing in this plan works without
this contract.

- [ ] **Step 4: Commit**

```bash
git add render-godot/ && git commit -qm "feat: scaffold Godot project, verify movie-maker export quits cleanly"
```

**Ruling (location changed from the original plan):** Himanshu asked for
`render-godot/` to live at `/Users/himanshukumar/Documents/ludo/Godot-Games`
(remote: `github.com/hiri09/Godot-Games-`, branch `main`, zero commits so
far) instead of inside `knowledge-base/`. Working directly on `main` here,
no worktree — consistent with how the rest of this session's work has gone,
and this repo has no existing commits to protect yet. This repo also holds
an unrelated pre-existing chess game (`chess_logic.gd`, `chess_view.gd`,
`Main.tscn`, `project.godot`, `test_chess_logic.gd`, currently untracked) —
those are Himanshu's own separate work, not part of this plan: every commit
here stages only paths under `render-godot/`, never the repo-root chess
files. Every `render-godot/...` path elsewhere in this plan is relative to
this repo now, not `knowledge-base/`.

---

### Task 2: Palette autoload

**Files:**
- Create: `render-godot/theme/palette.gd`
- Create: `render-godot/theme/palette_test.tscn` (a throwaway scene used only to visually confirm colors, not a permanent fixture)

**Interfaces:**
- Produces: an autoloaded singleton `Palette` (registered in `project.godot`
  under `[autoload]`) exposing `const BG: Color`, `BG_LIFT`, `SHADOW`,
  `HIGHLIGHT`, `MUTED`, `TEXT`, `ACCENT`, and a nested-equivalent flat set
  `PALETTE_BLUE`, `PALETTE_TEAL`, `PALETTE_GOLD`, `PALETTE_PLUM`,
  `PALETTE_INK` (Godot GDScript doesn't nest consts as cleanly as the old
  TS `palette: {...}` object did — flatten the names rather than fight the
  language, this is a reasonable builder call, not a spec requirement).

- [ ] **Step 1: Write `palette.gd` with the exact hex values from Global Constraints**

```gdscript
extends Node
const BG := Color("#F2EDE3")
const BG_LIFT := Color("#FDFBF6")
const SHADOW := Color("#7F8799")
const HIGHLIGHT := Color("#FFF4E2")
const MUTED := Color("#8D8779")
const TEXT := Color("#15171C")
const ACCENT := Color("#E23D23")
const PALETTE_BLUE := Color("#2D6BE4")
const PALETTE_TEAL := Color("#0E9C8E")
const PALETTE_GOLD := Color("#E8A317")
const PALETTE_PLUM := Color("#7B3F8C")
const PALETTE_INK := Color("#1D2433")
```

- [ ] **Step 2: Register as an autoload**

In `project.godot`, add under `[autoload]`:
`Palette="*res://theme/palette.gd"`

- [ ] **Step 3: Verify by rendering a throwaway swatch scene**

`palette_test.tscn`: a few `ColorRect` nodes, each with `color = Palette.BG`
(etc.) set via a short `_ready()` script. Run the movie-maker export
(Task 1's command, pointed at this scene, 1-second `Timer`-triggered quit)
and visually confirm (open the resulting frame) the swatches match the hex
values by eye. Delete or leave this scene — it isn't shipped content, note
it as throwaway in a comment at the top of the file.

- [ ] **Step 4: Commit**

```bash
git add theme/palette.gd project.godot theme/palette_test.tscn
git commit -qm "feat: add Palette autoload with the locked channel color values"
```

---

### Task 3: Toon shader + gradient ramp

**Files:**
- Create: `render-godot/shaders/toon.gdshader`
- Create: `render-godot/theme/toon_ramp.tres`

**Interfaces:**
- Produces: a `.gdshader` usable as a `shader_type spatial` material on any
  `MeshInstance3D`, taking a `uniform sampler2D ramp` (the 4-step gradient)
  and `uniform vec4 albedo : source_color`, banding diffuse lighting into 4
  hard steps instead of smooth shading.

- [ ] **Step 1: Create the 4-step ramp texture**

`toon_ramp.tres`: a `GradientTexture1D` resource, `width = 4`,
`use_hdr = false`, with a `Gradient` whose color ramp has 4 equal-width hard
steps (no interpolation) at luminance values roughly matching the old
`Uint8Array([28, 96, 178, 250])` steps (i.e. 28/255, 96/255, 178/255, 250/255
as grayscale stops) — set `Gradient.interpolation_mode = CONSTANT` so steps
don't blend.

- [ ] **Step 2: Write `toon.gdshader`**

```glsl
shader_type spatial;
render_mode diffuse_toon;

uniform vec4 albedo : source_color = vec4(1.0);
uniform sampler2D ramp : filter_nearest;

void fragment() {
    ALBEDO = albedo.rgb;
}

void light() {
    float ndotl = dot(NORMAL, LIGHT);
    float banded = texture(ramp, vec2(clamp(ndotl * 0.5 + 0.5, 0.0, 1.0), 0.0)).r;
    DIFFUSE_LIGHT += banded * ALBEDO * ATTENUATION;
}
```

(`diffuse_toon` render mode plus a custom `light()` banding step is the
standard Godot 4 approach to toon shading — the exact light-banding math
above is a reasonable starting point; if the 4 bands don't read clearly at
render resolution, adjusting the `texture(ramp, ...)` sampling is an
implementation detail, not a spec change.)

- [ ] **Step 3: Verify on a test sphere**

Add a `MeshInstance3D` (SphereMesh) with a `ShaderMaterial` using
`toon.gdshader`, `albedo` set to `Palette.PALETTE_BLUE`, `ramp` set to
`toon_ramp.tres`, one `DirectionalLight3D` in the scene. Render a frame
(reuse Task 1's export command) and confirm by eye: visibly 4 distinct
shading bands across the sphere, not a smooth gradient.

- [ ] **Step 4: Commit**

```bash
git add shaders/toon.gdshader theme/toon_ramp.tres
git commit -qm "feat: add 4-step toon shader and gradient ramp"
```

---

### Task 4: Outline (inverted-hull) component

**Files:**
- Create: `render-godot/characters/outlined.tscn`
- Create: `render-godot/characters/outlined.gd`

**Interfaces:**
- Consumes: Task 3's `toon.gdshader` (for the main mesh's material — callers
  set this themselves) and `Palette.PALETTE_INK`-equivalent outline color
  (actually `#17131C`, the old kit's distinct `SET.ink`, not
  `Palette.PALETTE_INK` — add this as a new const in `palette.gd`,
  `OUTLINE_INK := Color("#17131C")`, amending Task 2's file).
- Produces: a reusable scene `Outlined.tscn` with exported
  `@export var thickness: float = 1.045` and
  `@export var outline_color: Color = Palette.OUTLINE_INK`. A caller adds
  their real `MeshInstance3D` as a child named `"Mesh"`; on `_ready()`, the
  script duplicates that mesh into a sibling `MeshInstance3D`, scales it up
  by `thickness`, assigns a flat unshaded material in `outline_color` with
  `cull_mode = CULL_FRONT` (render only back faces).

- [ ] **Step 1: Amend `palette.gd`** to add `const OUTLINE_INK := Color("#17131C")`.

- [ ] **Step 2: Write `outlined.gd`**

```gdscript
extends Node3D
@export var thickness: float = 1.045
@export var outline_color: Color = Palette.OUTLINE_INK

func _ready() -> void:
    var inner: MeshInstance3D = get_node("Mesh")
    var outline := MeshInstance3D.new()
    outline.mesh = inner.mesh
    outline.scale = Vector3.ONE * thickness
    var mat := StandardMaterial3D.new()
    mat.albedo_color = outline_color
    mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
    mat.cull_mode = BaseMaterial3D.CULL_FRONT
    outline.material_override = mat
    add_child(outline)
```

- [ ] **Step 3: Verify with a test cube**

`outlined.tscn` saved with a child `MeshInstance3D` named `Mesh` (a
`BoxMesh`, any `toon.gdshader` material). Render a frame. Confirm by eye
(screenshot): a thin dark ring around the box's silhouette, not a solid dark
blob (blob = `CULL_FRONT`/`CULL_BACK` is backwards — this is this task's
Review Focus item, don't skip the visual check).

- [ ] **Step 4: Commit**

```bash
git add theme/palette.gd characters/outlined.tscn characters/outlined.gd
git commit -qm "feat: add inverted-hull outline component"
```

---

### Task 5: Figure character scene

**Files:**
- Create: `render-godot/characters/figure.tscn`
- Create: `render-godot/characters/figure.gd`

**Interfaces:**
- Consumes: Task 3 (`toon.gdshader`, `toon_ramp.tres`), Task 4
  (`outlined.tscn` pattern, used internally per body part).
- Produces: a reusable scene instanced per-character, with exported
  `@export var coat: Color`, `@export var turn: float = 0.0`,
  `@export var character_scale: float = 1.0`, `@export var brow: float = 0.22`
  (radians, matching the old `brow` prop's role: positive/negative tilts the
  two brow boxes for expression). Faceless: round head, two brow marks, no
  eyes/mouth/limbs below the shoulders — this is a spec requirement (identity
  protection, not a style preference), don't add a face.

- [ ] **Step 1: Build the body** — an `Outlined` instance (Task 4) wrapping a
  tapered `CylinderMesh` (`top_radius = 0.44`, `bottom_radius = 0.29`,
  `height = 1.24` — confirm visually this reads as "wider at the bottom";
  Three.js and Godot may define top/bottom oppositely, flip if the silhouette
  looks inverted, per this task's Global Constraints note), material using
  `toon.gdshader` with `albedo = coat`.

- [ ] **Step 2: Build the head** — an `Outlined` instance wrapping a
  `SphereMesh` (`radius = 0.36`), positioned at `y = 1.63` relative to the
  body's base, `toon.gdshader` material, `albedo` a fixed skin-tone constant
  (add `const SKIN := Color("#EFD8BE")` to `palette.gd` — this matches the
  old kit's literal head-sphere color, which was never one of the named
  semantic palette entries).

- [ ] **Step 3: Build the two brow marks** — two small unshaded `BoxMesh`
  instances (`0.1 x 0.022 x 0.008`) at `x = ±0.13, y = 1.75, z = 0.335`
  relative to the head, each rotated by `±brow` on `z`, flat
  `OUTLINE_INK`-colored material (no shading needed, these are pure graphic
  marks, not lit geometry).

- [ ] **Step 4: Wire up exported properties on the root script**

`figure.gd` root script applies `coat` to the body material's `albedo`
uniform, `turn` to the whole scene's `rotation.y`, `character_scale` to
`scale`, `brow` to both brow boxes' z-rotation (one positive, one negated,
matching the old kit's "mirrored" expression behavior).

- [ ] **Step 5: Verify by instancing two figures side by side**

A throwaway test scene instancing `figure.tscn` twice with different `coat`
colors and opposite `turn` values, one `DirectionalLight3D`. Render a frame,
confirm by eye: two faceless humanoid shapes, visibly distinct by coat
color, facing different directions, brow marks visible (not a blank sphere).

- [ ] **Step 6: Commit**

```bash
git add theme/palette.gd characters/figure.tscn characters/figure.gd
git commit -qm "feat: add faceless Figure character (body, head, brow expression)"
```

---

### Task 6: Family-tree data-card component

**Files:**
- Create: `render-godot/data_cards/family_tree.tscn`
- Create: `render-godot/data_cards/family_tree.gd`

**Interfaces:**
- Produces: a `Control`-rooted scene with two public methods —
  `add_node(id: String, label: String, parent_id: String = "") -> void`
  (creates a `Label` + optional connecting `Line2D` to the parent's position,
  initially `modulate.a = 0.0`, i.e. invisible) and
  `reveal_node(id: String, duration: float = 0.6) -> void` (tweens that
  node's and its connecting line's `modulate.a` to `1.0`, and if
  `parent_id` was never added, pushes an error and returns without crashing
  — this is the Review Focus item for this task, write the test for it).
  Internally keeps a `Dictionary` of `id -> {label: Label, line: Line2D,
  parent_id: String, position: Vector2}`, laid out automatically
  top-to-bottom by insertion order (simplest layout that satisfies Beat 2 —
  a fixed vertical lane per depth level, new siblings placed left-to-right —
  don't build a generic graph-layout algorithm, this only ever needs to
  support flopnomics' typical 1-3 levels of "X acquired Y").

- [ ] **Step 1: Write the failing test scenario (manual, no Godot test
  framework is set up yet — this is a GDScript `@tool` script run via
  `godot --headless --script`, not a unit-test framework; keep it that
  simple rather than installing GUT or similar for one test)**

`render-godot/data_cards/family_tree_check.gd`:
```gdscript
extends SceneTree
func _init():
    var tree = preload("res://data_cards/family_tree.tscn").instantiate()
    tree.add_node("wb", "Warner Bros.")
    tree.add_node("cn", "Cartoon Network", "turner")  # "turner" was never added
    # expect: an error pushed, no crash, "cn" still not drawn connected to a phantom parent
    quit()
```

- [ ] **Step 2: Run it and confirm it fails/errors loudly before `family_tree.gd` exists**

Run: `/opt/homebrew/bin/godot --headless --path render-godot --script data_cards/family_tree_check.gd`
Expected: fails because `family_tree.tscn`/`.gd` don't exist yet.

- [ ] **Step 3: Implement `family_tree.gd`**

Public methods as specified above. `add_node` with an unknown `parent_id`:
`push_error("family_tree: unknown parent_id '%s' for node '%s'" % [parent_id, id]); return` —
no node is created for `"cn"` in that case (simplest safe behavior; a caller
that depends on the bad node existing is a scripting bug the error is meant
to surface, not something to paper over by drawing it disconnected anyway).

- [ ] **Step 4: Re-run the check script and confirm it now errors as expected,
  without crashing**

Run: same command as Step 2.
Expected: stderr shows the pushed error, process still exits 0 (quit() was
reached).

- [ ] **Step 5: Verify the happy path visually**

A throwaway scene adding Warner Bros. → Turner → Cartoon Network (correct
parent chain this time) and calling `reveal_node` on each with a 0.5s
`Timer`-staggered sequence. Render via movie-maker, confirm by eye: nodes
and connecting lines fade in in the right order, in the right tree shape.

- [ ] **Step 6: Commit**

```bash
git add data_cards/family_tree.tscn data_cards/family_tree.gd data_cards/family_tree_check.gd
git commit -qm "feat: add family-tree data-card component with parent-validation"
```

---

### Task 7: Placeholder narration audio for Part 1

**Files:**
- Create: `render-godot/audio/generate_placeholder.py`
- Create: `render-godot/audio/part1/beat0.wav` … `beat3.wav` (generated output)

**Interfaces:**
- Consumes: Piper binary (confirm it's on `PATH` or reuse whatever
  `render/build-audio.py` uses to invoke it — check that file's `run()`
  calls for the exact Piper CLI invocation pattern before writing this
  script, don't guess the flags) and
  `render/models/piper/en_GB-alan-medium.onnx`.
- Produces: one `.wav` file per beat (0-3), 48kHz, and prints each file's
  duration in seconds to stdout (needed by Task 10 to time the visual scenes).

- [ ] **Step 1: Extract Part 1's four lines of narration text verbatim from
  `channel/scripts/001-warner-bros-discovery.md`** (Beats 0-3's Hinglish
  paragraphs) into a small Python list/dict in `generate_placeholder.py` —
  copy the exact text, don't paraphrase it.

- [ ] **Step 2: Implement generation, reusing the same Piper invocation
  pattern `build-audio.py` uses** (read that file's `run()`/subprocess calls
  for the exact binary name and flags first — this task's implementer must
  match the existing working invocation, not invent a new one).

- [ ] **Step 3: Run it and verify output**

Run: `python3 render-godot/audio/generate_placeholder.py`
Expected: 4 `.wav` files exist under `render-godot/audio/part1/`, each
playable (`ffprobe` reports a valid audio stream and non-zero duration).

- [ ] **Step 4: Sanity-check durations by ear against rough expectation**
  (this task's Review Focus item) — play (or inspect the waveform of) at
  least `beat2.wav` (the longest/densest line) and confirm its duration is
  in a plausible range for the line's word count at a normal speaking pace
  (roughly 2.5-3 words/second) — not 3x too long, which would indicate Piper
  badly stalling on Hinglish/transliterated terms.

- [ ] **Step 5: Commit**

```bash
git add audio/generate_placeholder.py audio/part1/
git commit -qm "feat: generate placeholder (English-voice, Hinglish-text) narration for Part 1"
```

---

### Task 8: Beat 0 scene — Thesis Plant

**Files:**
- Create: `render-godot/scenes/part1/beat0_thesis.tscn`

**Interfaces:**
- Consumes: `Palette` (Task 2), `beat0.wav`'s duration (Task 7).
- Produces: a scene whose root is a `Node2D` named `Beat0`, containing an
  `AudioStreamPlayer` (preloaded with `beat0.wav`) and a `Label` showing the
  thesis line, over a flat `Palette.BG`-colored full-screen `ColorRect`. A
  `Timer` (`wait_time` = the wav's duration + 0.5s tail, per the script's
  `DEFAULT_TAIL` convention from `build-audio.py`) calls
  `get_tree().quit()` when run standalone (so this scene is independently
  exportable for review before Part 1 is assembled).

- [ ] **Step 1: Build the scene** per Interfaces above. Text content is the
  thesis line from the script, in the exact Hinglish wording already
  approved — don't retranslate or rephrase it.

- [ ] **Step 2: Render it standalone and do the Senior-Editor screenshot
  check** (per `shorts-edit`): export via Task 1's movie-maker command
  pointed at this scene, pull a frame, confirm by eye the text is legible
  against the background and on-screen for the audio's full duration.

- [ ] **Step 3: Commit**

```bash
git add scenes/part1/beat0_thesis.tscn
git commit -qm "feat: build Beat 0 (Thesis Plant) scene"
```

---

### Task 9: Beat 1 scene — Origin

**Files:**
- Create: `render-godot/scenes/part1/beat1_origin.tscn`

**Interfaces:**
- Consumes: `Figure` (Task 5), `Palette`, `beat1.wav`.
- Produces: a scene with 4 `Figure` instances (the four Warner brothers —
  differentiate with slightly different `coat` colors so they're visually
  distinguishable, since they're faceless; exact colors are a builder
  choice, pick from the existing `Palette` set rather than inventing new
  ones), a simple `Camera3D`, one `DirectionalLight3D`, and the same
  audio/timer/quit pattern as Task 8.

- [ ] **Step 1: Build the scene** — four `Figure` instances arranged in a
  loose group, camera framing all four.

- [ ] **Step 2: Render standalone, Senior-Editor screenshot check** — confirm
  4 distinct faceless figures read clearly as a group, not overlapping into
  an unreadable blob.

- [ ] **Step 3: Commit**

```bash
git add scenes/part1/beat1_origin.tscn
git commit -qm "feat: build Beat 1 (Origin) scene"
```

---

### Task 10: Beat 2 scene — The Empire Grows

**Files:**
- Create: `render-godot/scenes/part1/beat2_empire.tscn`

**Interfaces:**
- Consumes: `family_tree` (Task 6), `Palette`, `beat2.wav`.
- Produces: a scene instancing `family_tree.tscn`, building the chain
  Warner Bros. → Turner (→ CNN, → Cartoon Network) → HBO, then → AT&T
  (2018) → Discovery (2022) per the script's beat 2 text, each `reveal_node`
  call timed (via staggered `Timer`s or an `AnimationPlayer` track) to land
  roughly when that name is spoken in `beat2.wav` — exact sync timing is a
  builder judgment call reviewed visually in Step 2, not a fixed spec value.

- [ ] **Step 1: Build the scene**, calling `add_node`/`reveal_node` in the
  order the script introduces each name.

- [ ] **Step 2: Render standalone, Senior-Editor screenshot check** — pull
  frames at a few timestamps, confirm nodes appear in the right order and
  the tree shape matches the real company-history chain, not just a flat
  list.

- [ ] **Step 3: Commit**

```bash
git add scenes/part1/beat2_empire.tscn
git commit -qm "feat: build Beat 2 (The Empire Grows) scene using the family-tree component"
```

---

### Task 11: Beat 3 scene — The Want

**Files:**
- Create: `render-godot/scenes/part1/beat3_want.tscn`

**Interfaces:**
- Consumes: `Figure` (one instance, representing Kilar — faceless, per the
  spec's anti-goal, not a likeness), `Palette`, `beat3.wav`.

- [ ] **Step 1: Build the scene** — one `Figure` instance, simple framing,
  optionally a small text card restating "HBO Max" as the named ambition
  (a data-card-style label is fine here even though this beat is mostly
  character-mode — the design doc's "switch per beat" rule is about which
  mode *dominates* a beat, not a hard either/or).

- [ ] **Step 2: Render standalone, Senior-Editor screenshot check.**

- [ ] **Step 3: Commit**

```bash
git add scenes/part1/beat3_want.tscn
git commit -qm "feat: build Beat 3 (The Want) scene"
```

---

### Task 12: Assemble Part 1 and run the editorial-loop QC pass

**Files:**
- Create: `render-godot/scenes/part1/part1.tscn`
- Create: `render-godot/out/` (export output, gitignored per Task 1)

**Interfaces:**
- Consumes: Beats 0-3 (Tasks 8-11) as instanced sub-scenes or packed scenes
  sequenced one after another.
- Produces: `render-godot/out/part1.avi` (then `.mp4` via an ffmpeg mux step)
  — the actual Part 1 cut.

- [ ] **Step 1: Build `part1.tscn`** sequencing the four beat scenes
  back-to-back (simplest approach: a root script that instances each beat
  scene in turn, waits for its `Timer`/quit signal, frees it, instances the
  next — rather than one shared `Timer` across all four, since each beat's
  own scene already owns its correct duration from Task 7's measured audio
  length).

- [ ] **Step 2: Export the full Part 1 cut**

Run: `/opt/homebrew/bin/godot --path render-godot --write-movie out/part1.avi res://scenes/part1/part1.tscn --fixed-fps 30`
then `ffmpeg -i render-godot/out/part1.avi -c:v libx264 -c:a aac render-godot/out/part1.mp4`.

- [ ] **Step 3: Run the `shorts-edit` Senior Editor pass for real** — pull
  actual frames from `part1.mp4` at several timestamps across all 4 beats,
  look at them; listen to the actual audio track for noise (there
  shouldn't be any synthesis noise from Piper, but confirm — this is the
  gate, not a formality). Write the verdict (pass, or the open list) per
  the skill.

- [ ] **Step 4: Commit**

```bash
git add scenes/part1/part1.tscn
git commit -qm "feat: assemble Part 1 cut (beats 0-3) end to end"
```

(The rendered `.avi`/`.mp4` in `out/` stays gitignored — it's a build
artifact, not source, same convention as the old `render/out/`.)
