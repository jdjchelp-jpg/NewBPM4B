"""Parity tests: Python engines must behave like electron/ipc/detect.ts."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from bpm4b import Engines, detect, split_chapters, cleanup_title  # noqa: E402


def test_days_engine_can_be_disabled():
    text = "Chapter 1\nDay 1\nChapter 2\nDay 2"
    all_on = [d["line"] for d in detect(text)]
    assert all_on == ["Chapter 1", "Day 1", "Chapter 2", "Day 2"]
    days_off = [d["line"] for d in detect(text, Engines(days=False))]
    assert days_off == ["Chapter 1", "Chapter 2"]


def test_epsoide_typo_tolerated():
    out = detect("Epsoide 1")
    assert out and out[0]["type"] == "episodes"


def test_redundant_number_cleanup():
    assert cleanup_title("Chapter 1: 1. The Awakening") == "Chapter 1: The Awakening"
    kept = cleanup_title("Chapter 1: 1. The Awakening", enabled=False)
    assert kept == "Chapter 1: 1. The Awakening"


def test_headings_and_bold_levels():
    out = detect("# Chapter 1\n**Episode 1**\n<b>Chapter 3</b>")
    assert [d["type"] for d in out] == ["heading", "bold-line", "bold-line"]
    assert out[1]["level"] == 2


def test_custom_regex_and_validation():
    bad = detect("anything", Engines(custom=[]))  # no crash on empty
    assert isinstance(bad, list)
    good = detect("Part 2 somewhere", Engines(
        chapters=False, days=False, episodes=False, numbered=False,
        classical=False,
        custom=[__import__("bpm4b").CustomEngine("parts", r"^Part\s+\d+")],
    ))
    assert good and good[0]["type"] == "custom:parts"


def test_split_chapters_engine_boundary():
    body1 = "Body text that is long enough to be kept as real chapter content by the engine. " * 2
    body2 = "More body text that is long enough to be kept as real content here too. " * 2
    text = f"Chapter 1\n\n{body1}\n\nChapter 2\n\n{body2}"
    chapters = split_chapters(text, Engines())
    assert len(chapters) == 2
    assert chapters[0]["title"] == "Chapter 1"
