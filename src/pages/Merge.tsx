import { useEffect, useState } from 'react';
import { Card, Button, Progress, Badge } from '@/components/ui';
import { BarVisualizer } from '@/components/ui/bar-visualizer';
import { sfx } from '@/lib/sound';
import { pickLocalFiles, type LocalSelection } from '@/lib/files';
import { AudioTrackList } from '@/components/ui/audio-track-list';
import { mergeAudioInBrowser } from '@/lib/m4b-browser';
const AUDIO = ['.mp3', '.m4a', '.m4b', '.ogg', '.wav', '.flac', '.aac', '.opus', '.wma', '.aiff'];

export default function Merge() {
  const [files, setFiles] = useState<LocalSelection[]>([]);
  const [drag, setDrag] = useState<number | null>(null);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { (window as any).bpm4b?.onProgress?.((p: number) => setProg(p)); }, []);
  const accept = (incoming: LocalSelection[]) => {
    const audio = incoming.filter((f) => f.file || AUDIO.some((e) => f.name.toLowerCase().endsWith(e)));
    setFiles((p) => [...p, ...audio]);
    if (audio.length) sfx.success(false);
  };
  const pick = async () => { const r = await pickLocalFiles('audio', true); if (r.length) accept(r); };
  const move = (from: number, to: number) => setFiles((p) => { const c = [...p]; const [x] = c.splice(from, 1); c.splice(to, 0, x); return c; });
  const run = async () => {
    setProg(1); setErr(''); setBusy(true); sfx.loading();
    try {
      const bridge = (window as any).bpm4b;
      if (bridge) {
        const out = await bridge.pickSave?.({ defaultPath: 'merged.mp3' });
        if (!out) return;
        await bridge.mergeAudio?.({ inputs: files.map((f) => f.path ?? f.name), output: out });
      } else {
        await mergeAudioInBrowser({ inputs: files, onStatus: (status) => setProg(status.progress) });
      }
      setProg(100); sfx.success(true);
    }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); sfx.error(); }
    finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const incoming = Array.from(e.dataTransfer.files).map((x: any) => x.path ? { name: x.name, path: x.path } : ({ name: x.name, file: x as File, url: URL.createObjectURL(x), size: x.size })); if (incoming.length) accept(incoming); }}>
      <Card>
        <h2 className="text-lg font-bold">Batch Merge</h2>
        <p className="text-sm text-muted-foreground">Glue parts into one file. Stream-copies when the codecs match — no needless re-encoding.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={pick}>Add files</Button>
          <Button variant="secondary" onClick={run} disabled={files.length < 2}>Merge {files.length ? `(${files.length})` : ''}</Button>
        </div>
        {busy && <div className="mt-3"><BarVisualizer aria-label="Merging" barCount={24} className="h-12 text-primary" loading /></div>}
        {prog > 0 && <Progress value={prog} className="mt-3" />}
        {err && <p role="alert" className="mt-2 whitespace-pre-line text-sm text-destructive">{err}</p>}
      </Card>
      <Card>
        <h3 className="font-semibold">Order ({files.length}) — drag to reorder</h3>
        <AudioTrackList className="mt-3" tracks={files.filter((f) => f.url).map((f, i) => ({ id: f.url!, title: f.name, src: f.url!, detail: `Track ${i + 1}` }))} />
        {files.map((f, i) => (
      <div key={f.name + i} draggable onDragStart={() => setDrag(i)} onDragOver={(e) => e.preventDefault()}
            onDrop={() => { if (drag !== null && drag !== i) move(drag, i); setDrag(null); }}
            className={`flex items-center gap-2 border-b border-border py-1.5 text-sm ${drag === i ? 'opacity-50' : ''}`}>
            <span className="cursor-grab text-muted-foreground" aria-hidden>⋮⋮</span>
            <span className="w-6 text-right text-muted-foreground">{i + 1}.</span>
            <span className="truncate" title={f.name}>{f.name}</span>
            <Badge>{f.name.split('.').pop()?.toUpperCase()}</Badge>
            <div className="ml-auto flex gap-1">
              <button data-cuelume-select onClick={() => i > 0 && move(i, i - 1)} className="rounded px-1.5 text-xs hover:bg-accent" aria-label="Move up">↑</button>
              <button data-cuelume-select onClick={() => i < files.length - 1 && move(i, i + 1)} className="rounded px-1.5 text-xs hover:bg-accent" aria-label="Move down">↓</button>
              <button data-cuelume-close onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="rounded px-1.5 text-xs hover:bg-accent" aria-label={`Remove ${f.name}`}>✕</button>
            </div>
          </div>
        ))}
        {!files.length && <p className="py-2 text-sm text-muted-foreground">Add audio to merge.</p>}
      </Card>
    </div>
  );
}
