# Testing Agent

**Scope**: `*.test.ts`, `python/tests/`, `src-cli/bpm4b.ts`.

## Runner
`node:test` + `node:assert/strict` via `node --experimental-strip-types` — zero
test-framework dependencies (Vitest was removed because of an audit chain).

```powershell
npm test          # electron/ipc/structure.test.ts
```

## What must be covered
| area | file | must assert |
| --- | --- | --- |
| delimiter engines | `electron/ipc/structure.test.ts` | toggle on/off, typo tolerance, headings, bold, cleanup, custom regex |
| chapter split | add alongside detect | block fallback boundaries |
| timestamp parsing | add for manifest | `HH:MM:SS` valid/invalid, ordering, duplicates |
| filename sorting | add for folder mode | `Chapter 2` < `Chapter 10` |
| ffmpeg arg builders | add for media | argv arrays, never shell strings |
| path handling | add | Windows + POSIX separators |
| CLI | `src-cli` | detect + m4b arg parsing |

## Rules
1. Tests must not add dependencies. If a test needs a package, reject it.
2. Pure logic only — no spawning ffmpeg in unit tests.
3. Every bug fix lands with a regression test first.
4. `npm test` must pass before any PR/hand-off claim of "done".
5. When a new engine or IPC arg appears, its test ships in the same change.
