# BPM4B Python CLI

Python implementation of the BPM4B delimiter engines + ffmpeg CLI commands.

## Install

```bash
pip install bpm4b
```

## Commands

```bash
# Detect document structure
bpm4b detect book.txt --no-days

# Split into chapters (JSON)
bpm4b split book.txt

# Create M4B audiobook
bpm4b m4b -i "ch1.mp3,ch2.mp3" -o book.m4b -t "Chapter 1,Chapter 2" -b 128k

# Extract/convert audio
bpm4b extract input.m4b output.mp3 --bitrate 192k

# Merge audio files
bpm4b merge -i "p1.mp3,p2.mp3" -o merged.mp3
```

## Requirements

- Python ≥ 3.9
- ffmpeg + ffprobe on PATH (or `FFMPEG_PATH` / `FFPROBE_PATH`)

## Development

```bash
cd python
pip install -e .[dev]
python -m pytest
python -m build  # produces dist/*.whl and dist/*.tar.gz
```

## Parity with Node CLI

This package mirrors `src-cli/bpm4b.ts` — same commands, same engines, same output.