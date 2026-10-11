"use client";

import { useEffect, useId, useRef } from "react";
import { createBarLevels } from "@/lib/bar-levels";
import type { BarIdle } from "@/lib/bar-levels";
import { createWaveLine } from "@/lib/wave-line";
import type { WaveLineMode } from "@/lib/wave-line";
import { useAudioConfig } from "@/hooks/use-audio-config";
import { cn } from "@/lib/utils";

export interface WaveformProps extends React.HTMLAttributes<HTMLDivElement> {
  peaks?: ArrayLike<number> | null;
  duration?: number;
  defaultCurrentTime?: number;
  currentTime?: number;
  variant?: "bars" | "mirror" | "line";
  mode?: WaveLineMode;
  idle?: BarIdle;
  loading?: boolean;
  sensitivity?: number;
}

const barsPath = (levels: Float32Array, w: number, h: number, gap: number, mirrored: boolean) => {
  const n = levels.length;
  const bw = (w - gap * (n - 1)) / n;
  let d = "";
  for (let i = 0; i < n; i += 1) {
    const v = Math.min(1, Math.max(0, levels[i] ?? 0));
    const bh = Math.max(1, v * h);
    const x = i * (bw + gap);
    if (mirrored) {
      const mid = h / 2;
      d += `M${x.toFixed(1)} ${(mid - bh / 2).toFixed(1)}h${bw.toFixed(1)}v${bh.toFixed(1)}h${(-bw).toFixed(1)}Z`;
    } else {
      d += `M${x.toFixed(1)} ${(h - bh).toFixed(1)}h${bw.toFixed(1)}v${bh.toFixed(1)}h${(-bw).toFixed(1)}Z`;
    }
  }
  return d;
};

const linePath = (heights: Float32Array, count: number, w: number, h: number) => {
  if (count < 2) return "";
  const mid = h / 2;
  let d = `M0 ${(mid - (heights[0] ?? 0) * (mid - 1)).toFixed(1)}`;
  for (let i = 1; i < count; i += 1) {
    d += `L${((i / (count - 1)) * w).toFixed(1)} ${(mid - (heights[i] ?? 0) * (mid - 1)).toFixed(1)}`;
  }
  return d;
};

/**
 * audiocn-compatible Waveform: `bars` | `mirror` | `line` variants,
 * static `peaks` or live frame-source driven, plus `loading` sweep.
 */
export function Waveform({
  peaks = null,
  duration = 0,
  defaultCurrentTime = 0,
  currentTime,
  variant = "bars",
  mode = "wave",
  idle = "static",
  loading = false,
  sensitivity = 1,
  className,
  ...props
}: WaveformProps) {
  const config = useAudioConfig();
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const progRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const t = currentTime ?? defaultCurrentTime;
  const progress = duration > 0 ? Math.min(1, Math.max(0, t / duration)) : 0;

  useEffect(() => {
    const el = ref.current;
    const pathEl = pathRef.current;
    if (!el || !pathEl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const count = variant === "line" ? 160 : 96;
    const levels = createBarLevels({ barCount: count, idle, loading, minLevel: 0, mirrored: variant === "mirror", reducedMotion: reduced });
    const line = createWaveLine({ loading, mode, reducedMotion: reduced, sensitivity });
    let raf = 0;
    const draw = (now: number) => {
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, rect.width);
      const h = Math.max(1, rect.height);
      if (peaks && peaks.length > 0) {
        // Static peaks: resample to bar count once per frame (cheap).
        const input = new Float32Array(count);
        for (let i = 0; i < count; i += 1) {
          const src = Math.floor((i / count) * peaks.length);
          input[i] = Math.min(1, Math.max(0, peaks[src] ?? 0));
        }
        levels.step(now, input);
        if (variant === "line") {
          line.step(now, {
            bands: input, history: input, historyStart: 0,
            historyLength: input.length, historyUpdatedAt: now,
            timeDomain: undefined, peakDb: 0,
          }, count);
          pathEl.setAttribute("d", linePath(line.heights, line.count, w, h));
        } else {
          pathEl.setAttribute("d", barsPath(levels.levels, w, h, 1.5, variant === "mirror"));
        }
      } else {
        // No peaks: idle animation / loading sweep.
        levels.step(now, null);
        if (variant === "line") {
          line.step(now, null, count);
          pathEl.setAttribute("d", linePath(line.heights, line.count, w, h));
        } else {
          pathEl.setAttribute("d", barsPath(levels.levels, w, h, 1.5, variant === "mirror"));
        }
      }
      if (progRef.current) progRef.current.style.left = `${progress * 100}%`;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [peaks, variant, mode, idle, loading, sensitivity, progress]);

  return (
    <div ref={ref} role="img" aria-labelledby={titleId} data-slot="waveform" data-variant={variant} className={cn("relative min-h-10 w-full overflow-hidden", className)} {...props}>
      <span id={titleId} className="sr-only">{props["aria-label"] ?? `${variant} waveform`}</span>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        {variant === "line"
          ? <path ref={pathRef} fill="none" stroke="currentColor" strokeWidth={1.5} className="text-primary" />
          : <path ref={pathRef} fill="currentColor" className="text-primary opacity-80" />}
      </svg>
      {duration > 0 && <div ref={progRef} className="absolute inset-y-0 w-px bg-foreground/60" aria-hidden />}
    </div>
  );
}
