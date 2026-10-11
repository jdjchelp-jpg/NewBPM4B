import { useEffect, useRef, useState } from 'react';
import { Card, Button, Progress, Badge, Input } from '@/components/ui';
import { Waveform } from '@/components/ui/waveform';
import { BarVisualizer } from '@/components/ui/bar-visualizer';
import { QualityKnob } from '@/components/ui/quality-knob';
import { useApp } from '@/lib/store';
import { sfx } from '@/lib/sound';
import { formatBytes, pickImage, pickLocalFolder, revokeSelection, selectionName, selectionPath, useAudioImport, type AudioSelection } from '@/lib/files';
import { buildM4bInBrowser } from '@/lib/m4b-browser';
import { reportOperationProgress } from '@/lib/progress';

const AUDIO_EXT = ['.mp3', '.m4a', '.m4b', '.ogg', '.oga', '.wav', '.flac', '.aac', '.opus', '.wma', '.aiff', '.aif'];
const isAudio = (f: string) => AUDIO_EXT.some((e) => f.toLowerCase().endsWith(e));
export function useAudioFiles() {
  const [files, setFilesState] = useState<AudioSelection[]>([]);
  const [rejected, setRejected] = useState<string[]>([]);
  const setFiles = (update: AudioSelection[] | ((current: AudioSelection[]) => AudioSelection[])) => {
    setFilesState((current) => {
      const next = typeof update === 'function' ? update(current) : update;
      for (const item of current) if (!next.includes(item)) revokeSelection(item);
      return next;
    });
  };
  const onImport = (items: AudioSelection[]) => {
    const merged = [...files, ...items].filter((item, i, all) => all.findIndex((x) => x.path === item.path && x.name === item.name) === i);
    merged.sort((a, b) => selectionName(a).localeCompare(selectionName(b), undefined, { numeric: true, sensitivity: 'base' }));
    setFiles(merged);
  };
  const { importFiles, pickFiles } = useAudioImport(onImport);
  return { files, setFiles, rejected, accept: (files: FileList | File[]) => { const r = importFiles(files); if (r.rejected.length) setRejected((p) => [...p, ...r.rejected]); }, pickFiles };
}

export function FileList({ files, onRemove }: { files: AudioSelection[]; onRemove: (i: number) => void }) {
  return (
    <div>
      {files.map((f, i) => (
        <div key={selectionName(f) + i} className="flex items-center gap-2 border-b border-border py-1.5 text-sm">
          <span className="w-6 shrink-0 text-right text-muted-foreground">{i + 1}.</span>
          <span className="truncate" title={selectionName(f)}>{selectionName(f)}</span>
          <Badge>{f.name.split('.').pop()?.toUpperCase()}</Badge>
          {!!f.size && <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>}
          <button data-cuelume-close onClick={() => onRemove(i)} className="ml-auto rounded px-2 py-0.5 text-xs hover:bg-accent" aria-label={`Remove ${selectionName(f)}`}>✕</button>
        </div>
      ))}
      {!files.length && <p className="py-2 text-sm text-muted-foreground">Drop audio files or open the file manager.</p>}
    </div>
  );
}

