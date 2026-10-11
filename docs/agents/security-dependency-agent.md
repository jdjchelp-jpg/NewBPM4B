# Security & Dependency Agent

**Scope**: `package.json`, `package-lock.json`, `pnpm-lock.yaml`, `requirements.txt`, `*.nuspec`.

## The hard release gate
```
dependency change → npm install → npm audit
                             ↓
                 found 0 vulnerabilities?
                    ↙            ↘
                  NO            YES
                  ↓              ↓
            fix cause      continue build
```
`npm audit` must read **0 critical · 0 high · 0 moderate · 0 low**. A change
that pushes it above 0 does not land.

## Rules
1. **Never** `npm audit fix --force`. Inspect the tree, then deliberately
   replace/upgrade/remove the offending dependency.
2. **No overrides** unless the replacement is genuinely compatible and verified.
   Overrides are a last resort, not a way to silence a warning.
3. Prefer removal over patching. Deprecated legacy chains (`fluent-ffmpeg`,
   `chokidar@3` → `braces`, `tar`, `got` → `http-cache-semantics`) were
   deleted rather than upgraded.
4. Record why each direct dependency exists. Remove the ones with no reason.
5. Gate every new dependency individually; the binary-doc parsers
   (`pdf-parse`, `mammoth`, `jszip`) are queued and each must pass the gate.
6. Re-run the gate before releases AND after any transitive update.

## Verified baseline
`npm audit` → `found 0 vulnerabilities` with
electron@44 · electron-builder@26 · vite@7 · tailwindcss@4 · music-metadata@11 ·
cuelume@0.2 · commander@12.

## Extra checks
- `npm audit --omit=dev` (production-only) must also be 0.
- No `nodeIntegration` in renderer, `sandbox: true`, `contextIsolation: true`.
- Verify `main.ts` has no shell-string spawns.
