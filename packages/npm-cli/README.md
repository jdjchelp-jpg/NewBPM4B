# BPM4B CLI

Install with `npm install --global bpm4b` (Node.js 22+). The audio commands require FFmpeg on your PATH, or set `FFMPEG_PATH`.

```sh
bpm4b --help
bpm4b detect book.txt
bpm4b split book.txt
bpm4b m4b --input chapter1.mp3,chapter2.mp3 --output audiobook.m4b --titles "Chapter 1,Chapter 2"
bpm4b extract audiobook.m4b extracted.mp3 --bitrate 192k
bpm4b merge --input part1.mp3,part2.mp3 --output merged.mp3
```

The published command is a lightweight Node CLI. The BPM4B web and desktop apps are distributed from the project GitHub releases.
