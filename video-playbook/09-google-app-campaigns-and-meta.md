# Google App campaigns and Meta ads

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

## 21. Google App campaigns: learnings

### 21.1 The big one: bid on an in-app event, not installs

- Our first campaign bid on install volume. It bought almost entirely in-app display inventory with an 18–21% CTR: accidental taps.
  - **0 of the first 16 installs finished onboarding.**
- We switched the *same* campaign to optimise for an in-app activation event (`onboarding_completed`). Within ~3 days:
  - **cost per activated user dropped ~3.7×**
  - daily activations went from 0/12 to 28/48
- **Judge everything by activated users per rupee, never by CPI alone.** For your app, the activation event might be "finished first practice session" or "completed onboarding". Pick the first moment of real value.

### 21.2 Conversion setup chain

1. The app logs the event to Firebase / GA4 (verify it in DebugView with a real device).
2. Mark it as a **key event** in GA4.
3. Link GA4 ↔ Google Ads.
4. Import the event as a **primary** conversion.
5. Switch the campaign bidding to that conversion. No ad re-review is needed, but learning resets.
6. Bidding on an in-app action needs roughly **≥10 events per day** to learn. If volume is too thin, start on installs for a few days, then switch, or pick an earlier event.

### 21.3 Assets

- **Text:** up to 5 headlines (≤30 chars) and 5 descriptions (≤90 chars), each able to stand alone. Mix benefit, objection killer ("free to start", "no card needed") and social proof, all true.
- **Videos:** supply **all three orientations**: 9:16, 16:9 and 1:1. If one is missing, Google auto-generates poor versions. Up to 20 videos per ad group.
  - YouTube-hosted, unlisted or public; ≥10 s (we ran 15–30 s).
  - **16:9 must land hook + payoff + brand by 5.0 s.**
- **Images:** 1:1 (1200×1200), 1.91:1 (1200×628), 4:5 (1200×1500), ≤5 MB.
  - Images without overlaid text serve on more placements.
  - Writing "Install" on an image can get it rejected.
  - Make a no-logo twin of each image.
- **The Play Store listing is part of the creative.** Google builds ads from your *default* store listing, and the listing is where the install decision happens.
  - Match the screenshots and first line to the ads.
  - Audit the listing for stale claims or old branding before you spend.
  - Custom store listings only show on some placements.
- **Creative is the targeting:** the system finds audiences by reading your assets. Make assets genuinely different (different opening, footage and angle), not color or font swaps.

### 21.4 Budget and pacing

- Daily budget ≈ **≥50× target CPI** (install bidding) or **≥10× target CPA** (event bidding), or the campaign can't exit learning.
- **Don't edit for ~1 week, or until ~100 conversions.** Every significant change resets learning.
- Scale budget by at most +20–30% every ~3 days.
- You can't target by age in App campaigns. Language and geo are the real controls.
- **Kill/keep rule (adapt the numbers):** decide upfront. For example:
  - Kill an asset group if CPI is high for 3 days AND activation <15%.
  - Keep and scale if CPI is in target AND activation ≥25%.
  - Also track paid-cohort D1 retention (we aimed ≥25%).

### 21.5 Attribution

- Read the **Play Install Referrer** in the app and store it on the user in your backend. Google Ads installs carry `gclid` / `gad_campaignid`. Now you can join users to campaigns yourself.
- Keep paid search separate from organic in your channel reports. Treat "(not set)" as its own *unattributed* bucket; don't assume it's ads.
- Check that the SDK events actually fire in release builds. A build plugin once stripped an ads SDK's init and sent **zero** events. Verify with test events before spending.
- Daypart from data, not intuition: heavy usage hours aren't always good ad inventory hours.

### 21.6 Account and ops gotchas

- New ad accounts: the first card payments can fail and nothing serves at ₹0 balance. Fund early and confirm the account is "eligible".
- The Google Ads mobile app sometimes shows warnings about leftover drafts (for example "add keywords"). App campaigns have no keywords; ignore it.
- Google Ads API production access can require Cloud brand verification, so plan to launch by hand in the web UI at first.
- Ad clicks are only half the funnel. Make sure users who install but don't onboard get a nudge, and that an engaged new user doesn't hit a usage cap in their first hour.

## 22. Meta (Instagram/Facebook) ads: short notes

- **Advantage+ app campaigns:** one broad ad set; creative does the targeting. A good research setup is 3–6 genuinely distinct concepts × 2–3 hooks each.
- **Sizes:** 9:16 1080×1920 (Reels/Stories, safe zone top 14% / bottom 35% / sides 6%) and 4:5 1080×1350 (Feed). 15–30 s.
- **Copy:** 3–5 primary texts (~44 chars visible on Reels) and headlines ≤27 chars.
- **Policy (personal attributes):** never pair "you" with a condition or insecurity ("Is your English weak?", "Embarrassed when you speak?"). Ads get rejected for it. Also avoid guarantees, "unlimited" (unless literally true), competitor names, and age claims.
- **Creative metrics:**
  - Hook rate = 3-second plays ÷ impressions. Under 20–25% fix the hook; 25–35% solid; over 35% strong.
  - Compare hold rate ad vs ad.
  - Don't judge before ~2–3K impressions, or before spending 2× the target CPA.
  - **Strong hook + bad CPA** → the problem is after the hook (body, store page, onboarding).
  - **Weak hook + good CPA** → write new hooks on the same concept.
- Verify Meta SDK events in Events Manager → Test Events before spending.
