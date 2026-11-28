# Starter prompts for your agent

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

## 24. Starter prompts for your agent

**Session start (paste once):**

> Read every file in video-playbook/ (start with README.md) and treat it as binding defaults. Work headless and silent. Measure everything; never estimate timings or levels. Before any build, confirm brand/brand.json exists and use only it for colors, fonts and motion. After each render, run qa/ and give me the QA.md summary, a contact sheet and the local board path. Whenever I correct something, update brand.json, engine defaults or video-playbook/ so it never recurs.

**Set up the brand system:**

> From the app's real design (screens in capture/stills/, the icon, the fonts used in the app), build brand/brand.json following playbook §4. Then render 3 style-frame options (9:16, 16:9, 1:1 each) with the phone, a caption and an end card, onto a local review board. Don't invent brand assets; use the real files.

**Research:**

> Using yt-dlp metadata only (playbook §5), find outlier Shorts and ads in [topic/category] from the last 90 days. Compute the outlier multiple vs channel median, apply the proof rule, label claims [M]/[D]/[J], and list gaps. Output research/<date>.md and a board.

**App capture:**

> Set up deterministic app capture per playbook §7.2: demo-mode status bar, Maestro flows for [flow names], event timestamps to meta.json, recordings conformed to 30 fps CFR. Use seeded demo accounts on staging only. Shoot 6 takes per flow and log pass/fail in takes.md.

**Make an ad:**

> Make an app ad from this brief: [hook, feature beats, CTA]. Follow the playbook: spec-as-code, events-driven planner, whole-phone framing, captions outside the phone, music aligned so a bar line hits the hero action, master at −14 LUFS / −1 dBTP, all three shapes (9:16, 16:9 with payoff by 5 s, 1:1). Offer 2–3 measured music options. Run full QA and put everything on a board with first-2.5 s filmstrips.

**VO:**

> Generate the VO for script.md per playbook §10–11: per-sentence TTS, best-of-6 by CER + pitch/rate cost, natural pauses, room tone, polish chain, words.json with silence-snapped and de-collided onsets. Report CER per line and flag anything over 0.08.


*Default to measuring, keep one source of truth, and turn every correction into a rule. That's what makes this fast and consistent.*
