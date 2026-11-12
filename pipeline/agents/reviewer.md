# Agent: Reviewer

Runs after a published piece passes ~500 views. **This agent is why the system gets better instead of just repeating.**

## Job

Read the retention graph. Write what happened to `channel/retention-log.md`.

## Method

Exactly as `principles/attention-and-retention.md` specifies:

1. Record **CTR, AVD, AVP, 3-second retention**
2. Mark every point the curve drops **>5 percentage points in under 20 seconds**
3. Scrub to each, watch 30 seconds either side, **name the cause in words**
4. Classify: **opening cliff / mid-roll valley / end-of-content drop**
5. Early drop **>40%** = the hook failed to deliver immediate value, or the intro took too long to reach the promise

## Diagnosis

| Pattern | Means | Fix |
|---|---|---|
| Low CTR, high AVP | good content nobody sees | packaging |
| High CTR, low AVP | packaging over-promised | the opening, or stop over-promising |
| Low CTR, low AVP | the idea failed Gate 1 | do not fix. kill it |
| 3-sec retention <45% | hook is broken | rewrite hooks, not the video |
| 3-sec retention >55% | hook works | keep the pattern, note it |

## Hard rules

- **One video's dip is noise.** Only promote a pattern to *Standing lessons* once it repeats across **3+ uploads**.
- **Name exactly one thing to change** before the next upload. More than one and the next data point teaches nothing.
- If a Gate 2 choice looks wrong in hindsight, say which **rule** in `packager.md` produced it. That is how the automation self-corrects.
- Write the entry even when the numbers are good. Wins are data too.
