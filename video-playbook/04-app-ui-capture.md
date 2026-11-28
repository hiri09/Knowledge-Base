# Capturing your app's UI

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

## 7. Capturing your app's UI

This is the most important input for app ads. The goal is **real app footage that is deterministic**, so it can be cut frame-exactly to beats.

### 7.1 Approaches compared

| Approach | Verdict |
|---|---|
| Plain screen recording (`adb screenrecord`, phone recorder) | OK for quick drafts. Not deterministic, has dropped frames, toasts, keyboard bands and random timing, so it's hard to cut to beats. |
| Rebuild the UI as video code (Remotion/HTML) | Pixel-perfect and supports any camera move, but you maintain a second copy of the UI that drifts from the real app. Use it only for stylised or abstract UI moments. |
| **Real app, scripted input, captured deterministically** | **Best.** Real pixels, and every event has a known timestamp. |

### 7.2 Native Android (most likely your case)

**Clean device state (do this every take):**

```bash
# Demo mode: clean status bar (full battery, fixed clock, no notifications)
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4 -e mobile show -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false
# Disable animations only if you will re-animate in post (otherwise keep them; real motion looks good)
# adb shell settings put global window_animation_scale 0
```

**Scripted input:** use **Maestro** (YAML flows: tap by text or id, type, scroll, wait for an element). Flows are reproducible, so takes are repeatable. Alternatives are UIAutomator, Espresso, or `adb shell input tap/text/swipe` for simple cases.

**Recording:**
- `adb shell screenrecord --bit-rate 20M --size 1080x2400 /sdcard/take.mp4` has a 3-minute limit. It is variable frame rate, so conform it with `ffmpeg -i take.mp4 -vf fps=30 -c:v libx264 -crf 12 take30.mp4` before editing.
- `scrcpy --record take.mkv --no-playback` on Linux/macOS is higher quality with less overhead.
- Use the emulator (Pixel 8-class AVD) for a consistent resolution, or a real device for real performance.

**Log event timestamps:** have the Maestro flow (or a debug-build hook) print events with timestamps (`TYPING_START`, `SENT`, `REPLY_SHOWN`) to logcat. Parse them into `meta.json` so the planner cuts on real events. Line them up with the recording by a visible sync event (for example a tap at t0).

**Frame-perfect stills and short animations:** use Compose screenshot testing (**Paparazzi** or **Roborazzi**) to render screens at exact states without a device. It's great for store screenshots and for animating screens in the motion engine.

**Live AI or network responses:** record the real response once, then replay it from a mock at the recorded chunk timings. The text and timing stay real, and every take is identical. Shoot 6–10 takes when content varies, and log pass/fail per take.

**Data:**
- Use seeded, fictional demo accounts on a staging backend, never real users' data.
- Pick demo data whose real output reads well.
- Pin every on-screen value you mention in captions to a facts file.

**Hygiene:** dismiss coach marks, tooltips and debug overlays like a real user would. Hide the keyboard band if it isn't part of the story. Fail the take on any crash, ANR or unexpected dialog.

### 7.3 Web or hybrid apps (Capacitor/React Native web, PWA)

If the app runs in a browser, the strongest method is **Playwright + a virtual clock**:

1. Emulate a phone: 390×844 CSS px, deviceScaleFactor 2–3, `isMobile: true`, touch on. Set it via CDP `Emulation.setDeviceMetricsOverride` on the same session you screenshot from.
2. Inject a shim before any app script. It replaces `setTimeout`, `setInterval`, `requestAnimationFrame`, `performance.now`, `Date`, and CSS/Web Animations' `currentTime`, all driven by a virtual clock.
3. Loop: advance the clock to `n/30` s, then `Page.captureScreenshot`. This gives perfect 30 fps with zero dropped frames.
4. Scripted typing at ~6–7 chars/s with seeded jitter, eased drags, and named events written to `meta.json` (including every keystroke time, for keyboard foley).
5. Don't use CDP `startScreencast`. It ignores DPR and only emits on change, so holds get truncated. Chrome's built-in virtual time doesn't hold CSS animations in new headless mode.
6. **ES-module gotcha:** imports are hoisted, so seed storage and install the clock in a module imported *first*. Otherwise the app boots signed-out.

### 7.4 iOS

- Use `xcrun simctl io booted recordVideo --codec h264 take.mp4` plus XCUITest (or Maestro, which supports iOS) for scripted input.
- `xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --cellularBars 4` cleans the status bar.

### 7.5 Store screenshots

1. Capture clean screens.
2. Compose each in an HTML template: headline + device frame + background from `brand.json`.
3. Screenshot the template with Playwright. The page sets `window.__ready = true` when fonts and images have loaded.
4. Export 24-bit PNG with no alpha.

**Play Store sizes:** feature graphic 1024×500, icon 512×512, 2–8 phone screenshots (1080×1920 works well).

**Time your shoots after UI redesigns ship.** A video of real screens goes stale the day those screens change.
