# Visual design system (the art side, made mechanical)

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

## 4. Visual design fundamentals for agents (the "art side")

You don't need to be a designer. You need a **system** the agent follows every time, so every video looks like it came from the same studio. Consistency beats occasional brilliance.

### 4.1 Build a `brand.json` before making any video

```json
{
  "palette": {
    "bg": "#0F1220", "surface": "#1A1F35", "text": "#F5F3EE", "muted": "#9AA0B4",
    "primary": "#5B6CFF", "accent": "#FFB547", "highlight": "#FFE27A"
  },
  "fonts": { "display": "brand/fonts/Display-Bold.ttf", "body": "brand/fonts/Body-Medium.ttf" },
  "type_scale_px_at_1080w": { "hero": 96, "h1": 72, "caption": 64, "small": 40 },
  "radius": 28,
  "motion": { "enter_ms": 280, "exit_ms": 200, "ease_enter": "cubic-bezier(0.16,1,0.3,1)", "ease_exit": "cubic-bezier(0.7,0,0.84,0)" },
  "safe_zone_9x16": { "top": 0.14, "bottom": 0.35, "sides": 0.06 }
}
```

**Derive it from the app's own design** (its colors, fonts, illustration style, icon). An ad that looks like the app keeps the promise the install lands on. A generic flat background with a generic phone looks like every other app.

### 4.2 Rules an agent can apply mechanically

**Color**
- Use 1 background family, 1 text color, 1 primary and 1 accent. **Use the accent for one thing per frame** (the key word or the button) and nothing else.
- Check contrast: at least 4.5:1 for normal text and 3:1 for large text, against the actual frame behind it. Compute it; don't eyeball it.
- Don't put text over a busy image without a scrim (a dark gradient behind the text area) or an outline.

**Typography**
- Use at most 2 typefaces (display + body). Prefer the app's real fonts.
- Set hierarchy by **size and weight**, not by more colors.
- Keep line length short. Captions are 6–7 words maximum per line group, ideally 3–5.
- Don't break hyphenated words at the hyphen. Avoid one-word orphan lines.
- Use real font files and check that they load (`document.fonts.ready`) before capturing. Otherwise the first frames show a fallback font.

**Layout**
- Use an 8 px spacing grid. Give elements consistent margins from one place in `brand.json`.
- Keep text and key UI inside the platform safe zones (§17). Check them automatically.
- Empty space must look intentional. A frame with one small element and 40% emptiness reads as broken, not minimal.
- Show **the whole phone** when showing the app: a realistic device frame at about 75–80% of frame height, with the whole screen visible. Keep any zoom-in gentle (≤1.15x). Tight crops and 1.5x+ punch-ins on UI look amateur.
- **Never put captions over the app UI.** Put them above, below or beside the phone.

**Motion**
- Every move is eased; never use linear motion for UI or text.
  - Enter: ease-out (fast start, soft landing), 200–400 ms.
  - Exit: ease-in, shorter than the enter.
  - Never longer than 500 ms for UI or text.
- One thing moves at a time, or things move in a clear stagger (40–80 ms between items).
- A slow push-in (2–8% scale over a shot) keeps a static image alive. Anything less than about 6% over 4–5 s is invisible and reads as a freeze.
- Shots shorter than ~0.8 s don't register. Shots longer than ~3–4 s without internal motion feel stuck.
- **Uniform rhythm reads as AI-made**: every shot the same length, every transition a dissolve, every caption 3 words. Vary shot lengths, emphasis and pauses on purpose.
- Over-correcting also fails: a flash or whoosh on every cut reads as cheap. Pick 2–4 transition types that fit the brand and use them by rule (see §8.4), not at random.

**Consistency**
- Make a **style frame** first: one still per format showing the bg, phone, caption and end card. Get it approved before building the timeline.
- Use the **real icon and logo files**. Never let the agent redraw or "recreate" brand assets.
- Lock decisions into `brand.json` and the engine's components. Each new video should only touch its spec.

### 4.3 Efficient way to get "good" without art skill

1. Collect 10–20 reference ads or videos you like (from competitors or other categories).
2. Have the agent extract frames (see §5.3) and write a **measured** description: average shot length, caption size as a % of frame height, number of colors, how the phone is framed, transitions used, music tempo.
3. Turn that into `brand.json` and engine defaults.
4. Render a 3-option style-frame grid. You pick one by eye. Lock it.