export default function Mp3ToM4b() {
  const { files, setFiles, rejected, accept, pickFiles } = useAudioFiles();
  const { bitrate, qualityId, setQuality } = useApp();
  const addJob = useApp((s) => s.addJob);
  const updateJob = useApp((s) => s.updateJob);
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('Ready');
  const activeJob = useRef<string | null>(null);
  const [cover, setCover] = useState<AudioSelection | null>(null);
  useEffect(() => {
    (window as any).bpm4b?.onProgress?.((p: number) => {
      setProg(p);
      const operationId = activeJob.current;
      if (!operationId) return;
      const detail = `FFmpeg ${p}%`;
      setPhase(`Encoding M4B · ${detail}`);
      updateJob(operationId, { progress: p, detail });
      reportOperationProgress({ operationId, task: 'Build M4B', stage: 'Encoding M4B', progress: p, detail });
    });
  }, [updateJob]);
  const pick = async () => {
    const incoming = await pickFiles();
    if (incoming.length) {
      if (incoming.some((f) => f.file) && !(window as any).bpm4b) {
        for (const f of incoming) if (f.url) { const audio = new Audio(f.url); audio.preload = 'metadata'; audio.onloadedmetadata = () => setPreviewDuration((d) => d + (Number.isFinite(audio.duration) ? audio.duration : 0)); }
      }
      setFiles((p) => [...p, ...incoming]);
    }
  };
  const [previewDuration, setPreviewDuration] = useState(0);
  const pickFolder = async () => {
    const incoming = await pickLocalFolder();
    if (incoming.length) setFiles((current) => [...current, ...incoming].sort((a, b) => selectionName(a).localeCompare(selectionName(b), undefined, { numeric: true, sensitivity: 'base' })));
  };
  const pickCover = async () => { const r = await pickImage(); if (r) { setCover(r); sfx.success(false); } };
  const make = async () => {
    const desktop = (window as any).bpm4b;
    const out = desktop?.pickSave ? await desktop.pickSave({ defaultPath: 'audiobook.m4b' }) : undefined;
    if (desktop && !out) { sfx.error(); return; }
    const jobId = addJob({ title: 'Build M4B audiobook', kind: 'audiobook', state: 'processing', progress: 1, detail: `${files.length} audio file(s)` });
    activeJob.current = jobId;
    setPhase('Loading encoder');
    reportOperationProgress({ operationId: jobId, task: 'Build M4B', stage: 'Starting', progress: 1, detail: `${files.length} audio file(s)` });
    setProg(1); setErr(''); setBusy(true); sfx.loading(); sfx.count(1200);
    try {
      if (desktop) await desktop.mp3ToM4b({ inputs: files.map(selectionPath), output: out, bitrate, cover: cover?.path });
      else await buildM4bInBrowser({ inputs: files, bitrate, chapterTitles: files.map(selectionName), cover, operationId: jobId, onStatus: (status) => {
        setPhase(`${status.stage}${status.detail ? ` · ${status.detail}` : ''}`);
        setProg(status.progress);
        updateJob(jobId, { progress: status.progress, detail: status.detail || status.stage });
      } });
      setProg(100); setPhase('Complete'); activeJob.current = null; updateJob(jobId, { state: 'completed', progress: 100, detail: 'Audiobook created successfully' }); sfx.success(true);
    }
    catch (e) { const message = e instanceof Error ? e.message : String(e); setErr(message); updateJob(jobId, { state: 'failed', detail: message }); sfx.error(); }
    finally { activeJob.current = null; setBusy(false); }
  };
  return (
    <div className="grid gap-4" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) accept(e.dataTransfer.files); }}>
      <Card>
        <h2 className="text-lg font-bold">MP3 → M4B</h2>
        <p className="text-sm text-muted-foreground">Multiple MP3s — chapter names detected from filenames. Audio only.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={pick}>Add audio files</Button>
          <Button variant="outline" onClick={pickFolder}>Add folder</Button>
          <Button variant="outline" onClick={pickCover}>{cover ? 'Change cover' : 'Choose cover'}</Button>
          {cover && <span className="truncate text-xs text-muted-foreground" title={cover.name}>{cover.name}</span>}
          <Button variant="secondary" onClick={make} disabled={!files.length}>Build M4B (Ctrl+Enter)</Button>
        </div>
          {busy
          ? <div className="mt-3 grid gap-1.5"><BarVisualizer aria-label="Processing" barCount={24} className="h-14 text-primary" loading /><p className="text-center text-xs text-muted-foreground">processing…</p></div>
          : files.length > 0 && files.some((f) => f.url) ? <div className="mt-3 grid gap-2">{files.filter((f) => f.url).map((f) => <div key={f.url} className="rounded-lg bg-secondary p-3"><div className="mb-2 flex justify-between gap-2 text-xs"><span className="truncate">{selectionName(f)}</span><span>{previewDuration ? `${Math.round(previewDuration / 60)} min total` : 'Local preview'}</span></div><audio controls preload="metadata" src={f.url} className="h-9 w-full" /></div>)}</div> : files.length > 0 && <div className="mt-3"><Waveform aria-label="Chapter lineup" className="h-14" variant="line" peaks={Float32Array.from({ length: 240 }, (_, i) => Math.sin((i / 240) * Math.PI) ** 0.6 * (0.55 + 0.45 * Math.abs(Math.sin(i * 0.37))))} duration={files.length * 60} defaultCurrentTime={12} /></div>}
        {prog > 0 && <Progress value={prog} className="mt-3" />}
        {busy && <p role="status" aria-live="polite" className="mt-1 text-xs text-muted-foreground">{phase} · {prog}%</p>}
        {err && <p role="alert" className="mt-2 whitespace-pre-line text-sm text-destructive">{err}</p>}
        {!!rejected.length && <p className="mt-1 text-xs text-muted-foreground">Rejected non-audio: {rejected.join(', ')}</p>}
      </Card>
      {files.some((f) => f.file) && <Card><h3 className="font-semibold">Browser encoding</h3><p className="mt-1 text-sm text-muted-foreground">M4B files are encoded locally in your browser and downloaded to your device. Very large audiobooks can exceed browser memory limits; use desktop for long books.</p></Card>}
      <Card><h3 className="font-semibold">Chapters from files ({files.length})</h3><FileList files={files} onRemove={(i) => setFiles((p) => p.filter((_, j) => j !== i))} /></Card>
      <Card><h3 className="font-semibold">Audio quality</h3><div className="mt-2"><QualityKnob value={qualityId} onChange={(q) => setQuality(q.id, q.bitrate)} /></div></Card>
    </div>
  );
}
