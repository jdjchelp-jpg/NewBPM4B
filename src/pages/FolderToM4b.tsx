import { useEffect, useRef, useState } from 'react';
import { Card, Button, Progress, Badge, Input } from '@/components/ui';
import { BarVisualizer } from '@/components/ui/bar-visualizer';
import { useApp } from '@/lib/store';
import { sfx } from '@/lib/sound';
import { pickImage, pickLocalFiles, pickLocalFolder, type LocalSelection } from '@/lib/files';
import { buildM4bInBrowser } from '@/lib/m4b-browser';
import { reportOperationProgress } from '@/lib/progress';

interface Row { file: string; name: string; selection?: LocalSelection; }
const base = (f: string) => f.split(/[\\/]/).pop() ?? f;
/** "Chapter 001 - The Beginning.mp3" -> "The Beginning" (keeps numbering if no separator found). */
const chapterName = (file: string) => base(file).replace(/\.[^.]+$/, '').replace(/^.*?\b\d+\s*[-–—.)]\s*/, '').replace(/^\d+\s*[-–—.)]\s*/, '').trim() || base(file).replace(/\.[^.]+$/, '');

export default function FolderToM4b() {
  const { bitrate } = useApp();
  const addJob = useApp((s) => s.addJob);
  const updateJob = useApp((s) => s.updateJob);
  const [rows, setRows] = useState<Row[]>([]);
  const [folder, setFolder] = useState('');
  const [cover, setCover] = useState<LocalSelection | null>(null);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('Ready');
  const activeJob = useRef<string | null>(null);

  useEffect(() => {
    const off = (window as any).bpm4b;
    off?.onProgress?.((p: number) => {
      setProg(p);
      const operationId = activeJob.current;
      if (!operationId) return;
      const detail = `FFmpeg ${p}%`;
      setPhase(`Encoding M4B · ${detail}`);
      updateJob(operationId, { progress: p, detail });
      reportOperationProgress({ operationId, task: 'Build folder audiobook', stage: 'Encoding M4B', progress: p, detail });
    });
  }, [updateJob]);

  const pickFolder = async () => {
    const selected = await pickLocalFolder();
    if (!selected.length) return;
    const sorted = [...selected].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    setFolder(selected[0].path?.split(/[\\/]/).slice(0, -1).join('/') || 'Selected folder');
    setRows(sorted.map((selection) => ({ file: selection.path ?? selection.name, name: chapterName(selection.name), selection })));
    setErr(''); sfx.success(false);
  };
  const make = async () => {
    const desktop = (window as any).bpm4b;
    const out = desktop?.pickSave ? await desktop.pickSave({ defaultPath: 'audiobook.m4b' }) : undefined;
    if (desktop && !out) return;
    const jobId = addJob({ title: 'Build folder audiobook', kind: 'audiobook', state: 'processing', progress: 1, detail: `${rows.length} chapter file(s)` });
    activeJob.current = jobId;
    setPhase('Loading encoder');
    reportOperationProgress({ operationId: jobId, task: 'Build folder audiobook', stage: 'Starting', progress: 1, detail: `${rows.length} chapter file(s)` });
    setProg(1); setErr(''); setBusy(true); sfx.loading();
    try {
      if (desktop) await desktop.mp3ToM4b({ inputs: rows.map((r) => r.file), output: out, bitrate, chapterTitles: rows.map((r) => r.name), cover: cover?.path });
      else await buildM4bInBrowser({ inputs: rows.map((r) => r.selection!), bitrate, chapterTitles: rows.map((r) => r.name), cover, operationId: jobId, onStatus: (status) => {
        setProg(status.progress); setPhase(`${status.stage}${status.detail ? ` · ${status.detail}` : ''}`);
        updateJob(jobId, { progress: status.progress, detail: status.detail || status.stage });
      } });
      setProg(100); setPhase('Complete'); updateJob(jobId, { state: 'completed', progress: 100, detail: `${rows.length} chapters created` }); sfx.success(true);
    } catch (e) { const message = e instanceof Error ? e.message : String(e); setErr(message); updateJob(jobId, { state: 'failed', detail: message }); sfx.error(); }
    finally { activeJob.current = null; setBusy(false); }
  };
  const pickCover = async () => {
    const r = await pickImage();
    if (r) { setCover(r); sfx.success(false); }
  };
  const addAudio = async () => {
    const selected = await pickLocalFiles('audio', true);
    if (!selected.length) return;
    const additions = selected.map((selection) => ({ file: selection.path ?? selection.name, name: chapterName(selection.name), selection }));
    setRows((old) => [...old, ...additions].sort((a, b) => a.selection!.name.localeCompare(b.selection!.name, undefined, { numeric: true, sensitivity: 'base' })));
    setErr('');
  };

  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">Folder → M4B</h2>
        <p className="text-sm text-muted-foreground">Point at a folder — BPM4B sorts the files naturally and detects chapter names from filenames.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={pickFolder}>Scan folder</Button>
          <Button variant="outline" onClick={addAudio}>Add audio files</Button>
          {folder && <span className="truncate text-xs text-muted-foreground" title={folder}>{folder}</span>}
          <Button variant="outline" onClick={pickCover}>{cover ? 'Change cover' : 'Choose cover'}</Button>
          {cover && <span className="truncate text-xs text-muted-foreground" title={cover.name}>{cover.name}</span>}
          <Button variant="secondary" onClick={make} disabled={!rows.length}>Build M4B</Button>
          <Badge>{rows.length} files</Badge>
        </div>
        {busy && <div className="mt-3 grid gap-1.5"><BarVisualizer aria-label="Processing folder" barCount={24} className="h-14 text-primary" loading /><p className="text-center text-xs text-muted-foreground">processing…</p></div>}
        {prog > 0 && <Progress value={prog} className="mt-3" />}
        {busy && <p role="status" aria-live="polite" className="mt-1 text-xs text-muted-foreground">{phase} · {prog}%</p>}
        {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      </Card>
      <Card>
        <h3 className="font-semibold">Detected chapters ({rows.length})</h3>
        <p className="text-xs text-muted-foreground">Rename anything the detector got wrong — for example “Chapter 006-  Back From Sleeping.mp3”.</p>
        {rows.map((r, i) => (
          <div key={r.file + i} className="flex items-center gap-2 border-b border-border py-1.5 text-sm">
            <span className="w-8 shrink-0 text-right text-muted-foreground">{i + 1}.</span>
            <input data-cuelume-type value={r.name} onChange={(e) => setRows((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} aria-label={`Chapter ${i + 1} name`} className="flex-1 rounded-lg border border-input bg-background px-2 py-1 text-sm" />
            <span className="hidden max-w-[40%] truncate text-xs text-muted-foreground sm:inline" title={r.selection?.name ?? base(r.file)}>{r.selection?.name ?? base(r.file)}</span>
            {r.selection?.url && <audio controls preload="metadata" src={r.selection.url} aria-label={`Preview ${r.selection.name}`} className="h-8 w-28" />}
            <button data-cuelume-close onClick={() => setRows((p) => p.filter((_, j) => j !== i))} className="rounded px-2 py-0.5 text-xs hover:bg-accent" aria-label={`Remove chapter ${i + 1}`}>✕</button>
          </div>
        ))}
        {!rows.length && <p className="py-2 text-sm text-muted-foreground">No folder scanned yet.</p>}
      </Card>
    </div>
  );
}
