"use client";

import { useRef, useState } from "react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export interface QualityOption {
  id: string;
  label: string;
  /** ffmpeg audio bitrate, e.g. "64k". */
  bitrate: string;
  /** 0..100 mapped knob position. */
  value: number;
  hint?: string;
}

export const AUDIO_QUALITIES: QualityOption[] = [
  { id: "voice", label: "Voice", bitrate: "32k", value: 0, hint: "Smallest files, speech only" },
  { id: "standard", label: "Standard", bitrate: "64k", value: 28, hint: "Good for spoken word" },
  { id: "high", label: "High", bitrate: "96k", value: 55, hint: "Balanced quality/size" },
  { id: "studio", label: "Studio", bitrate: "128k", value: 78, hint: "Near-transparent" },
  { id: "master", label: "Master", bitrate: "192k", value: 100, hint: "Archival" },
];

const nearest = (v: number) =>
  AUDIO_QUALITIES.reduce((a, b) => (Math.abs(b.value - v) < Math.abs(a.value - v) ? b : a));

/**
 * Adaptive audio-quality knob: a rotary 0..100 control that snaps to the
 * nearest quality preset (Voice 32k / Standard 64k / High 96k / Studio 128k /
 * Master 192k) and reports the ffmpeg bitrate. Drag vertically, use arrows,
 * or pick a preset chip.
 */
export function QualityKnob({
  value,
  defaultValue = "high",
  onChange,
  className,
  ...props
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (q: QualityOption) => void;
} & Omit<ComponentProps<"div">, "onChange">) {
  const initial = AUDIO_QUALITIES.find((q) => q.id === (value ?? defaultValue)) ?? AUDIO_QUALITIES[2]!;
  const [pos, setPos] = useState(initial.value);
  const dragStart = useRef<{ pointerId: number; y: number; value: number } | null>(null);
  const active = nearest(value ? (AUDIO_QUALITIES.find((q) => q.id === value)?.value ?? pos) : pos);
  const angle = -135 + (pos / 100) * 270;

  const commit = (v: number) => {
    const c = Math.min(100, Math.max(0, Math.round(v)));
    setPos(c);
    onChange?.(nearest(c));
  };

  return (
    <div className={cn("flex items-center gap-4", className)} data-slot="quality-knob" data-quality={active.id} {...props}>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Audio quality"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pos}
        aria-valuetext={`${active.label}, ${active.bitrate}`}
        data-cuelume-select
        className="relative h-20 w-20 cursor-ns-resize rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowRight") { e.preventDefault(); commit(pos + (e.shiftKey ? 10 : 2)); }
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") { e.preventDefault(); commit(pos - (e.shiftKey ? 10 : 2)); }
          if (e.key === "Home") { e.preventDefault(); commit(0); }
          if (e.key === "End") { e.preventDefault(); commit(100); }
        }}
        style={{ touchAction: "none", userSelect: "none" }}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          dragStart.current = { pointerId: e.pointerId, y: e.clientY, value: pos };
        }}
        onPointerMove={(e) => {
          const start = dragStart.current;
          if (!start || start.pointerId !== e.pointerId) return;
          // Anchor every move to the initial pointer/value pair, avoiding the
          // cumulative jump that made the old control feel sticky and uneven.
          commit(start.value + (start.y - e.clientY) * 1.25);
        }}
        onPointerUp={(e) => {
          if (dragStart.current?.pointerId === e.pointerId) dragStart.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => { dragStart.current = null; }}
      >
        <svg viewBox="0 0 80 80" className="absolute inset-0 h-full w-full" aria-hidden>
          <circle cx="40" cy="40" r="32" fill="none" strokeWidth="6" className="stroke-secondary" strokeDasharray={`${(270 / 360) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`} strokeLinecap="round" transform="rotate(135 40 40)" />
          <circle cx="40" cy="40" r="32" fill="none" strokeWidth="6" className="stroke-primary" strokeDasharray={`${((pos / 100) * 270 / 360) * 2 * Math.PI * 32} ${2 * Math.PI * 32}`} strokeLinecap="round" transform="rotate(135 40 40)" />
          <line x1="40" y1="40" x2="40" y2="16" strokeWidth="3" className="stroke-foreground" strokeLinecap="round" transform={`rotate(${angle} 40 40)`} />
          <circle cx="40" cy="40" r="5" className="fill-foreground" />
        </svg>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{active.label} <span className="font-mono text-muted-foreground">· {active.bitrate}</span></p>
        {active.hint && <p className="text-xs text-muted-foreground">{active.hint}</p>}
        <input
          data-cuelume-select
          type="range"
          min={0}
          max={100}
          step={1}
          value={pos}
          aria-label="Adjust audio quality smoothly"
          aria-valuetext={`${active.label}, ${active.bitrate}`}
          onChange={(e) => commit(Number(e.target.value))}
          className="mt-1.5 h-2 w-full min-w-40 cursor-pointer touch-none accent-primary"
        />
        <div className="mt-1.5 flex flex-wrap gap-1" role="group" aria-label="Quality presets">
          {AUDIO_QUALITIES.map((q) => (
            <button
              key={q.id}
              data-cuelume-select
              onClick={() => commit(q.value)}
              aria-pressed={q.id === active.id}
              className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", q.id === active.id ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-accent")}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
