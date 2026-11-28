# Research and script mechanics

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

## 5. YouTube and market research method

### 5.1 Find what actually works (data, not vibes)

- Use **yt-dlp in metadata mode only** (no downloading):

  ```bash
  yt-dlp --skip-download --flat-playlist -J "ytsearch50:your query"
  yt-dlp --skip-download -O "%(upload_date)s\t%(view_count)s\t%(duration)s\t%(channel_id)s\t%(channel_follower_count)s\t%(title)s" URL
  ```

- If requests fail with 403 or throttling, cycle player clients: `--extractor-args "youtube:player_client=mweb"`, then `web_embedded`, then `tv`.
- Write a query file of `topic|query` lines in every phrasing your audience uses (English, Hinglish, native script).
- Search long-form and Shorts separately. Cache raw JSON responses and stay under a request budget.
- yt-dlp's date-sorted search is unreliable, so **date-check every candidate yourself**.

### 5.2 The key metric: outlier multiple

- **outlier = video views ÷ median views of that channel's last ~30–60 uploads of the same type** (exclude the video itself).
- Raw views mostly measure channel size. A 50× outlier on a 10K-subscriber channel is a real demand signal; 1M views on a 10M-subscriber channel isn't.
- **Proof rule before committing to a topic or format:** at least 2 recent videos (last ~90 days) from *different* channels with the same topic and hook, each ≥20× its channel median or ≥1M views.
- **Label every claim** in research notes: `[M]` measured, `[D]` derived, `[J]` judgement, `[3p]` third-party. Always list the gaps (for example, no subscriber history, or search only shows what it surfaces).

### 5.3 Study the craft of references (quality bar)

- Download only small windows of reference videos for internal study, then delete them:

  ```bash
  yt-dlp -f "bv*[height<=720]" --download-sections "*00:00-00:30" --force-keyframes-at-cuts URL
  ```

- Extract frames at 2 fps plus scene cuts (`select='gt(scene,0.3)'`). Make contact sheets (`tile=5x4`).
- Record per reference:
  - average shot length (ASL)
  - caption size and position
  - how the product is framed
  - time to first caption
  - time to first cut
  - music tempo
  - number of on-screen elements
- Set your targets from those measurements. Never reuse their frames.

### 5.4 Find the hook moment of a song or video

- `yt-dlp -J URL` includes a **`heatmap`** array (YouTube's "most replayed" data) on many videos.
- The peak is the most recognisable moment. That beats picking "the loudest part" from an RMS envelope.

### 5.5 Ad research

- Look through Meta Ad Library and Google Ads Transparency Center for competitors and adjacent apps.
- Note which ads have been running longest (long-running = profitable). Note their hook in the first 3 s, the length, how the app is shown and the CTA.

## 6. Script and structure mechanics

These are structural mechanics, not creative direction.

- **First frame:** never black, never a fade-in, never a logo. Frame 0 should be a complete, legible still, because the platform scores the first second.
- **First words:** text or speech on screen within ~1 s. Trim the dead air most recordings have before the first word.
- **Payoff within 3–5 s of the hook on ads.** A hook with no quick payoff is treated as clickbait by both viewers and the platform.
- **Promise → payoff lint:** give every hook a `promise` id that a later beat must `pays`. Lint the spec for it.
- **Every line passes the "stranger test":** someone who has never heard of the app understands it. Insider feature names fail, so name features by what they do.
- **On-screen claims must be true:** check every number, price, "free", "unlimited" or limit against the product's real config before it goes in a video.
- **Loop for Shorts and Reels:** design the last beat so it flows back into the first. End cards play over moving footage, not a frozen frame.
- **Ad length:** finals around 15–30 s, plus a ≤6 s bumper if useful. 16:9 YouTube ads must land hook, answer and brand by **5.0 s** (the skip button).
- **Variety:** platforms (YouTube's 2025–26 "inauthentic / mass-produced content" policy, and ad systems) penalise templated sameness. Rotate structures, vary the outro, and don't reuse an identical closing card on every upload.
- **Script schema** (per video):

  ```json
  {"id":"...", "hook_text":"...", "title":"...",
   "beats":[{"text":"...", "visual":"...", "pause_after":0.3, "promise":"p1"}],
   "cta":"...", "sources":["..."]}
  ```

- **TTS text normalisation** (if using TTS):
  - Expand digits, dates and currency into words.
  - Split into 15–25-word clauses.
  - Use punctuation to control pauses.
  - Merge very short lines (under ~14 characters) into the next one; tiny prompts are unstable.
