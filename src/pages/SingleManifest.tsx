import { useEffect, useRef, useState } from 'react';
import { Card, Button, Input, Progress } from '@/components/ui';
import { sfx } from '@/lib/sound';
import { pickImage, pickLocalFiles, type LocalSelection } from '@/lib/files';
import { buildM4bInBrowser } from '@/lib/m4b-browser';
import { useApp } from '@/lib/store';
import { reportOperationProgress } from '@/lib/progress';

interface Mark { time: number; title: string; }
const parseStamp = (s: string): number | null => {
  const m = s.trim().match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
};
const fmt = (s: number) => `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function SingleManifest() {
  const addJob = useApp((s) => s.addJob);
  const updateJob = useApp((s) => s.updateJob);
  const [file, setFile] = useState<LocalSelection | null>(null);
  const [marks, setMarks] = useState<Mark[]>([
    { time: 0, title: 'Chapter 1' }, { time: 3055, title: 'Chapter 2' },
    { time: 6140, title: 'Chapter 3' }, { time: 9067, title: 'Chapter 4' },
  ]);
  const [stamp, setStamp] = useState('00:00:00');
  const [name, setName] = useState('');
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState('');
  const [cover, setCover] = useState<LocalSelection | null>(null);
  const [duration, setDuration] = useState(0);
  const [playhead, setPlayhead] = useState(0);
  const [phase, setPhase] = useState('Ready');
  const activeJob = useRef<string | null>(null);
  useEffect(() => {
    (window as any).bpm4b?.onProgress?.((p: number) => {
      setProg(p);
      const operationId = activeJob.current;
      if (!operationId) return;
      const detail = `FFmpeg ${p}%`;
      setPhase(`Encoding M4B · ${detail}`);
      updateJob(operationId, { progress: p, detail });
      reportOperationProgress({ operationId, task: 'Build M4B from chapter timeline', stage: 'Encoding M4B', progress: p, detail });
    });
  }, [updateJob]);
  const total = duration || Math.max(...marks.map((m) => m.time), 1) * 1.15;
  const pick = async () => {
    const selected = await pickLocalFiles('audio', false);
    if (selected[0]) {
      setFile(selected[0]); setErr(''); setDuration(0); setPlayhead(0);
      if (selected[0].url) {
        const audio = new Audio(selected[0].url);
        audio.onloadedmetadata = () => {
          const seconds = audio.duration;
          if (Number.isFinite(seconds) && seconds < Math.max(...marks.map((mark) => mark.time))) {
            setMarks([0, .25, .5, .75].map((fraction, index) => ({ time: Math.floor(seconds * fraction), title: `Chapter ${index + 1}` })));
          }
        };
      }
      sfx.success(false);
    }
  };
  const pickCover = async () => {
    const selected = await pickImage();
    if (selected) { setCover(selected); sfx.success(false); }
  };
  const add = () => {
    const t = parseStamp(stamp);
    if (t === null) { setErr(`Bad timestamp "${stamp}" — use HH:MM:SS.`); sfx.error(); return; }
    if (!name.trim()) { setErr('Give the chapter a title first.'); sfx.error(); return; }
    if (marks.some((m) => m.time === t)) { setErr('A chapter already starts at that timestamp.'); sfx.error(); return; }
    setErr('');
    setMarks((m) => [...m, { time: t, title: name.trim() }].sort((a, b) => a.time - b.time));
    setName(''); sfx.success(false);
  };
  const importText = (raw: string) => {
    const out: Mark[] = [];
    for (const line of raw.split('\n')) {
      const m = line.match(/(.+?)\s+(\d+:\d+:\d+)\s*$/);
      if (!m) continue;
      const t = parseStamp(m[2]);
      if (t !== null && m[1].trim()) out.push({ time: t, title: m[1].trim() });
    }
    if (out.length) { setMarks(out.sort((a, b) => a.time - b.time)); setErr(''); sfx.success(false); }
    else { setErr('No lines looked like "Chapter 1 00:00:00".'); sfx.error(); }
  };
  const make = async () => {
    if (!file) { setErr('Pick the giant MP3 first.'); sfx.error(); return; }
    const desktop = (window as any).bpm4b;
    const out = desktop?.pickSave ? await desktop.pickSave({ defaultPath: 'audiobook.m4b' }) : undefined;
    if (desktop && !out) return;
    const jobId = addJob({ title: 'Build M4B from chapter timeline', kind: 'audiobook', state: 'processing', progress: 1, detail: `${marks.length} chapters` });
    activeJob.current = jobId;
    setPhase('Loading encoder');
    reportOperationProgress({ operationId: jobId, task: 'Build M4B from chapter timeline', stage: 'Starting', progress: 1, detail: `${marks.length} chapters` });
    sfx.loading();
    try {
      if (desktop) await desktop.mp3ToM4b({ inputs: [file.path], output: out, chapters: marks.map((m) => ({ start: m.time, title: m.title })), cover: cover?.path });
      else await buildM4bInBrowser({ inputs: [file], bitrate: '128k', chapters: marks.map((m) => ({ start: m.time, title: m.title })), cover, operationId: jobId, onStatus: (status) => {
        setProg(status.progress); setPhase(`${status.stage}${status.detail ? ` · ${status.detail}` : ''}`);
        updateJob(jobId, { progress: status.progress, detail: status.detail || status.stage });
      } });
      setProg(100); setPhase('Complete'); updateJob(jobId, { state: 'completed', progress: 100, detail: `${marks.length} chapter markers written` }); sfx.success(true);
    } catch (e) { const message = e instanceof Error ? e.message : String(e); setErr(message); updateJob(jobId, { state: 'failed', detail: message }); sfx.error(); }
    finally { activeJob.current = null; }
  };
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">Single MP3 + Chapter Manifest</h2>
        <p className="text-sm text-muted-foreground">One giant MP3, chapters from your timestamps — visual timeline, no text files.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={pick}>{file ? 'Change MP3' : 'Pick MP3'}</Button>
          {file && <span className="truncate text-sm" title={file.name}>{file.name}</span>}
          {file?.url && <audio controls preload="metadata" src={file.url} aria-label="Preview selected MP3" className="h-9 max-w-full" />}
          <Button variant="outline" onClick={pickCover}>{cover ? 'Change cover' : 'Choose cover'}</Button>
          {cover && <span className="truncate text-xs text-muted-foreground" title={cover.name}>{cover.name}</span>}
          <Button variant="secondary" onClick={make} disabled={!file}>Build M4B</Button>
        </div>
        {prog > 0 && <Progress value={prog} className="mt-3" />}
        {prog > 0 && <p role="status" aria-live="polite" className="mt-1 text-xs text-muted-foreground">{phase} · {prog}%</p>}
        {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      </Card>
      <Card>
        <h3 className="font-semibold">Timeline ({marks.length} chapters)</h3>
        <div className="relative mt-2 h-20 overflow-hidden rounded-lg border border-border bg-secondary" aria-label="Chapter timeline">
          <input aria-label="Seek audio timeline" type="range" min={0} max={Math.max(1, duration || total)} step="1" value={playhead} onChange={(e) => { const time = Number(e.target.value); setPlayhead(time); const audio = document.querySelector<HTMLAudioElement>('[data-manifest-audio]'); if (audio) audio.currentTime = time; }} className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" />
          <div className="pointer-events-none absolute inset-x-0 top-2 h-14 px-2">
            {marks.map((m, i) => (
              <button key={i} data-cuelume-select title={`${m.title} — ${fmt(m.time)}`} onClick={(event) => { event.stopPropagation(); setMarks((mm) => mm.filter((_, j) => j !== i)); }}
                className="pointer-events-auto absolute top-1 z-20 h-12 w-1.5 rounded bg-primary hover:bg-destructive" style={{ left: `${(m.time / total) * 100}%` }} aria-label={`Remove ${m.title}`} />
            ))}
            <div className="absolute inset-x-2 top-1/2 h-px bg-border" />
            <div className="absolute top-0 h-14 w-px bg-foreground" style={{ left: `${(playhead / total) * 100}%` }} />
          </div>
          <div className="absolute inset-x-2 bottom-1 flex justify-between font-mono text-[10px] text-muted-foreground"><span>00:00:00</span><span>{fmt(total)}</span></div>
        </div>
        <div className="mt-2 grid gap-1">
          {marks.map((m, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <button type="button" onClick={() => { setPlayhead(m.time); const audio = document.querySelector<HTMLAudioElement>('[data-manifest-audio]'); if (audio) { audio.currentTime = m.time; void audio.play(); } }} aria-label={`Play from ${m.title}`} className="rounded px-1.5 hover:bg-accent">▶</button>
              <Input aria-label={`Chapter ${i + 1} time`} value={fmt(m.time)} onChange={(e) => { const t = parseStamp(e.target.value); if (t !== null) setMarks((mm) => mm.map((x, j) => (j === i ? { ...x, time: t } : x)).sort((a, b) => a.time - b.time)); }} className="w-28 font-mono" />
              <Input aria-label={`Chapter ${i + 1} title`} value={m.title} onChange={(e) => setMarks((mm) => mm.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className="flex-1" />
              <button data-cuelume-close onClick={() => setMarks((mm) => mm.filter((_, j) => j !== i))} className="rounded px-2 py-1 text-xs hover:bg-accent" aria-label={`Delete ${m.title}`}>✕</button>
            </div>
          ))}
        </div>
        {file?.url && <audio data-manifest-audio controls preload="metadata" src={file.url} aria-label="Play selected MP3" className="mt-3 h-9 w-full" onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)} onTimeUpdate={(e) => setPlayhead(e.currentTarget.currentTime)} />}
        <div className="mt-2 flex flex-wrap gap-2">
          <Input aria-label="New chapter timestamp" value={stamp} onChange={(e) => setStamp(e.target.value)} className="w-28 font-mono" placeholder="00:00:00" />
          <Input aria-label="New chapter title" value={name} onChange={(e) => setName(e.target.value)} className="min-w-40 flex-1" placeholder="Chapter title" />
          <Button variant="secondary" onClick={add}>Add chapter</Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { const t = marks.map((m) => `${m.title} ${fmt(m.time)}`).join('\n'); navigator.clipboard?.writeText(t).catch(() => {}); sfx.success(false); }}>Export manifest</Button>
          <textarea data-cuelume-type rows={2} className="min-w-40 flex-1 rounded-lg border border-input bg-background p-2 font-mono text-xs" aria-label="Import manifest text" onBlur={(e) => e.target.value.trim() && importText(e.target.value)} placeholder={'Chapter 1 00:00:00\nChapter 2 00:50:55'} />
        </div>
      </Card>
    </div>
  );
}
