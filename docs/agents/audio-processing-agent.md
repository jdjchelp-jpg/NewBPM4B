# Audio Processing Agent

**Scope**: `electron/ipc/media.ts`, `src/lib/audio.ts` (if added), CLI ffmpeg paths.

## Rules
1. **Never build a shell string.** Pass an argv array to `spawn`/`execFile`.
2. **Prefer stream copy.** `-c copy` first; re-encode only when containers or
   codecs disagree. Document every deliberate re-encode with a comment.
3. **Stream, don't buffer.** Use ffmpeg file→file; never read a multi-hour
   audiobook into memory.
4. **Always clean up.** Temp concat lists and FFMETADATA sidecars must be
   deleted in a `finally` block, even on failure.
5. **Progress.** Parse `time=` from stderr against a duration hint and emit
   `bpm4b:progress`. Clamp to 99 until ffmpeg exits 0.
6. **Friendly errors.** Never surface `FFmpeg exited with code 1`. Wrap with
   `friendlyError` so users see a sentence plus expandable technical detail.
7. **ffmpeg discovery.** Honour `FFMPEG_PATH` / `FFPROBE_PATH`, else PATH. If
   missing, message: "Install ffmpeg and ensure it's on PATH (or set
   FFMPEG_PATH)." Cross-platform paths only (`path.join`, no `C:\` literals).

## Command recipes (current)
```
MP3(s)  → M4B  ffmpeg -f concat -safe 0 -i list.txt -i meta.txt \
                -map_metadata 1 -c:a aac -b:a <br> -vn out.m4b
Extract        ffmpeg -i in.m4b -vn <codec args> -y out.<ext>
Merge          ffmpeg -f concat -safe 0 -i list.txt -c copy out.<ext>
                (fallback: same without -c copy)
Write tags     ffmpeg -i in -i meta.txt -map 0 -map_metadata 1 -c copy \
                [-i cover -map 2 -c:v copy -disposition:v:0 attached_pic] out
Durations      ffprobe -v error -show_entries format=duration ... in
                (fallback: parse Duration: from ffmpeg -i stderr)
```

## Tests
Add a unit test for any pure helper (arg builders, duration math, timestamp
parsing). Keep ffmpeg itself out of unit tests; cover it manually.
