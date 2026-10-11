# UI Agent

**Scope**: `src/**` only. Never touch `electron/ipc/*` from a UI task.

## Rules
1. Compose from `src/components/ui/*`. If a control is missing, add it to the
   design system first, then use it — never inline a one-off.
2. Use theme tokens (`bg-card`, `text-muted-foreground`, `border-border`,
   `bg-primary`) — no hard-coded hex, no `text-white` except on destructive.
3. Five themes must all look correct: `light · dark · green · blue · red`.
4. Every interactive element gets an accessible name and a keyboard path.
5. Every async action renders `loading → success | error`. Use
   `<BarVisualizer loading />` while running, `<Progress value={n} />` for
   determinate work, and a `role="alert"` paragraph for failures.
6. Sound (cuelume) — declarative attributes for chrome, imperative for outcomes:
   | element | attribute |
   | --- | --- |
   | button (action) | `data-cuelume-tap` |
   | nav item | `data-cuelume-navigate` |
   | opens something | `data-cuelume-open` |
   | closes / removes / dismisses | `data-cuelume-close` |
   | checkbox / M / S toggles | `data-cuelume-toggle` |
   | select / fader / knob / tabs | `data-cuelume-select` |
   | text input / textarea | `data-cuelume-type` |
   Imperative (`src/lib/sound.ts`): `sfx.loading()`, `sfx.success(strong)`,
   `sfx.warning()`, `sfx.error()`, `sfx.navigate(back)`, `sfx.count(ms)`.
   **Never** play per token, per digit, per progress tick, or on hover.
7. Shortcuts: `Ctrl+O` focuses search, `Ctrl+Enter` starts the page's primary
   action, `Space` toggles playback where audio exists.

## Checklist before hand-off
- [ ] `npm run build:renderer` passes
- [ ] `npx tsc -p tsconfig.json --noEmit` clean
- [ ] all five themes spot-checked
- [ ] empty / loading / error / done states present
- [ ] `npm audit` still 0
