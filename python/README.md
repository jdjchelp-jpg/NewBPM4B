# BPM4B Python CLI

The BPM4B Python package provides document structure detection and splitting, audiobook creation, audio extraction, and audio merging from the command line. Audio commands use FFmpeg.

BPM4B's web and desktop apps have a redesigned interface with dedicated workspaces for audiobook, audio, book, and chapter tasks. The former **Audiobook Maker** has been removed; audiobook creation is now handled by focused tools such as **MP3 → M4B**, **Single MP3 + Chapter Manifest**, **Folder → M4B**, and **M4B Chapter Tools**. This Python package is the CLI edition; see the repository README for the graphical apps.

## Install

```bash
python -m pip install bpm4b
bpm4b --help
```

Requirements: Python 3.9 or later and FFmpeg/FFprobe on `PATH`. Set `FFMPEG_PATH` or `FFPROBE_PATH` if they are installed in a nonstandard location.

## Commands

```bash
# Detect document structure and split a document into sections
bpm4b detect book.txt --no-days
bpm4b split book.txt

# Create an M4B from chapter audio files
bpm4b m4b -i "chapter1.mp3,chapter2.mp3" -o audiobook.m4b -t "Chapter 1,Chapter 2" -b 128k

# Extract audio or merge files
bpm4b extract audiobook.m4b extracted.mp3 --bitrate 192k
bpm4b merge -i "part1.mp3,part2.mp3" -o merged.mp3
```

## Development

```bash
cd python
python -m pip install -e .[dev]
python tests/run.py
python -m build
```

The Python CLI shares the document structure and audio workflows with the Node CLI. See the repository's `src-cli/` and `electron/ipc/` directories for the application implementations.
