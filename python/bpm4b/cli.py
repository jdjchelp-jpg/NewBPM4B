"""bpm4b CLI — mirrors src-cli/bpm4b.ts (detect / split / m4b / extract / merge / web)."""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import webbrowser
from pathlib import Path

from .engines import Engines, detect, split_chapters

FFMPEG = os.environ.get("FFMPEG_PATH", "ffmpeg")


def _ff(args: list[str]) -> int:
    if shutil.which(FFMPEG) is None:
        raise SystemExit("ffmpeg not found — install it and put it on PATH (or set FFMPEG_PATH).")
    return subprocess.run([FFMPEG, *args], check=False).returncode


def _duration(path: str) -> float:
    try:
        out = subprocess.run([FFMPEG, "-i", path], capture_output=True, text=True, errors="replace")
        m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", out.stderr or "")
        if m:
            return int(m[1]) * 3600 + int(m[2]) * 60 + float(m[3])
    except OSError:
        pass
    return 0.0


def _parse_timestamp(ts: str) -> float:
    """Parse HH:MM:SS or MM:SS or SS timestamp to seconds."""
    parts = ts.strip().split(":")
    if len(parts) == 3:
        return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
    elif len(parts) == 2:
        return int(parts[0]) * 60 + float(parts[1])
    else:
        return float(parts[0])


