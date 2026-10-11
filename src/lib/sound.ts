import { bind, play, setEnabled, setTheme, setVolume } from 'cuelume';
import type { ThemeName } from 'cuelume';

let bound = false;

/** UI visual theme -> cuelume material. default+mech are for all-day use; bubble reserved for playful moments. */
const MATERIAL: Record<'light' | 'dark' | 'green', ThemeName> = {
  light: 'default',
  dark: 'mech',
  green: 'press',
};

export interface SoundPrefs {
  enabled: boolean;
  volume: number; // 0..1
  material: 'light' | 'dark' | 'green';
}

export function initSound(prefs: Partial<SoundPrefs> = {}) {
  const { enabled = true, volume = 0.7, material = 'light' } = prefs;
  // React recipe per agents.md: call bind() once top-level; delegated + idempotent, covers later DOM.
  if (!bound) {
    try {
      bind();
      bound = true;
    } catch {
      /* SSR / no DOM: importing/playing is a safe no-op */
    }
  }
  try {
    setEnabled(enabled);
    setVolume(volume);
    setTheme(MATERIAL[material]);
  } catch {
    /* invalid values are ignored by cuelume; never throw */
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    setEnabled(on);
  } catch {}
}

export function setSoundVolume(v: number) {
  try {
    setVolume(v);
  } catch {}
}

/**
 * Imperative cues — for outcomes & progress only (agents.md §2).
 * Declarative chrome (buttons/inputs/nav) is handled by data-cuelume-* attributes.
 */
export const sfx = {
  /** Slow work started (M4B build, conversion, merge). */
  loading: () => {
    try {
      play('loading');
    } catch {}
  },
  /** Confirmed completion. Strong = rare + matters (finished audiobook). */
  success: (strong = false) => {
    try {
      play('success', strong ? { emphasis: 'strong' } : undefined);
    } catch {}
  },
  /** Done but needs a look (e.g. warnings, skipped files). */
  warning: () => {
    try {
      play('warning');
    } catch {}
  },
  /** Recoverable failure / refusal. */
  error: () => {
    try {
      play('error');
    } catch {}
  },
  /** Route/page change. Never per-digit; one cue per action. */
  navigate: (back = false) => {
    try {
      play('navigate', back ? { direction: 'back' } : undefined);
    } catch {}
  },
  /** Animated number starts moving (progress sweep). One cue, never per tick. */
  count: (duration = 900) => {
    try {
      play('count', { duration });
    } catch {}
  },
};

