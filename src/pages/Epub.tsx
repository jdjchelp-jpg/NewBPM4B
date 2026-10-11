import { useEffect, useRef, useState } from 'react';
import { Card, Button, Input, Badge, Progress } from '@/components/ui';
import { sfx } from '@/lib/sound';
import { pickImage, pickLocalFiles, type LocalSelection } from '@/lib/files';
import { detect as detectLocal, type DetectedSection } from '@/lib/structure';
import { useApp } from '@/lib/store';
import { reportOperationProgress } from '@/lib/progress';
import { buildEpubInBrowser } from '@/lib/epub-browser';

type Detected = DetectedSection;
const LANGS = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'pl', 'ja', 'zh', 'ar', 'hi'];

export default function Epub() {
  const [files, setFiles] = useState<LocalSelection[]>([]);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('en');
  const [description, setDescription] = useState('');
  const [text, setText] = useState('Chapter 1\n\nIt was a bright day.\n\nEp. 2: Pilot\n\nDay 1 was only the start.');
  const [engines, setEngines] = useState<Record<string, boolean>>({ episodes: true, chapters: true, acts: true, scenes: true, volumes: true, days: true, numbered: true, bold: true, headings: true, classical: true, cleanupRedundantNumbers: true });
  const [customName, setCustomName] = useState('');
  const [customPattern, setCustomPattern] = useState('^Part\\s+\\d+');
  const [customError, setCustomError] = useState('');
  const [customs, setCustoms] = useState<{ name: string; pattern: string }[]>([]);
  const [out, setOut] = useState<Detected[] | null>(null);
  const [msg, setMsg] = useState('');
  const [cover, setCover] = useState<LocalSelection | null>(null);
  const [busy, setBusy] = useState(false);
  const [buildProgress, setBuildProgress] = useState(0);
  const [buildStage, setBuildStage] = useState('');
  const [sourceHasReadableText, setSourceHasReadableText] = useState(true);
  const activeJob = useRef<string | null>(null);
  const addJob = useApp((s) => s.addJob);
  const updateJob = useApp((s) => s.updateJob);
  useEffect(() => {
    (window as any).bpm4b?.onProgress?.((progress: number) => {
      const operationId = activeJob.current;
      if (!operationId) return;
      setBuildProgress(progress);
      setBuildStage(`Writing EPUB · ${progress}%`);
      updateJob(operationId, { progress, detail: `Writing EPUB · ${progress}%` });
      reportOperationProgress({ operationId, task: 'Build EPUB', stage: 'Writing EPUB', progress, detail: `${progress}%` });
    });
  }, [updateJob]);
  const toggle = (k: string) => setEngines((e) => ({ ...e, [k]: !e[k] }));
  const pickDocs = async () => {
    const jobId = addJob({ title: 'Import book documents', kind: 'documents', state: 'processing', progress: 5, detail: 'Choose document files' });
    reportOperationProgress({ operationId: jobId, task: 'Import book documents', stage: 'Choose files', progress: 5 });
    try {
      const r = await pickLocalFiles('book', true);
      if (!r.length) { updateJob(jobId, { state: 'cancelled', detail: 'No files selected' }); return; }
      setFiles((p) => [...p, ...r]);
      reportOperationProgress({ operationId: jobId, task: 'Import book documents', stage: 'Reading selected files', progress: 35, detail: `${r.length} file(s)` });
      const readable: string[] = [];
      const notes: string[] = [];
      for (const selected of r) {
        if (selected.path) {
          try {
            const d = await (window as any).bpm4b?.readDoc?.({ file: selected.path });
            if (d?.text) readable.push(String(d.text));
            if (d?.note) notes.push(d.note);
          } catch (error) { notes.push(`${selected.name}: ${error instanceof Error ? error.message : String(error)}`); }
        } else if (selected.file && /\.(txt|md|markdown|html?)$/i.test(selected.name)) {
          readable.push(await selected.file.text());
        } else if (selected.file) notes.push(`${selected.name}: browser text extraction is unavailable for this format`);
      }
      if (readable.length) {
        setText(readable.join('\n\n'));
        setSourceHasReadableText(true);
        setMsg(`Loaded full text from ${readable.length} document(s).${notes.length ? ` ${notes.length} unsupported file(s) need text extraction.` : ''}`);
      } else {
        setSourceHasReadableText(false);
        setMsg(r.some((file) => file.file)
          ? 'These files were imported, but this browser cannot extract their text. Use TXT, Markdown, or HTML, or paste the text below.'
          : (notes[0] ?? 'No readable text found in the selected documents.'));
      }
      updateJob(jobId, { state: 'completed', progress: 100, detail: `${r.length} file(s) selected${readable.length ? `, text loaded from ${readable.length}` : ', no readable text found'}` });
      sfx.success(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMsg(`Could not import documents: ${message}`);
      updateJob(jobId, { state: 'failed', detail: message });
      sfx.error();
    }
  };
  const pickCover = async () => {
    const r = await pickImage();
    if (r) { setCover(r); sfx.success(false); }
  };
  const build = async () => {
    const jobId = addJob({ title: `Build EPUB${title.trim() ? ` — ${title.trim()}` : ''}`, kind: 'ebook', state: 'processing', progress: 10, detail: 'Choose output location' });
    activeJob.current = jobId;
    reportOperationProgress({ operationId: jobId, task: 'Build EPUB', stage: 'Choose output location', progress: 10 });
    setBusy(true); setBuildProgress(10); setBuildStage('Preparing EPUB');
    try {
      const bridge = (window as any).bpm4b;
      const metadata = { title: title || 'Untitled', author: author || 'Unknown', genre, language, description, cover: cover?.path };
      sfx.loading();
      if (bridge?.pickSave && bridge?.docToEpub) {
        const output = await bridge.pickSave({ defaultPath: `${title || 'book'}.epub` });
        if (!output) { updateJob(jobId, { state: 'cancelled', detail: 'Save dialog cancelled' }); return; }
        updateJob(jobId, { progress: 30, detail: 'Splitting chapters and writing EPUB' });
        reportOperationProgress({ operationId: jobId, task: 'Build EPUB', stage: 'Splitting chapters and writing EPUB', progress: 30 });
        const rr = await bridge.docToEpub({ inputs: files.map((f) => f.path).filter(Boolean), text: files.length ? undefined : text, output, meta: metadata, engines: { ...engines, custom: customs } });
        setMsg(`EPUB saved: ${rr?.output ?? output} (${rr?.chapters ?? '?'} chapters)`);
        setBuildProgress(100); setBuildStage('Complete');
        reportOperationProgress({ operationId: jobId, task: 'Build EPUB', stage: 'Complete', progress: 100, detail: `${rr?.chapters ?? '?'} chapters written` });
        updateJob(jobId, { state: 'completed', progress: 100, detail: `${rr?.chapters ?? '?'} chapters written` });
      } else {
        if (files.length && !sourceHasReadableText) throw new Error('The selected document format could not be read in this browser. Choose TXT, Markdown, or HTML, or paste readable text into the editor.');
        const result = await buildEpubInBrowser({ text, metadata, engines: { ...engines, custom: customs }, cover, operationId: jobId, onStatus: (status) => {
          setBuildProgress(status.progress); setBuildStage(`${status.stage}${status.detail ? ` · ${status.detail}` : ''}`);
          updateJob(jobId, { progress: status.progress, detail: status.detail || status.stage });
        } });
        setMsg(`EPUB downloaded: ${result.filename} (${result.chapters} chapters)`);
        updateJob(jobId, { state: 'completed', progress: 100, detail: `${result.chapters} chapters downloaded` });
      }
      sfx.success(true);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setMsg(message); updateJob(jobId, { state: 'failed', detail: message }); sfx.error();
    } finally { activeJob.current = null; setBusy(false); }
  };
  const addCustom = () => {
    try { new RegExp(customPattern, 'i'); } catch (e) { setCustomError(`Invalid regex: ${e instanceof Error ? e.message : String(e)}`); sfx.error(); return; }
    if (!customName.trim()) { setCustomError('Give the engine a name first.'); return; }
    setCustomError('');
    setCustoms((c) => [...c, { name: customName.trim(), pattern: customPattern }]);
    setCustomName(''); sfx.success(false);
  };
  const detect = async () => {
    const jobId = addJob({ title: 'Detect book structure', kind: 'structure', state: 'processing', progress: 20, detail: 'Analyzing book text' });
    reportOperationProgress({ operationId: jobId, task: 'Detect book structure', stage: 'Analyzing book text', progress: 20, detail: `${text.length.toLocaleString()} characters` });
    try {
      const payload = { text, engines: { ...engines, custom: customs } };
      let result: Detected[];
      try {
        const remote = await (window as any).bpm4b?.detectStructure?.(payload);
        result = Array.isArray(remote) ? remote : detectLocal(payload.text, payload.engines);
      } catch { result = detectLocal(payload.text, payload.engines); }
      setOut(result);
      reportOperationProgress({ operationId: jobId, task: 'Detect book structure', stage: 'Detection complete', progress: 100, detail: `${result.length} section(s) found` });
      updateJob(jobId, { state: 'completed', progress: 100, detail: `Found ${result.length} section(s)` }); sfx.success(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMsg(`Structure detection failed: ${message}`); updateJob(jobId, { state: 'failed', detail: message }); sfx.error();
    }
  };
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">EPUB Creator</h2>
        <p className="text-sm text-muted-foreground">Build an EPUB in the web app (download) or desktop app (save to disk). Text import supports TXT, Markdown, and HTML; you can also paste text.</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button onClick={pickDocs}>Add documents</Button>
          <Button variant="outline" onClick={pickCover}>{cover ? 'Change cover' : 'Choose cover'}</Button>
          {cover && <span className="truncate text-xs text-muted-foreground" title={cover.path ?? cover.name}>{cover.name}</span>}
          <Button variant="secondary" onClick={build} disabled={busy || (!files.length && !text.trim())}>{busy ? 'Building…' : 'Build EPUB'}</Button>
        </div>
        {files.map((f, i) => (
          <div key={f.name + i} className="flex items-center gap-2 border-b border-border py-1 text-sm">
            <span className="truncate" title={f.name}>{f.name}</span><Badge>DOC</Badge>
            <button data-cuelume-close onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} className="ml-auto rounded px-2 py-0.5 text-xs hover:bg-accent" aria-label={`Remove ${f.name}`}>✕</button>
          </div>
        ))}
        {busy && <div className="mt-3"><Progress value={buildProgress} /><p role="status" aria-live="polite" className="mt-1 text-xs text-muted-foreground">{buildStage} · {buildProgress}%</p></div>}
        {msg && <p role="status" className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{msg}</p>}
      </Card>
      <Card>
        <h3 className="font-semibold">Book information</h3>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Input placeholder="Title" aria-label="Book title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="Author" aria-label="Book author" value={author} onChange={(e) => setAuthor(e.target.value)} />
          <Input placeholder="Genre" aria-label="Genre" value={genre} onChange={(e) => setGenre(e.target.value)} />
          <label className="flex items-center gap-2 text-sm">Language
            <select data-cuelume-select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" aria-label="Language">
              {LANGS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
        </div>
        <textarea data-cuelume-type value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Description / synopsis" className="mt-2 w-full rounded-lg border border-input bg-background p-3 text-sm" aria-label="Description" />
      </Card>
      <Card>
        <h3 className="font-semibold">Active delimiter engines</h3>
        <p className="text-xs text-muted-foreground">Disable an engine to ignore those markers.</p>
        <div className="mt-2 grid gap-1.5">
          {[
            ['episodes', 'Episodes & Serialized Fiction', 'Episode 1 · Epsoide 1 · Ep. 1 · Arc 1 · Saga I'],
            ['chapters', 'Standard Chapters & Subsections', 'Chapter 2 Bess · Chapter IV · Part 1 · Section 1.1'],
            ['acts', 'Plays & Acts', 'Act 1 · Act I · Canto IV'],
            ['scenes', 'Scenes (indent as subsections)', 'Scene 2 · Scene 2: The Courtyard'],
            ['volumes', 'Volumes, Tomes & Series', 'Volume 1 · Vol. II · Book One · Tome 1'],
            ['days', 'Journals, Days, Letters & Logs', 'Day 1 · Night 3 · Entry 1 · Letter 1'],
            ['numbered', 'Numbered Titles & Roman Numerals', '1. The Beginning · 01 - Intro · I. Awakening'],
            ['bold', 'Bold Standalone Lines', '**Chapter 2** · **Episode 1** · <b>Chapter 3</b>'],
            ['headings', 'Markdown & Document Headings', '# H1 · ## H2 · <h1> · <h2>'],
            ['classical', 'Classical Delimiters & Front/Back Matter', 'PROLOGUE · EPILOGUE · PREFACE · CONCLUSION'],
            ['cleanupRedundantNumbers', 'Clean redundant leading numbers', 'Chapter 1: 1. The Awakening → Chapter 1: The Awakening'],
          ].map(([k, label, hint]) => (
            <label key={k} className="flex items-start gap-2 rounded-lg border border-border p-2 text-sm">
              <input data-cuelume-toggle type="checkbox" checked={!!engines[k]} onChange={() => toggle(k)} className="mt-1" aria-label={label} />
              <span><span className="font-medium">{label}</span><br /><span className="text-xs text-muted-foreground">{hint}</span></span>
            </label>
          ))}
        </div>
        <h4 className="mt-3 font-medium">Custom regex engines</h4>
        <div className="mt-1 flex flex-wrap gap-2">
          <Input placeholder="Name (e.g. Parts)" aria-label="Custom engine name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
          <Input placeholder="^Part\s+\d+" aria-label="Custom regex pattern" value={customPattern} onChange={(e) => setCustomPattern(e.target.value)} />
          <Button variant="secondary" onClick={addCustom}>Add engine</Button>
        </div>
        {customError && <p role="alert" className="mt-1 text-xs text-destructive">{customError}</p>}
        {customs.map((c, i) => (
          <div key={c.name + i} className="mt-1 flex items-center gap-2 text-sm">
            <Badge>{c.name}</Badge><code className="font-mono text-xs">{c.pattern}</code>
            <button data-cuelume-close onClick={() => setCustoms((p) => p.filter((_, j) => j !== i))} className="ml-auto rounded px-2 py-0.5 text-xs hover:bg-accent" aria-label={`Remove ${c.name}`}>✕</button>
          </div>
        ))}
      </Card>
      <Card>
        <h3 className="font-semibold">Structure preview</h3>
        <textarea data-cuelume-type value={text} onChange={(e) => { setText(e.target.value); setSourceHasReadableText(true); }} rows={8} className="mt-2 w-full rounded-lg border border-input bg-background p-3 font-mono text-xs" aria-label="Source text" />
        <div className="mt-2"><Button onClick={detect}>Detect structure</Button></div>
        {out && (
          <div className="mt-2 rounded bg-secondary p-3 text-xs">
            <p className="mb-1 font-semibold">Detected {out.length} section(s)</p>
            {out.map((d, i) => (
              <div key={i} style={{ paddingLeft: (d.level ?? 1) * 12 }} className="py-0.5">
                <Badge>{d.type}</Badge> <span>{d.title || d.line}</span>
              </div>
            ))}
            {!out.length && <p className="text-muted-foreground">No sections matched the active engines.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

