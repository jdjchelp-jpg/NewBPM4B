# BPM4B — Architecture

BPM4B is a ground-up audiobook & audio-production workspace. This repo is the
**desktop (Electron) + shared UI** app; the Node web and Python/PyPI web
variants reuse the same design tokens and Behavioural contracts described here.

## Layout (target monorepo)
```
BPM4B/
├── apps/            desktop (this repo root) · web-node · web-python
├── packages/        ui · theme · audio · chapters · metadata · formats · jobs
├── docs/            architecture · ui · delimiter-engines · agents
└── cli/             npm · pypi · choco packaging
```
The desktop app currently hosts the shared code inline under `src/` and
`electron/`; extraction into `packages/*` is a mechanical move that must not
change any public import path (`@/…`).

## Runtime split
| Layer | Path | Runs in | Notes |
| --- | --- | --- | --- |
| Shell | `electron/main.ts` | main | windows, dialogs, lifecycle |
| Bridge | `electron/preload.ts` | preload | `contextBridge` only, no node in renderer |
| IPC | `electron/ipc/*.ts` | main | validated inputs, never shell strings |
| UI | `src/**` | renderer | React 18 + Tailwind 4 |
| CLI | `src-cli/bpm4b.ts` | node | `node --experimental-strip-types` |
| Python | `python/bpm4b` | CPython | mirrors CLI, shares engine spec |

## Security rules (non-negotiable)
- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
- Renderer never spawns processes. All ffmpeg/ffprobe calls live in `electron/ipc`.
- IPC handlers take structured data, not command lines. Arrays are passed to
  `spawn`/`execFile`, never concatenated into a shell string.
- Menu/regex input is validated before use (`new RegExp` in try/catch).

## Processing
Media flows through ffmpeg with stream-copy preferred:
1. MP3(s) → M4B: concat demuxer + `FFMETADATA` chapter sidecar → AAC.
2. Extract: `-vn` + codec args, `-c:a copy` when the container allows.
3. Merge: concat + `-c copy` first, re-encode only if codecs disagree.
4. Metadata write: copy streams, remap `FFMETADATA`, optional attached cover.

Progress is parsed from ffmpeg stderr (`time=`) and pushed to the renderer over
the `bpm4b:progress` channel.

## Chapters
`electron/ipc/detect.ts` is pure and Electron-free so the CLI, Python port and
tests can all import the same behaviour. Engines, hierarchy levels and the
redundant-number cleanup are documented in `docs/delimiter-engines/`.

## Dependency gate
Every dependency change must leave `npm audit` at **0 vulnerabilities** before
the build is considered valid. See `docs/agents/security-dependency-agent.md`.
