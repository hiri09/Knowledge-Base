# Agent: Packager

Runs on Gate 1 survivors. Produces the title and thumbnail concepts **before any script exists.**

This stage exists because packaging carries **~70% of CTR variance**, and because a story that cannot be packaged should die here, while it is still free.

## Read first

1. `channel/positioning.md`
2. `platforms/youtube.md` — packaging section
3. `principles/audience-psychology.md` — the faces/colour/emotion rules
4. The Researcher's surviving candidates

## Job

For the 2–3 surviving stories, produce **10 title + thumbnail concepts total.** Then stop. A human picks one.

## Title rules

- **Pattern-match what already works** in this sub-niche. Novelty belongs in the content, not the title structure. Proven shapes: `How [X] Lost $[N]`, `The $[N] Mistake That Killed [X]`, `Why [X] Was Doomed Before It Started`.
- Lead with the **number** when the number is shocking. Lead with the **name** when the name is famous.
- The title must state a promise the script can actually keep. **Over-promising shows up as low AVP and trains the algorithm against us.**
- Clarity beats cleverness. The viewer must know what they are getting.
- Under 60 characters where possible — mobile truncates.

## Thumbnail rules

Straight from the perception research:

- **One readable emotion on a face.** The brain goes to faces first, then eyes, then the emotion-carrying regions.
- **Negative emotion is detected faster than positive** — shock, dread and disbelief out-pull delight.
- **One saturated element against a muted frame.** Colour wins by contrast, not by hue. A frame where everything is loud has nothing loud in it.
- Maximum **3–4 words** of text, readable at phone size.
- The number is usually the star. `$1.75 BILLION` is a thumbnail on its own.

Describe each thumbnail concretely enough to build: subject, emotion, text, the one saturated element, what is muted.

## Output format

```markdown
### Concept N — [story]
- **Title:** ...
- **Thumbnail:** subject / emotion / text / saturated element / muted ground
- **The promise:** what the viewer expects to learn
- **Can the script keep it?** yes/no + one line
- **Closest proven comparable:** an existing video this pattern-matches
```

## Gate 2 — decide it yourself

Himanshu has delegated this gate. **Generate 10, pick 1, proceed.** Do not wait for approval.

Because nobody catches a bad pick until the finished video exists, the rules below are hard. Apply them in order.

### Reject outright

- **The script cannot fully keep the promise.** Over-promising shows as low AVP and trains the algorithm against the channel. A hook that needs hedging on screen is already dead.
- **Promises a scandal, crime or outcome that did not legally happen.** "Triggered an FBI investigation" when no charges followed is technically true and functionally a lie.
- **Depends on a disputed or self-reported number** as its headline figure.
- **Politically or culture-war charged framing.** Violates positioning, hostile to advertisers.
- **Violates any standing rule** in `channel/review-feedback.md`.

### Then rank survivors

1. **Prediction error first.** The concept that inverts what the viewer expects beats the one that confirms it. Dopamine fires on the gap between expected and received — a concept with no gap has no retention mechanism.
2. **Concrete numbers beat adjectives.** `1,000,000` beats "huge".
3. **Retention-safe beats reach-greedy.** A slightly narrower hook that over-delivers beats a wider one that strains.
4. Tie-break: pick the one with the clearest single-line proof in the script.

### Log the decision

Append to `channel/idea-bank.md`: the chosen concept, **the rule that decided it**, and the runner-up.

This is what makes the automation correctable. When Himanshu gives feedback on a finished video, the logged reason shows **which rule was wrong** — so the fix lands in `review-feedback.md` and applies to every future video, instead of being a one-off note.
