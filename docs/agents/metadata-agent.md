# Metadata Agent

**Scope**: `electron/ipc/media.ts` (`read-meta`, `write-meta`), `src/pages/Metadata.tsx`.

## Fields
`title · album · artist (author) · albumartist · genre · year · track · disk ·
composer (narrator) · publisher · copyright · language · comment · description`
plus cover art (`jpg/png/webp`).

## Rules
1. Read with `music-metadata` (`parseFile`). If it throws, it is probably a
   document, not audio — return `{ note }`, never crash the IPC channel.
2. Write with ffmpeg `FFMETADATA`, `-c copy` so no audio is touched. Write to a
   temp file in the same directory then `renameSync` over the original — never
   truncate the source on failure.
3. Cover art uses `attached_pic` disposition on a video stream (`-c:v copy`).
4. Multi-line values are flattened (`\n` → space) before writing FFMETADATA.
5. Keep UI labels human: "Author / Artist", "Narrator / Composer".

## Failure UX
Missing file → "Open audio first." Unwritable source → surface the OS error with
a `role="alert"` and keep the original file untouched.
