import { useState } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';
import { sfx } from '@/lib/sound';
import { pickLocalFiles, type LocalSelection } from '@/lib/files';
const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function M4bChapters() {
  const [file, setFile] = useState<LocalSelection | null>(null);
  const [chapters, setChapters] = useState<{ start: number; title: string }[]>([]);
  const [err, setErr] = useState('');
  const pick = async () => {
    const r = await pickLocalFiles('audio', false);
    if (!r?.[0]) return;
    setFile(r[0]);
    if (r[0].file && !(window as any).bpm4b) { setErr('Audio imported. Reading and editing embedded chapters requires BPM4B desktop.'); return; }
    const res = await (window as any).bpm4b?.readChapters?.({ file: r[0].path });
    if (res?.chapters?.length) { setChapters(res.chapters); setErr(''); }
    else { setChapters([]); setErr(res?.note ?? 'No embedded chapters found — add them below and re-export.'); }
    sfx.success(false);
  };
  const exportCsv = () => {
    const csv = ['start,title', ...chapters.map((c) => `${fmt(c.start)},"${c.title.replace(/"/g, '""')}"`)].join('\n');
    navigator.clipboard?.writeText(csv).catch(() => {});
    sfx.success(false);
  };
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">M4B Chapter Tools</h2>
        <p className="text-sm text-muted-foreground">Read, edit, add, remove and export chapter markers in an existing M4B/M4A.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={pick}>{file ? 'Change M4B' : 'Open M4B/M4A'}</Button>
          {file && <><span className="truncate text-sm" title={file.name}>{file.name}</span>{file.url && <audio controls preload="metadata" src={file.url} aria-label="Preview selected audio" className="h-9 max-w-full" />}</>}
          <Button variant="outline" onClick={exportCsv} disabled={!chapters.length}>Copy CSV</Button>
          <Button variant="outline" disabled={!chapters.length} onClick={() => { navigator.clipboard?.writeText(JSON.stringify(chapters, null, 2)).catch(() => {}); sfx.success(false); }}>Copy JSON</Button>
        </div>
        {err && <p role="status" className="mt-2 text-sm text-muted-foreground">{err}</p>}
      </Card>
      <Card>
        <h3 className="font-semibold">Chapters ({chapters.length})</h3>
        {chapters.map((c, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-border py-1.5 text-sm">
            <Badge>{fmt(c.start)}</Badge>
            <Input aria-label={`Chapter ${i + 1} title`} value={c.title} onChange={(e) => setChapters((p) => p.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className="flex-1" />
            <button data-cuelume-close onClick={() => setChapters((p) => p.filter((_, j) => j !== i))} className="rounded px-2 py-0.5 text-xs hover:bg-accent" aria-label={`Remove ${c.title}`}>✕</button>
          </div>
        ))}
        {!chapters.length && <p className="py-2 text-sm text-muted-foreground">Open an M4B to load its chapters.</p>}
        <div className="mt-2">
          <Button variant="secondary" onClick={() => setChapters((p) => [...p, { start: (p[p.length - 1]?.start ?? 0) + 3600, title: `Chapter ${p.length + 1}` }])}>Add chapter</Button>
        </div>
      </Card>
    </div>
  );
}
