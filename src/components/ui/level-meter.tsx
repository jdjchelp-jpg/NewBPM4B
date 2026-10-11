import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface LevelMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  peak?: number;
  rms?: number;
  label?: string;
  orientation?: 'horizontal' | 'vertical';
  clip?: boolean;
}

/** Peak/RMS level meter inspired by audiocn; values are normalized from 0 to 1. */
export function LevelMeter({ peak = 0, rms = 0, label = 'Audio level', orientation = 'horizontal', clip, className, ...props }: LevelMeterProps) {
  const peakRef = useRef<HTMLDivElement>(null);
  const rmsRef = useRef<HTMLDivElement>(null);
  const clampedPeak = Math.max(0, Math.min(1, peak));
  const clampedRms = Math.max(0, Math.min(1, rms));
  useEffect(() => {
    if (peakRef.current) peakRef.current.style.width = `${clampedPeak * 100}%`;
    if (rmsRef.current) rmsRef.current.style.width = `${clampedRms * 100}%`;
  }, [clampedPeak, clampedRms]);
  return (
    <div className={cn('grid gap-1.5', className)} {...props}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{clampedPeak === 0 ? '−∞' : `${(20 * Math.log10(clampedPeak)).toFixed(1)}`} dBFS</span>
      </div>
      <div role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={1} aria-valuenow={clampedPeak} aria-valuetext={`${(20 * Math.log10(Math.max(clampedPeak, 0.00001))).toFixed(1)} dBFS${clip ? ', clipped' : ''}`} className={cn('relative h-3 overflow-hidden rounded-full bg-secondary', orientation === 'vertical' && 'h-28 w-3')}>
        <div ref={rmsRef} className="absolute inset-y-0 left-0 rounded-full bg-meter-ok/55 transition-[width]" />
        <div ref={peakRef} className={cn('absolute inset-y-0 left-0 rounded-full transition-[width]', clampedPeak > .92 ? 'bg-meter-clip' : clampedPeak > .72 ? 'bg-meter-warn' : 'bg-meter-ok')} />
        <div className="pointer-events-none absolute inset-y-0 left-[72%] w-px bg-foreground/35" />
        <div className="pointer-events-none absolute inset-y-0 left-[92%] w-px bg-foreground/45" />
      </div>
      {clip && <span className="text-xs font-semibold text-destructive">CLIP</span>}
    </div>
  );
}
