"""BPM4B delimiter engines — Python mirror of electron/ipc/detect.ts.

Keep this file behaviourally identical to the TypeScript original: the same
patterns, same levels, same cleanup, same defaults. Any change here must land
in both files plus a test (see docs/agents/chapter-detection-agent.md).
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field, asdict
from typing import Iterable, List, Optional


@dataclass
class CustomEngine:
    name: str
    pattern: str


@dataclass
class Engines:
    chapters: bool = True
    episodes: bool = True
    acts: bool = True
    scenes: bool = True
    volumes: bool = True
    days: bool = True
    numbered: bool = True
    classical: bool = True
    headings: bool = True
    bold: bool = True
    cleanup_redundant_numbers: bool = True
    custom: List[CustomEngine] = field(default_factory=list)


RX = {
    "episodes": re.compile(r"^(episode|epsoide|epsiode|episdoe|ep\.?|arc|installment|saga)\s+[ivxlcdm\d]+", re.I),
    "chapters": re.compile(r"^(chapter|part|section)\s+[\w\d.\s:\-\u2014]+", re.I),
    "acts": re.compile(r"^(act|canto)\s+[ivxlcdm\d]+", re.I),
    "volumes": re.compile(r"^(volume|vol\.?|book|tome)\s+[\w\d]+", re.I),
    "days": re.compile(r"^(day|night|entry|letter|log)\s+\d+", re.I),
    "numbered": re.compile(r"^(\d{1,3}\s*[-.:]\s+.+|[ivxlcdm]+\.\s+.+)", re.I),
    "classical": re.compile(r"^(prologue|epilogue|preface|conclusion|foreword|afterword|introduction|interlude|appendix)", re.I),
}
CLASSICAL_UPPER = re.compile(r"^(PROLOGUE|EPILOGUE|PREFACE|CONCLUSION|CHAPTER\s+[IVXLCDM\d]+|EPISODE\s+\d+)$")

_CLEANUP = re.compile(r"^((?:chapter|part|episode|section)\s+\S+[:\s\-\u2014]+)\d{1,3}\s*[-.:]\s+", re.I)

ORDER = ["volumes", "episodes", "chapters", "acts", "days", "numbered", "classical"]


def cleanup_title(title: str, enabled: bool = True) -> str:
    """Drop a redundant leading number from a subtitle.

    "Chapter 1: 1. The Awakening" -> "Chapter 1: The Awakening"
    """
    if not enabled:
        return title
    return _CLEANUP.sub(r"\1", title).strip()


def _custom_matches(line: str, engines: Engines) -> Optional[dict]:
    for c in engines.custom:
        try:
            if re.search(c.pattern, line, re.I):
                return {"line": line, "title": cleanup_title(line, engines.cleanup_redundant_numbers),
                        "type": f"custom:{c.name}", "level": 1}
        except re.error:
            continue
    return None


def detect(text: str, engines: Optional[Engines] = None) -> List[dict]:
    """Return detected sections as dicts: line, title, type, level."""
    e = engines or Engines()
    out: List[dict] = []
    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            continue
        m = _custom_matches(line, e)
        if m:
            out.append(m)
            continue
        if e.headings and (re.match(r"^#{1,6}\s+", line) or re.match(r"^<h[1-6][^>]*>.+</h[1-6]>$", line, re.I)):
            hashes = re.match(r"^#+", line)
            level = min(6, len(hashes.group())) if hashes else 1
            title = re.sub(r"^#{1,6}\s+", "", line)
            title = re.sub(r"</?h[1-6][^>]*>", "", title, flags=re.I)
            out.append({"line": line, "title": cleanup_title(title, e.cleanup_redundant_numbers), "type": "heading", "level": level})
            continue
        if e.bold and (line.startswith("**") and line.endswith("**") or re.match(r"^<b>.+</b>$", line, re.I)):
            t = line.strip("*").strip()
            t = re.sub(r"</?b>", "", t, flags=re.I)
            out.append({"line": line, "title": cleanup_title(t, e.cleanup_redundant_numbers), "type": "bold-line", "level": 2})
            continue
        hit = None
        for key in ORDER:
            if key == "acts" and not (e.acts or e.scenes):
                continue
            if getattr(e, key, True) and RX[key].search(line):
                hit = key
                break
        if hit is None and e.classical and CLASSICAL_UPPER.match(line):
            hit = "classical"
        if hit:
            level = 0 if hit in ("volumes", "classical") else 1
            out.append({"line": line, "title": cleanup_title(line, e.cleanup_redundant_numbers), "type": hit, "level": level})
    return out


def split_chapters(text: str, engines: Optional[Engines] = None) -> List[dict]:
    """Split into {title, content}: engine boundaries, then paragraph blocks."""
    e = engines or Engines()
    marks = {d["line"] for d in detect(text, e)}
    paras = re.split(r"\n{2,}", text)
    out: List[dict] = []
    title: Optional[str] = None
    buf: List[str] = []

    def flush() -> None:
        nonlocal title, buf
        content = "\n\n".join(buf).strip()
        if len(content) > 80:
            out.append({"title": title or f"Chapter {len(out) + 1}", "content": content})

    for para in paras:
        first = (para.split("\n") or [""])[0].strip()
        if first in marks or para.strip() in marks:
            flush()
            title = first or para.strip()[:80]
            buf = []
        else:
            buf.append(para)
    flush()
    if len(out) >= 2:
        return out

    target = min(30000, max(3000, len(text) // 10))
    blocks: List[dict] = []
    cur, n = "", 1
    for para in paras:
        if cur and len(cur) + len(para) > target:
            blocks.append({"title": f"Chapter {n}", "content": cur.strip()})
            n += 1
            cur = para
        else:
            cur += ("\n\n" if cur else "") + para
    if cur.strip():
        blocks.append({"title": f"Chapter {n}", "content": cur.strip()})
    return blocks or [{"title": "Chapter 1", "content": text}]

