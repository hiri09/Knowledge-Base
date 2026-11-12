# Start here (agent entry point)

This knowledge base is Himanshu's external brain. Read this file first, then route.

## Routing — read at most 3 files

| Your task | Read |
|---|---|
| Any content work (idea, script, hook, edit, publish) | `principles/content-operating-model.md` + `principles/audience-psychology.md` |
| Writing or judging a hook | `principles/attention-and-retention.md` |
| Publishing to a specific platform | `platforms/<platform>.md` — **always**, in addition to principles |
| Deciding what this channel is or isn't | `channel/positioning.md` |
| Running any pipeline stage | `pipeline/README.md` + `pipeline/agents/<your-role>.md` |
| **Producing anything Himanshu will watch** | `channel/review-feedback.md` — **always, no exceptions** |
| Background on why the niche was chosen | `channel/youtube-niche-economics.md` |

Then stop reading and start working. Do not read the whole tree.

## The structure, and why it is shaped this way

```
principles/   Universal. True on every platform, in every format.
              If it is here, it does not change when the platform changes.

platforms/    Platform-specific rules. These CONTRADICT each other on purpose.
              YouTube wants information density. Instagram wants visual polish.
              Both are correct, on their own platform, and only there.

channel/      Decisions and research specific to this one channel.
              Also the machine's memory: idea-bank, upload-log, retention-log.

pipeline/     How videos get made. Stage definitions and agent specs.
              Process, not knowledge — read only the stage you are running.
```

**The hard rule: never apply one platform's rules to another platform.** The same video re-cut for a different platform is a different product, not a copy. If `platforms/youtube.md` and `platforms/instagram.md` disagree, that is the system working, not a bug.

Adding a platform later (TikTok, LinkedIn, X) means adding one file to `platforms/`. Nothing else changes. That is the point of this split.

## Non-negotiables

1. **Packaging before production.** Title and thumbnail (or hook and cover) are decided before any script is written. An idea that cannot be packaged is killed, not produced.
2. **Three metrics only** at decision time: CTR, AVD, AVP. Subscribers, likes and comments are downstream noise.
3. **One variable per iteration.** Change one thing between uploads or you learn nothing.
4. **Feedback given once never gets given twice.** `channel/review-feedback.md` is binding on every producing agent. If Himanshu repeats a note, the system failed.
5. **Research depth is the moat.** The faceless crackdown killed the version where nobody did any work. Every piece needs something a template could not produce.

## Writing to this KB

```sh
~/.claude/skills/knowledge-base/kb.sh "<folder>/<name>.md" "<message>" <<'MD'
# Title

Gist line — this becomes the index entry.
MD
```

`INDEX.md` regenerates itself. Never edit it by hand. Read an existing file before overwriting it.
