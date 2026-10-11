# BPM4B CLI — Installation & Usage Guide

This document explains how to install and use the BPM4B command-line interface from npm, PyPI, Yarn, and Chocolatey.

## Table of Contents
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Commands Reference](#commands-reference)
- [Examples](#examples)
- [Environment Variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## Installation

### From npm (Node.js ≥ 22)
```bash
# Global install
npm i -g bpm4b

# Or use npx without installing
npx bpm4b --help
```

### From Yarn
```bash
# Global install
yarn global add bpm4b

# Or use yarn dlx without installing
yarn dlx bpm4b --help
```

### From PyPI (Python ≥ 3.9)
```bash
# Install from PyPI
pip install bpm4b

# Or install in development mode from the python/ directory
cd python
pip install -e .
```

### From Chocolatey (Windows)
```bash
# Install from Chocolatey
choco install bpm4b

# Or build and install locally
cd chocolatey/tools
choco pack bpm4b.nuspec --version 1.0.0
choco install bpm4b --source="."
```

### From Source (Development)
```bash
# Clone and build
git clone https://github.com/yourusername/bpm4b.git
cd bpm4b
npm install
npm run build:electron
npm run build:renderer

# Run CLI directly
npm run cli -- --help
```

---

## Quick Start

```bash
# See all available commands
bpm4b --help

# Detect document structure
bpm4b detect book.txt --no-days

# Split document into chapters (JSON output)
bpm4b split book.txt

# Create M4B audiobook from multiple audio files
bpm4b m4b -i "chapter1.mp3,chapter2.mp3" -o audiobook.m4b -t "Chapter 1,Chapter 2" -b 128k

# Extract/convert audio
bpm4b extract input.m4b output.mp3 --bitrate 192k

# Merge audio files
bpm4b merge -i "part1.mp3,part2.mp3" -o merged.mp3
```

---

## Commands Reference

### `detect <file>` — Detect Document Structure
Analyzes a text document and finds chapter/section boundaries using delimiter engines.

```bash
bpm4b detect <file> [options]

Options:
  --no-days         Disable Days/Journals engine
  --no-episodes     Disable Episodes engine
  --no-chapters     Disable Chapters engine
  --no-headings     Disable Markdown/HTML headings
  --no-bold         Disable bold standalone lines
  --no-cleanup      Keep redundant leading numbers
```

### `split <file>` — Split Document into Chapters
Outputs JSON array of chapters with titles and content.

```bash
bpm4b split <file>

Output: JSON array of { title: string; content: string } objects
```

### `m4b` — Create M4B Audiobook
Concatenates audio files into an M4B with chapter markers.

```bash
bpm4b m4b [options]

Required:
  -i, --input <files>     Comma-separated input audio files
  -o, --output <file>     Output .m4b path

Options:
  -b, --bitrate <br>     Audio bitrate (default: 128k)
  -t, --titles <names>    Comma-separated chapter titles (one per input)
```

### `extract <input> <output>` — Extract/Convert Audio
Converts audio between formats.

```bash
bpm4b extract <input> <output> [options]

Options:
  --bitrate <br>     Bitrate for lossy outputs (default: 128k)

Supported output formats: .mp3, .m4a, .aac, .ogg, .opus, .wav, .flac, .alac
```

### `merge` — Concatenate Audio Files
Combines multiple audio files into one (stream-copy when safe).

```bash
bpm4b merge [options]

Required:
  -i, --input <files>     Comma-separated input audio files
  -o, --output <file>     Output file path
```

---

## Examples

### Create an Audiobook from a Folder of MP3s
```bash
# Using the CLI directly with a folder scan
bpm4b m4b -i "chapter01.mp3,chapter02.mp3,chapter03.mp3" \
  -o mybook.m4b \
  -t "Prologue,Chapter 1,Chapter 2" \
  -b 128k
```

### Convert Audio Formats
```bash
# M4B to MP3
bpm4b extract book.m4b book.mp3 --bitrate 192k

# MP3 to M4A
bpm4b extract input.mp3 output.m4a --bitrate 256k

# Lossless FLAC extraction
bpm4b extract input.m4b output.flac
```

### Merge Multiple Audio Files
```bash
# Lossless merge (stream copy)
bpm4b merge -i "part1.mp3,part2.mp3,part3.mp3" -o complete.mp3

# Will re-encode if codecs differ
```

### Document Processing
```bash
# Detect structure in a manuscript
bpm4b detect manuscript.txt --no-days --no-episodes

# Get JSON chapters for EPUB creation
bpm4b split manuscript.txt > chapters.json

# With Python CLI
python -m bpm4b.cli detect manuscript.txt --no-days
python -m bpm4b.cli split manuscript.txt
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FFMPEG_PATH` | Path to ffmpeg binary | `ffmpeg` (from PATH) |
| `FFPROBE_PATH` | Path to ffprobe binary | `ffprobe` (from PATH) |

```bash
# Windows example
set FFMPEG_PATH=C:\ffmpeg\bin\ffmpeg.exe
set FFPROBE_PATH=C:\ffmpeg\bin\ffprobe.exe

# Linux/macOS example
export FFMPEG_PATH=/usr/local/bin/ffmpeg
export FFPROBE_PATH=/usr/local/bin/ffprobe
```

---

## Requirements

- **ffmpeg + ffprobe** must be installed and on PATH (or set via environment variables)
- **Node.js ≥ 22** for npm/Yarn versions
- **Python ≥ 3.9** for PyPI version
- **Windows** for Chocolatey package

### Installing ffmpeg
- **Windows**: Download from https://ffmpeg.org/download.html or `choco install ffmpeg`
- **macOS**: `brew install ffmpeg`
- **Linux**: `apt install ffmpeg` / `dnf install ffmpeg` / `pacman -S ffmpeg`

---

## Troubleshooting

### "ffmpeg not found"
Ensure ffmpeg is installed and on PATH, or set `FFMPEG_PATH` environment variable.

### "Invalid timestamp format"
Use HH:MM:SS format (e.g., `01:30:45` or `90:00` for 90 minutes).

### "No sections matched"
Try disabling some delimiter engines with `--no-<engine>` flags, or check that your document has recognizable chapter markers.

### Permission errors on install
```bash
# npm
npm i -g bpm4b --unsafe-perm=true

# Python
pip install --user bpm4b
```

### Audio files not found
Use absolute paths or ensure files are in the current working directory.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025 | Initial release with detect, split, m4b, extract, merge commands |

---

## Links

- **npm**: https://www.npmjs.com/package/bpm4b
- **PyPI**: https://pypi.org/project/bpm4b/
- **Yarn**: https://yarnpkg.com/package/bpm4b
- **Chocolatey**: https://community.chocolatey.org/packages/bpm4b
- **GitHub**: https://github.com/yourusername/bpm4b
- **Documentation**: https://github.com/yourusername/bpm4b/docs

---

## License

MIT License — see LICENSE file for details.