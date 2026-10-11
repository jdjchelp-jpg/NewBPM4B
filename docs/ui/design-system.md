# BPM4B UI Design System

One component system, five themes. Never style a screen independently —
compose from `src/components/ui/*`.

## Tokens
CSS variables on `[data-theme=…]` in `src/index.css`, exposed to Tailwind 4 via
`@theme inline`:
`background · foreground · card · primary · secondary · muted · accent ·
border · input · ring · destructive · radius`

Themes: `light · dark (default) · green · blue · red`. Switching is a single
`document.documentElement.dataset.theme = …` (see `src/lib/store.ts`).

## Components (`src/components/ui/*`)
| file | purpose |
| --- | --- |
| `ui.tsx` | Button, Card, Input, Progress, Badge, Empty, Toast |
| `mixer.tsx` | Mixer, MixerHeader/Title/Channels/Master/Separator/Empty |
| `channel-strip.tsx` | ChannelStrip + parts (audiocn) |
| `waveform.tsx` | `bars` \| `mirror` \| `line` waveforms |
| `bar-visualizer.tsx` | bars with `idle="pulse|wave"` and `loading` |
| `quality-knob.tsx` | adaptive audio-quality knob (dB/bitrate presets) |
| `badge.tsx` | audiocn badge |

## Behavioural rules
- **Sound**: declarative `data-cuelume-*` on chrome; imperative `sfx.*` only for
  outcomes/progress. One cue per action. See `docs/agents/ui-agent.md`.
- **Accessibility**: every control labelled (`aria-label` or visible label),
  `role="slider"` for knobs/faders, `aria-current="page"` for nav, focus-visible
  ring from `--ring`, `prefers-reduced-motion` honoured globally.
- **States**: empty, loading, error and completion states are mandatory on every
  processing screen. No bare HTML form dumps.

## Adding a screen
1. Add a `Route` in `src/lib/store.ts`.
2. Add a nav entry in the `GROUPS` table in `src/App.tsx`.
3. Create `src/pages/<Name>.tsx` using only `@/components/ui/*`.
4. Cover empty + loading + error + done states.

## Interaction patterns
Drag-and-drop zones, file cards, waveform previews, progress bars, sortable
tables, inline editing, context menus, shortcuts (Ctrl+O search, Ctrl+Enter
run), toasts, confirmation dialogs, persistent Jobs/History.
