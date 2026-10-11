# BPM4B 1.0 — ground-up rewrite

Audiobook & audio-production workspace. New architecture, new design system —
not an extension of the previous BPM4B.

```
apps/desktop  (this repo)  Electron + Vite + React 18 + Tailwind 4
packages/…    (planned)    shared ui · theme · audio · chapters · metadata · formats · jobs
python/       PyPI CLI     identical delimiter engines + ffmpeg CLI
chocolatey/   choco pkg    Windows installer wrapper
docs/         architecture · ui · delimiter-engines · agents
```

## Quick start
```powershell
npm install
npm run build:electron     # emits dist-electron/main.js + preload.js
npm run electron:dev       # vite (port 5173, strict) + electron
```
This opens BPM4B as a native Electron desktop window. For a packaged installer,
use `npm run build`.
Electron loads Vite's dev URL on **5173**. If a previous Vite is still holding
the port, `strictPort` fails loudly instead of drifting to 5174:
```powershell
netstat -ano | findstr :5173
taskkill /PID <pid> /F
```

## Quality gates (all must pass)
| gate | command | status |
| --- | --- | --- |
| vulnerabilities | `npm audit` | ✅ 0 advisories |
| unit tests | `npm test` | ✅ 2/2 |
| electron types | `npm run build:electron` | ✅ |
| renderer types | `npx tsc -p tsconfig.json --noEmit` | ✅ |
| python parity | `cd python && python tests/run.py` | ✅ 6/6 |

## Navigation
```
Dashboard
├── Audiobooks · MP3→M4B · Single MP3+Manifest · Folder→M4B · M4B Chapter Tools
├── Audio · Extractor · Batch Merge · Format Switcher · Metadata Editor
├── Books · EPUB Creator
├── Studio · Chapter Studio (delimiter engines)
└── Jobs · History · Settings
```

**Themes**: `light · dark · green · blue · red` — one token set, five values.

## CLI (npm)
```powershell
npm run cli -- --help
npm run cli -- detect book.txt --no-days
npm run cli -- split book.txt
npm run cli -- m4b  -i "a.mp3,b.mp3" -o out.m4b -t "Chapter 1,Chapter 2"
npm run cli -- m4b -i "long.mp3" -o audiobook.m4b -c "Opening@00:00:00,Chapter 1@00:25:00" -b 96k
npm run cli -- extract book.m4b out.mp3 --bitrate 192k
npm run cli -- merge -i "p1.mp3,p2.mp3" -o one.mp3
```

Link the local CLI so you can use `bpm4b <command>` directly in a terminal:
```powershell
npm link
bpm4b --help
bpm4b detect sample-book-10-chapters-500-words.txt
```

## Full validation run
```powershell
npm run test:all
```
This runs the unit tests, a CLI smoke run (help, version, detect, split, both
M4B chapter modes, extraction, and merge using generated short audio), renderer
type checking, and both renderer and desktop builds. Native FFmpeg must be on
`PATH` (or set `FFMPEG_PATH`) for the CLI smoke run. Launch the desktop app with
`npm run electron:dev`.

## Publishing to npm, PyPI, and desktop platforms

The existing public `bpm4b` packages are already at npm 12 and PyPI 13. This
rewrite advances both streams to **14.0.0**. Before creating the release:

1. For npm, build and publish the CLI package manually from `packages/npm-cli`:
   sync `src-cli/bpm4b.ts` and `electron/ipc/detect.ts` into that directory,
   run `npm run build`, check with `npm pack --dry-run`, then run `npm login`
   and `npm publish --access public`. The package is version 14.0.0.
2. Add a PyPI trusted publisher for project `bpm4b`: owner `jdjchelp-jpg`,
   repository `NewBPM4B`, workflow filename `pypi-publish.yml`. Leave the
   environment blank; this workflow does not set one.
3. Push this repository to GitHub, create tag `v14.0.0`, and publish a GitHub
   Release for that tag. That release runs the PyPI workflow and builds Windows
   (NSIS), macOS (DMG), and Linux (AppImage) desktop installers. The desktop
   workflow attaches those installers to the GitHub Release.

Check the Actions tab for the release and packaging jobs before sharing it.
To publish the Windows installer through Chocolatey too, configure repository
variable `PUBLISH_CHOCOLATEY=true` and secret `CHOCOLATEY_API_KEY` first.

To test the npm CLI locally before publishing:
```powershell
Copy-Item ..\..\src-cli\bpm4b.ts .\src-cli\bpm4b.ts -Force
Copy-Item ..\..\electron\ipc\detect.ts .\electron\ipc\detect.ts -Force
npm run build
node .\dist\launcher.mjs --help
npm pack --dry-run
```

Regenerate platform icons after replacing `BPM4B Icon.png` with:
```powershell
node build-resources/generate-icons.mjs
```

`m4b --chapters` (or `-c`) accepts `Title@HH:MM:SS` entries for one long audio
file. The web version uses a bundled FFmpeg WebAssembly encoder and downloads
the M4B locally; its initial encoder assets are about 32 MB. Electron and CLI
use the installed native FFmpeg. Browser memory limits make desktop preferable
for very long audiobooks.

## CLI (PyPI)
```powershell
cd python
python tests\run.py
python -m bpm4b.cli --help
python -m bpm4b.cli detect ..\tmp-test.txt --no-days
pip install -e .          # then: bpm4b --help
```

## CLI (Chocolatey)
```powershell
cd chocolatey\tools
choco pack bpm4b.nuspec --version 1.0.0
# choco push bpm4b.1.0.0.nupkg --source https://push.chocolatey.org/
```

## Sound (cuelume)
Declarative attributes on chrome, imperative for outcomes — one cue per action.
See `docs/agents/ui-agent.md`.

## Docs for coding agents
`docs/agents/` ships with the repo so future agents do not rediscover the
system: `ui-agent.md`, `audio-processing-agent.md`, `chapter-detection-agent.md`,
`metadata-agent.md`, `epub-agent.md`, `testing-agent.md`,
`security-dependency-agent.md`.

## Requirements
ffmpeg + ffprobe on PATH (or `FFMPEG_PATH` / `FFMPROBE_PATH`). Node ≥ 22,
Python ≥ 3.9 for the PyPI CLI.
