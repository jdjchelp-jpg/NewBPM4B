"use client";

import { useEffect, useRef } from "react";
import { createBarLevels } from "@/lib/bar-levels";
import type { BarIdle } from "@/lib/bar-levels";
import { cn } from "@/lib/utils";

export interface BarVisualizerProps extends React.HTMLAttributes<HTMLDivElement> {
  levels?: ArrayLike<number> | null;
  barCount?: number;
  idle?: BarIdle;
  loading?: boolean;
  mirrored?: boolean;
  minLevel?: number;
}

const barsPath = (levels: Float32Array, w: number, h: number, gap: number) => {
  const n = levels.length;
  const bw = (w - gap * (n - 1)) / n;
  let d = "";
  for (let i = 0; i < n; i += 1) {
    const v = Math.min(1, Math.max(0, levels[i] ?? 0));
    const bh = Math.max(1.5, v * h);
    const x = i * (bw + gap);
    d += `M${x.toFixed(1)} ${(h - bh).toFixed(1)}h${bw.toFixed(1)}v${bh.toFixed(1)}h${(-bw).toFixed(1)}Z`;
  }
  return d;
};

/** audiocn-compatible BarVisualizer: idle pulse/wave + loading sweep. */
export function BarVisualizer({
  levels = null,
  barCount = 24,
  idle = "static",
  loading = false,
  mirrored = false,
  minLevel = 0,
  className,
  ...props
}: BarVisualizerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    const el = ref.current;
    const pathEl = pathRef.current;
    if (!el || !pathEl) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const state = createBarLevels({ barCount, idle, loading, minLevel, mirrored, reducedMotion: reduced });
    let raf = 0;
    const draw = (now: number) => {
      const rect = el.getBoundingClientRect();
      state.step(now, levels && levels.length ? levels : null);
      pathEl.setAttribute("d", barsPath(state.levels, Math.max(1, rect.width), Math.max(1, rect.height), 2));
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [levels, barCount, idle, loading, mirrored, minLevel]);

  return (
    <div ref={ref} role="img" data-slot="bar-visualizer" data-loading={loading || undefined} className={cn("min-h-8 w-full overflow-hidden", className)} {...props}>
      <svg className="h-full w-full" preserveAspectRatio="none" aria-hidden>
        <path ref={pathRef} fill="currentColor" className="text-primary" />
      </svg>
    </div>
  );
}
