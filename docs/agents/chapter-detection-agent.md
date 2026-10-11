# Chapter Detection Agent

**Scope**: `electron/ipc/detect.ts`, `python/bpm4b/engines.py`, `docs/delimiter-engines/`.

## Rules
1. `detect.ts` must stay **pure** — no Electron, no filesystem, no node builtins.
   The CLI, Python port and tests all import it.
2. Every engine is independently toggleable. Defaults live in `DEFAULT_ENGINES`.
3. Adding an engine means updating **all** of:
   - `RX` (or the special-case branch) in `detect.ts`
   - `EngineState` type + `DEFAULT_ENGINES`
   - the Chapter Studio `ENGINES` table in `src/pages/Chapters.tsx`
   - the EPUB Creator table in `src/pages/Epub.tsx`
   - `docs/delimiter-engines/README.md`
   - a test in `structure.test.ts`
4. Hierarchy levels are contractual: volumes/classical = 0, chapters/episodes/
   acts/days/numbered/custom = 1, scenes/bold = 2, headings = 1+ (by `#` count).
5. Typos are features: `Epsoide`, `epsiode`, `episdoe` must match. Add new
   variants to the `episodes` pattern rather than a separate engine.
6. Custom regex must never crash detection — wrap matching in try/catch and
   validate at save time in the UI.
7. Redundant-number cleanup runs only when `cleanupRedundantNumbers` is true.

## Test contract
`npm test` must pass. Cover: disabled-engine behaviour, typo tolerance, heading
and bold detection, and one case per new pattern.
