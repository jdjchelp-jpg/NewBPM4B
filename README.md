# BPM4B

BPM4B is an audiobook and audio production workspace for the web, Windows/macOS/Linux desktop, and command line. It brings audiobook creation, chapter tools, audio conversion, book creation, and document structure detection into one place.

## A new BPM4B experience

BPM4B has a redesigned interface and a new application structure built around focused workspaces. The former **Audiobook Maker** has been removed; audiobook tasks now live in dedicated tools such as **MP3 → M4B**, **Single MP3 + Chapter Manifest**, **Folder → M4B**, and **M4B Chapter Tools**. This makes each workflow easier to find and gives the app room for more audio, book, and chapter features.

## Features

### Audiobooks

- **MP3 → M4B:** combine chapter audio files into an audiobook, set chapter titles, and tune encoding quality.
- **Single MP3 + Chapter Manifest:** add chapter titles and timestamps to one long recording and create an M4B with chapter markers.
- **Folder → M4B:** select a folder of audio tracks; BPM4B sorts the tracks naturally and uses filenames as chapter titles.
- **M4B Chapter Tools:** inspect and edit embedded chapter titles and times.

### Audio tools

- **Audio Extractor:** extract audio from supported media files and choose output settings.
- **Batch Merge:** join multiple audio files into one output.
- **Format Switcher:** convert supported audio between formats.
- **Metadata Editor:** inspect and update common audio tags, including title, artist, album, and cover art where supported.

### Books and chapters

- **EPUB Creator:** build an EPUB from imported document content.
- **Chapter Studio:** detect chapter and section structure in text documents and split the document into sections.

### Workspace

- Dashboard and tool search
- Job progress, job history, and settings
- Light, dark, and color themes
- Keyboard shortcuts: **Ctrl+O** to search tools and **Ctrl+Enter** to start a page action when supported

## Web app

Start the web development server:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The web app can import local files through the browser's file picker and downloads finished files to your computer. It uses FFmpeg WebAssembly for audio operations that run in the browser; the first use may download roughly 32 MB of encoder assets. Large or very long audio files can exceed browser memory limits, so use the desktop app for those jobs.

## Desktop app

The desktop app uses Electron and runs on Windows, macOS, and Linux. It provides native file dialogs and uses locally installed FFmpeg for media processing.

Run the desktop app during development:

```powershell
npm install
npm run electron:dev
```

Create a packaged desktop build for the current platform:

```powershell
npm run build
```

The desktop media tools require FFmpeg and FFprobe on `PATH`, or the `FFMPEG_PATH` and `FFPROBE_PATH` environment variables.

## Command line

The standalone npm CLI is published as `bpm4b` and requires Node.js 22 or later. Install it globally:

```powershell
npm install --global bpm4b
bpm4b --help
```

Examples:

```powershell
bpm4b detect book.txt
bpm4b split book.txt
bpm4b m4b --input "chapter1.mp3,chapter2.mp3" --output audiobook.m4b --titles "Chapter 1,Chapter 2"
bpm4b m4b --input long.mp3 --output audiobook.m4b --chapters "Opening@00:00:00,Chapter 1@00:25:00" --bitrate 96k
bpm4b extract audiobook.m4b extracted.mp3 --bitrate 192k
bpm4b merge --input "part1.mp3,part2.mp3" --output merged.mp3
```

On Windows PowerShell, use `$env:USERPROFILE` for paths in your home folder. For example:

```powershell
bpm4b extract "C:\Audio\audiobook.m4b" "$env:USERPROFILE\Downloads\extracted.mp3" --bitrate 192k
```

Audio commands require FFmpeg on `PATH`, or set `FFMPEG_PATH`. The CLI also includes document structure detection and splitting commands.

To work on the CLI from this repository instead of installing it globally:

```powershell
npm run cli -- --help
npm run cli -- detect book.txt
```

## Python CLI

The Python package offers the document and audio CLI workflows as `bpm4b`:

```powershell
python -m pip install bpm4b
bpm4b --help
bpm4b detect book.txt --no-days
bpm4b split book.txt
bpm4b m4b -i "chapter1.mp3,chapter2.mp3" -o audiobook.m4b -t "Chapter 1,Chapter 2" -b 128k
bpm4b extract audiobook.m4b extracted.mp3 --bitrate 192k
bpm4b merge -i "part1.mp3,part2.mp3" -o merged.mp3
```

Python 3.9 or later and FFmpeg/FFprobe are required. See [python/README.md](python/README.md) for development and installation details.

## Development and validation

Requirements: Node.js 22+, npm, and FFmpeg/FFprobe for audio processing. Python 3.9+ is needed for the Python package.

```powershell
npm install
npm run electron:dev
npm run test:all
```

`npm run test:all` runs the structure tests, CLI smoke checks, renderer type checking and production build, and Electron TypeScript build. The CLI smoke checks need FFmpeg available.

## Project layout

- `src/` — React interface and workspaces
- `electron/` — desktop main process, native file operations, and media IPC
- `src-cli/` — Node CLI
- `packages/npm-cli/` — standalone npm package source and build configuration
- `python/` — Python CLI package
- `chocolatey/` — Windows package files
- `docs/` — implementation and architecture notes

## Publishing

The npm CLI package is maintained in `packages/npm-cli` and is published manually. The PyPI and desktop release workflows run from GitHub Actions after configuring the PyPI trusted publisher and publishing a GitHub Release. See the repository's GitHub Actions workflows and package READMEs for the current release process.

## License

MIT. See [LICENSE](LICENSE).
