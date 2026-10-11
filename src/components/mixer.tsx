import { useEffect, useRef, useState } from 'react';

/** audiocn/mixer-style channel strip: volume, pan, mute, solo, meter */
export interface MixerChannel { id: string; label: string; src?: string; volume: number; pan: number; muted: boolean; solo: boolean; }
export function useMixer(initial: MixerChannel[]) {
  const [channels, setChannels] = useState(initial);
  const audios = useRef(new Map<string, HTMLAudioElement>());
  const patch = (id: string, p: Partial<MixerChannel>) => setChannels((cs) => cs.map((c) => (c.id === id ? { ...c, ...p } : c)));
  useEffect(() => {
    channels.forEach((c) => {
      if (!c.src) return;
      let a = audios.current.get(c.id);
      if (!a) { a = new Audio(c.src); audios.current.set(c.id, a); }
      a.volume = c.muted ? 0 : c.volume;
      try { const ctx = new AudioContext(); const src = ctx.createMediaElementSource(a); const p = ctx.createStereoPanner(); p.pan.value = c.pan; src.connect(p).connect(ctx.destination); } catch {}
    });
  }, [channels]);
  // Preview is direct activation -> declarative tap on the button; no play() here.
  const preview = (id: string) => { audios.current.get(id)?.play().catch(() => {}); };
  return { channels, patch, preview };
}

export function MixerStrip({ ch, onPatch, onPreview }: { ch: MixerChannel; onPatch: (p: Partial<MixerChannel>) => void; onPreview: () => void }) {
  return (
    <div className="card flex items-center gap-3 p-3">
      {/* open = disclosures/preview drawer-ish activation; tap would also be fine */}
      <button data-cuelume-open onClick={onPreview} className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-label={`Preview ${ch.label}`}>▶</button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{ch.label}</p>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Vol</label>
          <input data-cuelume-select type="range" min={0} max={1} step={0.01} value={ch.volume} onChange={(e) => onPatch({ volume: Number(e.target.value) })} aria-label={`${ch.label} volume`} className="w-24" />
          <label className="text-xs text-muted-foreground">Pan</label>
          <input data-cuelume-select type="range" min={-1} max={1} step={0.01} value={ch.pan} onChange={(e) => onPatch({ pan: Number(e.target.value) })} aria-label={`${ch.label} pan`} className="w-20" />
          <button data-cuelume-toggle onClick={() => onPatch({ muted: !ch.muted })} className={`rounded px-2 py-0.5 text-xs ${ch.muted ? 'bg-destructive text-white' : 'bg-secondary'}`} aria-pressed={ch.muted}>M</button>
          <button data-cuelume-toggle onClick={() => onPatch({ solo: !ch.solo })} className={`rounded px-2 py-0.5 text-xs ${ch.solo ? 'bg-primary text-white' : 'bg-secondary'}`} aria-pressed={ch.solo}>S</button>
        </div>
      </div>
    </div>
  );
}

/** Decorative waveform (real peaks come from main-process ffprobe when files load) */
export function Waveform({ peaks, progress = 0 }: { peaks?: number[]; progress?: number }) {
  const bars = peaks ?? Array.from({ length: 64 }, (_, i) => 0.25 + 0.65 * Math.abs(Math.sin(i / 5)));
  return (
    <div className="flex h-16 items-end gap-[3px]" role="img" aria-label="Waveform">
      {bars.map((h, i) => (
        <div key={i} className="waveform-bar flex-1" style={{ height: `${h * 100}%`, background: i / bars.length < progress ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))', opacity: 0.85 }} />
      ))}
    </div>
  );
}
