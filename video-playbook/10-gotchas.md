# Gotchas that cost real iterations

> Part of the video playbook. Start at README.md. Section numbers (§) refer across files.

## 23. Gotchas that cost us real iterations

1. **Clip shorter than its slot** (fps mismatch or span math): the editor freezes the last frame. Conform fps, assert frame counts, and run freezedetect.
2. **`afade st=` after `-ss` input seek is output-relative.** Absolute times gave a −91 dB silent music bed.
3. **`-t` after `-i` is an output limit** and caps a slow-motion stretch. Put `-t` before `-i` to limit input.
4. **Infinite generators** (`anullsrc`, `color=`) need explicit duration or `shortest=1`. One filled the disk.
5. **RGB/YUV format negotiation:** LUTs and blends in YUV give magenta. Force `format=gbrp`.
6. **Whisper:** leading-silence hallucination, the first word after a pause timed early, forced language dropping speech, loops on music, and dropped sentences unless `condition_on_previous_text=False`.
7. **TTS:** long inputs skip or loop, tiny inputs are unstable, digits are unreliable. Generate per sentence, best-of-N, CER-scored.
8. **Whole-file averages lie:** they hide a silent head and loud tails dominate them. Measure in windows.
9. **Relative paths under a different working directory** were silently skipped and the render shipped without music. Use absolute paths and measure the output.
10. **zsh variable modifiers:** `$VAR:l` is parsed as a modifier. Always use `${VAR}`.
11. **Re-measure levels after swapping any track.** Never carry gains from a previous mix.
12. **Judging on the source frame instead of the delivered crop.** Always measure and review at the final 9:16 crop.
13. **Optimising inside the wrong option** (the wrong song, footage or concept) before ranking options against each other.
14. **"Always do X" rules without an automated check decay.** Turn them into QA gates.
15. **Byte-identical intermediate ≠ step ran.** Verify claims against the actual final artifact.
16. **Config drift:** 24 vs 30 fps defaults in two files. Keep fps and resolution in one config.
17. **New headless Chromium clamps tall viewports.** Check that the bottom of the frame rendered.
18. **Data arriving mid-hook gets filmed** (loading spinners). Use a pre-roll before capture starts and warn when data arrives late.
19. **Templated sameness at volume** looks like AI spam to platforms. Vary structure, pacing and outros.
20. **Copyright is the risk that can end a channel or ad account.** No ripped footage, no commercial songs in exports, never crop watermarks, and keep a licence manifest.
