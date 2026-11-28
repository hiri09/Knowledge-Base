# YouTube upload, metadata and analytics

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

## 20. YouTube upload, metadata and analytics loop

### 20.1 Upload via the Data API v3 (`videos.insert`, resumable)

- **snippet:** `title` (≤100 chars, validate it), `description`, `tags`, `categoryId`, `defaultLanguage`, `defaultAudioLanguage`.
- **status:**
  - `privacyStatus: "private"` + `publishAt` (ISO with timezone) → YouTube publishes on schedule while your machine sleeps.
  - `selfDeclaredMadeForKids: false`.
  - `containsSyntheticMedia: true` when you use AI voice or realistic AI visuals (an honest disclosure; officially no reach cost).
- OAuth desktop client, scopes `youtube.upload` + `youtube.readonly`. Store the token outside the repo with chmod 600.
- **Dry-run by default.** Print the target channel name before uploading, and write `uploaded.json` so re-runs skip finished videos.
- **Spacing:** space Shorts ≥ ~9–10 h apart (2 per day max). In our test, Shorts posted 2 h apart got starved.
- **Google Ads use:** ads can't use *private* videos. Upload ad videos as **unlisted** (or public).

### 20.2 Thumbnails (long-form)

- Render from the engine.
- One clear subject, ≤3 words, high contrast.
- Test it at 160 px wide.

### 20.3 Analytics loop (read, decide, act)

- Read YouTube Studio (API or browser automation) into a dated JSON snapshot per read:
  - views
  - stayed-to-watch % (viewed vs swiped away)
  - average view duration and % viewed
  - subs per 1K views
  - shares
  - traffic sources
  - search terms
- **Decision rules that worked:**
  - Under ~100 feed views = untested, not a verdict. Late pickups happen.
  - Read each Short at 24 h. If **stayed-to-watch < ~45%**, re-cut the first 2 seconds; don't change the topic.
  - **Kill at 48 h** if it has ≥200 feed views and stayed < 40%. Re-hook once, then drop it.
  - **Double down** at ≥10K views or ≥1 sub per 1K views: ship 2–3 follow-up angles within 72 h, plus a long-form deep dive.
  - Stayed ≥ ~53% → the feed keeps pushing it. ≤ ~32% → it died at the swipe.
- **Honest statistics:** with ~8 videos per arm, you can't detect the effect of voice, music, length or post time. Don't over-read small samples. Volume plus fast kills beats desk-picking winners.
- Shorts acquire viewers; long-form compounds them. Add long-form on proven topics once Shorts show traction.
