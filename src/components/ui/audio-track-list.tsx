import { useState } from 'react';
import { Badge } from '@/components/ui';
import { cn } from '@/lib/utils';

export interface AudioTrack { id: string; title: string; src: string; detail?: string; }

/** Small accessible player and track list for imported local audio. */
export function AudioTrackList({ tracks, className, onTrackChange }: { tracks: AudioTrack[]; className?: string; onTrackChange?: (track: AudioTrack) => void }) {
  const [active, setActive] = useState(tracks[0]?.id ?? '');
  const selected = tracks.find((track) => track.id === active) ?? tracks[0];
  if (!tracks.length || !selected) return null;
  return (
    <section className={cn('grid gap-3', className)} aria-label="Audio player">
      <div className="rounded-xl border border-border bg-background/60 p-3">
        <div className="mb-2 flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden>♫</span>
          <div className="min-w-0"><p className="truncate text-sm font-medium">{selected.title}</p><p className="truncate text-xs text-muted-foreground">{selected.detail ?? 'Local audio'}</p></div>
          <Badge className="ml-auto">Preview</Badge>
        </div>
        <audio controls preload="metadata" src={selected.src} aria-label={`Play ${selected.title}`} className="h-9 w-full" />
      </div>
      {tracks.length > 1 && <div className="grid gap-1" role="list" aria-label="Imported audio files">
        {tracks.map((track, index) => <button key={track.id} type="button" role="listitem" onClick={() => { setActive(track.id); onTrackChange?.(track); }} aria-current={track.id === selected.id ? 'true' : undefined} className={cn('flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent', track.id === selected.id && 'bg-accent')}>
          <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">{index + 1}</span><span className="truncate">{track.title}</span><span className="ml-auto shrink-0 text-xs text-muted-foreground">{track.detail}</span>
        </button>)}
      </div>}
    </section>
  );
}