def _load_chapters_from_manifest(manifest_path: str) -> list[tuple[float, str]]:
    """Load chapters from a manifest file.
    
    Format: each line = "Chapter Title HH:MM:SS" or "Chapter Title MM:SS" or "Chapter Title SS"
    Example:
        Chapter 1 - The Life Of BPM4B 0:00
        Chapter 2 - The new package 0:15:40
    """
    chapters = []
    with open(manifest_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            # Split from the right to find the timestamp
            parts = line.rsplit(" ", 1)
            if len(parts) == 2:
                title, ts = parts
                try:
                    start = _parse_timestamp(ts)
                    chapters.append((start, title.strip()))
                except ValueError:
                    pass
    return chapters


def cmd_detect(args: argparse.Namespace) -> int:
    text = Path(args.file).read_text(encoding="utf-8", errors="replace")
    e = Engines(days=not args.no_days, episodes=not args.no_episodes,
                chapters=not args.no_chapters, headings=not args.no_headings,
                bold=not args.no_bold,
                cleanup_redundant_numbers=not args.no_cleanup)
    hits = detect(text, e)
    if not hits:
        print("No sections matched.")
        return 1
    for d in hits:
        print("  " * max(0, d["level"]) + f"[{d['type']}] {d['title']}")
    print(f"\n{len(hits)} section(s).")
    return 0


def cmd_split(args: argparse.Namespace) -> int:
    text = Path(args.file).read_text(encoding="utf-8", errors="replace")
    chapters = split_chapters(text, Engines())
    print(json.dumps(chapters, indent=2, ensure_ascii=False))
    print(f"{len(chapters)} chapter(s).", file=sys.stderr)
    return 0


def cmd_web(args: argparse.Namespace) -> int:
    """Launch the BPM4B web interface."""
    # Default to the Electron app's dev server or production URL
    url = args.url or "http://localhost:5173"
    print(f"Opening BPM4B web interface at {url}...")
    try:
        webbrowser.open(url)
        print("Opened in browser. If it didn't open, visit the URL manually.")
    except Exception as e:
        print(f"Could not open browser: {e}")
        print(f"Please visit {url} manually.")
    return 0


def cmd_m4b(args: argparse.Namespace) -> int:
    inputs = [s for s in args.input.split(",") if s.strip()]
    if not inputs:
        raise SystemExit("Need at least one input file.")
    
    # Load chapters from manifest file if provided
    chapters = []
    if args.manifest:
        chapters = _load_chapters_from_manifest(args.manifest)
        if not chapters:
            raise SystemExit(f"No valid chapters found in manifest: {args.manifest}")
    elif args.titles:
        # Use titles with auto-detected durations
        titles = [t.strip() for t in args.titles.split(",")]
        acc, rows = 0.0, []
        for i, f in enumerate(inputs):
            rows.append((acc, titles[i] if i < len(titles) else f"Chapter {i+1}"))
            acc += _duration(f)
        for i, (start, title) in enumerate(rows):
            end = rows[i + 1][0] if i + 1 < len(rows) else start + 3600
            chapters.append((start, title))
    
    with tempfile.TemporaryDirectory() as tmp:
        lst = Path(tmp, "list.txt")
        lst.write_text("\n".join(f"file '{f}'" for f in inputs), encoding="utf-8")
        meta = Path(tmp, "meta.txt")
        body = ";FFMETADATA1\n"
        if chapters:
            # Sort chapters by start time
            chapters.sort(key=lambda x: x[0])
            for i, (start, title) in enumerate(chapters):
                end = chapters[i + 1][0] if i + 1 < len(chapters) else start + 3600
                body += (f"[CHAPTER]\nTIMEBASE=1/1000\nSTART={round(start*1000)}\n"
                         f"END={round(end*1000)}\ntitle={title}\n")
        meta.write_text(body, encoding="utf-8")
        rc = _ff(["-f", "concat", "-safe", "0", "-i", str(lst), "-i", str(meta),
                  "-map_metadata", "1", "-c:a", "aac", "-b:a", args.bitrate, "-vn",
                  "-y", args.output])
    if rc == 0:
        print(f"M4B written: {args.output}")
    return rc


def cmd_extract(args: argparse.Namespace) -> int:
    ext = Path(args.output).suffix.lower()
    codec = {
        ".mp3": ["-c:a", "libmp3lame", "-b:a", args.bitrate],
        ".m4a": ["-c:a", "aac", "-b:a", args.bitrate],
        ".aac": ["-c:a", "aac", "-b:a", args.bitrate],
        ".ogg": ["-c:a", "libvorbis", "-q:a", "5"],
        ".wav": ["-c:a", "pcm_s16le"],
        ".flac": ["-c:a", "flac"],
    }.get(ext, ["-c:a", "copy"])
    rc = _ff(["-i", args.input, "-vn", *codec, "-y", args.output])
    if rc == 0:
        print(f"Extracted: {args.output}")
    return rc


def cmd_merge(args: argparse.Namespace) -> int:
    inputs = [s for s in args.input.split(",") if s.strip()]
    if len(inputs) < 2:
        raise SystemExit("Need at least two inputs to merge.")
    with tempfile.TemporaryDirectory() as tmp:
        lst = Path(tmp, "list.txt")
        lst.write_text("\n".join(f"file '{f}'" for f in inputs), encoding="utf-8")
        rc = _ff(["-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy", "-y", args.output])
        if rc != 0:
            rc = _ff(["-f", "concat", "-safe", "0", "-i", str(lst), "-y", args.output])
    if rc == 0:
        print(f"Merged: {args.output}")
    return rc


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="bpm4b", description="BPM4B — audiobook & audio workspace CLI")
    ap.add_argument("--version", action="version", version="bpm4b 14.0.0")
    sub = ap.add_subparsers(dest="cmd", required=True)

    d = sub.add_parser("detect", help="Detect document structure")
    d.add_argument("file")
    d.add_argument("--no-days", action="store_true")
    d.add_argument("--no-episodes", action="store_true")
    d.add_argument("--no-chapters", action="store_true")
    d.add_argument("--no-headings", action="store_true")
    d.add_argument("--no-bold", action="store_true")
    d.add_argument("--no-cleanup", action="store_true")
    d.set_defaults(func=cmd_detect)

    s = sub.add_parser("split", help="Split a document into chapters (JSON)")
    s.add_argument("file")
    s.set_defaults(func=cmd_split)

    m = sub.add_parser("m4b", help="Concatenate audio into an M4B with chapters")
    m.add_argument("-i", "--input", required=True, help="comma-separated inputs")
    m.add_argument("-o", "--output", required=True)
    m.add_argument("-b", "--bitrate", default="128k")
    m.add_argument("-t", "--titles", help="comma-separated chapter titles")
    m.add_argument("-m", "--manifest", help="path to chapter manifest file (one 'Title HH:MM:SS' per line)")
    m.set_defaults(func=cmd_m4b)

    w = sub.add_parser("web", help="Open BPM4B web interface in browser")
    w.add_argument("--url", default="http://localhost:5173", help="web interface URL")
    w.set_defaults(func=cmd_web)

    x = sub.add_parser("extract", help="Extract/convert audio")
    x.add_argument("input")
    x.add_argument("output")
    x.add_argument("--bitrate", default="128k")
    x.set_defaults(func=cmd_extract)

    g = sub.add_parser("merge", help="Concatenate audio files")
    g.add_argument("-i", "--input", required=True, help="comma-separated inputs")
    g.add_argument("-o", "--output", required=True)
    g.set_defaults(func=cmd_merge)

    args = ap.parse_args(argv)
    return int(args.func(args) or 0)


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())

