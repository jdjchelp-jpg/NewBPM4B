# BPM4B CLI

The BPM4B command-line interface provides document structure detection and splitting, audiobook creation, audio extraction, and audio merging.

The desktop application also has a redesigned interface with separate workspaces for audiobook, audio, book, and chapter tasks. The former **Audiobook Maker** has been removed; its audiobook workflows are now available through focused tools such as **MP3 → M4B**, **Single MP3 + Chapter Manifest**, **Folder → M4B**, and **M4B Chapter Tools**. The web and desktop apps provide the full graphical experience; this package installs the standalone CLI.

## Install

Requires Node.js 22 or later and FFmpeg on `PATH` for audio commands. You can set `FFMPEG_PATH` if FFmpeg is installed in a nonstandard location.

```sh
npm install --global bpm4b
bpm4b --help
```

## Commands

```sh
# Detect document structure and split the document into sections
bpm4b detect book.txt
bpm4b split book.txt

# Create an audiobook from chapter files
bpm4b m4b --input "chapter1.mp3,chapter2.mp3" --output audiobook.m4b --titles "Chapter 1,Chapter 2"

# Add chapter markers to one long audio file
bpm4b m4b --input long.mp3 --output audiobook.m4b --chapters "Opening@00:00:00,Chapter 1@00:25:00" --bitrate 96k

# Extract audio or merge files
bpm4b extract audiobook.m4b extracted.mp3 --bitrate 192k
bpm4b merge --input "part1.mp3,part2.mp3" --output merged.mp3
```

Quote paths and comma-separated arguments containing spaces in your shell. For PowerShell output paths, use an expression such as `"$env:USERPROFILE\Downloads\extracted.mp3"`.

## Links

- Source and desktop/web application: https://github.com/jdjchelp-jpg/NewBPM4B
- Full project documentation: see the repository README.
