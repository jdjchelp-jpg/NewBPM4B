# Delimiter Engines

Pure implementation: `electron/ipc/detect.ts` (`detect`, `splitChapters`).
CLI: `bpm4b detect <file>`. Python mirror: `python/bpm4b/engines.py`.

Each engine can be toggled independently. `DEFAULT_ENGINES` enables everything
except custom patterns.

| key | matches | level |
| --- | --- | --- |
| `episodes` | Episode 1 · Epsoide 1 · Ep. 1 · Arc 1 · Installment 2 · Saga I | 1 |
| `chapters` | Chapter 2 Bess · Chapter IV · Chapter One · Part 1 · Section 1.1 | 1 |
| `acts` | Act 1 · Act I · Canto IV | 1 |
| `scenes` | Scene 2 · Scene 2: The Courtyard | 2 (subsection) |
| `volumes` | Volume 1 · Vol. II · Book One · Tome 1 | 0 (top) |
| `days` | Day 1 · Night 3 · Entry 1 · Letter 1 | 1 |
| `numbered` | 1. The Beginning · 01 - Intro · I. Awakening | 1 |
| `classical` | PROLOGUE · EPILOGUE · PREFACE · CONCLUSION · CHAPTER I | 0 |
| `bold` | `**Chapter 2**` · **Episode 1** · `<b>Chapter 3</b>` | 2 |
| `headings` | `# H1` · `## H2` · `<h1>` · `<h2>` | 1+ |
| `cleanupRedundantNumbers` | `Chapter 1: 1. The Awakening` → `Chapter 1: The Awakening` | — |
| `custom[]` | user regex + name | 1 |

## Why toggles matter
A novel written as
```
Chapter 1
Day 1
Chapter 2
Day 2
```
must not produce four chapters. With `days: false`, only `Chapter 1/2` match;
Day lines stay as body text. This is enforced by the toggle loop in `detect`.

## Custom engines
Saved via the Chapter Studio UI. Patterns are validated at add-time; a bad
pattern can never crash detection (matching is wrapped in try/catch and the
engine is skipped).

## Chapter splitting strategy
`splitChapters` runs in order:
1. Engine boundaries — paragraph whose first line matches an active engine.
2. Paragraph block fallback — ~`length/10` chars, clamped to 3 000–30 000.
3. Single chapter — if nothing else applies.

## Tests
`electron/ipc/structure.test.ts` (`npm test`) covers toggle behaviour, typo
tolerance and heading detection. Add a case here for every new engine.
