import { useState } from 'react';
import { Card, Button, Input, Badge } from '@/components/ui';
import { sfx } from '@/lib/sound';
import { detect as detectLocal, type DetectedSection } from '@/lib/structure';
import { useApp } from '@/lib/store';
import { reportOperationProgress } from '@/lib/progress';

type Detected = DetectedSection;
const ENGINES: [string, string, string][] = [
  ['episodes', 'Episodes / serialized fiction', 'Episode 1 · Epsoide 1 · Ep. 1 · Arc 1 · Saga I'],
  ['chapters', 'Chapters / subsections', 'Chapter 2 Bess · Chapter IV · Part 1 · Section 1.1'],
  ['acts', 'Acts', 'Act 1 · Act I · Canto IV'],
  ['scenes', 'Scenes (indent as subsections)', 'Scene 2 · Scene 2: The Courtyard'],
  ['volumes', 'Volumes / books / tomes', 'Volume 1 · Vol. II · Book One · Tome 1'],
  ['days', 'Days / nights / entries / letters', 'Day 1 · Night 3 · Entry 1 · Letter 1'],
  ['numbered', 'Numbered titles', '1. The Beginning · 01 - Intro'],
  ['classical', 'Classical headings', 'PROLOGUE · EPILOGUE · PREFACE · CONCLUSION'],
  ['bold', 'Bold standalone lines', '**Chapter 2** · **Episode 1** · <b>Chapter 3</b>'],
  ['headings', 'Markdown / HTML headings', '# H1 · ## H2 · <h1> · <h2>'],
  ['cleanupRedundantNumbers', 'Redundant-number cleanup', 'Chapter 1: 1. The Awakening → Chapter 1: The Awakening'],
];

export default function Chapters() {
  const [engines, setEngines] = useState<Record<string, boolean>>(Object.fromEntries(ENGINES.map(([k]) => [k, true])));
  const [customName, setCustomName] = useState('');
  const [customPattern, setCustomPattern] = useState('^Part\\s+\\d+');
  const [customError, setCustomError] = useState('');
  const [customs, setCustoms] = useState<{ name: string; pattern: string }[]>([]);
  const [text, setText] = useState('Chapter 1\nIt was a bright day.\n\nDay 1\nA detail.\n\nChapter 2\nMore story.\n\nEp. 1: Pilot');
  const [out, setOut] = useState<Detected[] | null>(null);
  const addJob = useApp((s) => s.addJob);
  const updateJob = useApp((s) => s.updateJob);
  const toggle = (k: string) => setEngines((e) => ({ ...e, [k]: !e[k] }));
  const addCustom = () => {
    try { new RegExp(customPattern, 'i'); } catch (e) { setCustomError(`Invalid regex: ${e instanceof Error ? e.message : String(e)}`); sfx.error(); return; }
    if (!customName.trim()) { setCustomError('Give the engine a name first.'); return; }
    setCustomError('');
    setCustoms((c) => [...c, { name: customName.trim(), pattern: customPattern }]);
    setCustomName(''); sfx.success(false);
  };
  const detect = async () => {
    const jobId = addJob({ title: 'Detect chapter structure', kind: 'structure', state: 'processing', progress: 20, detail: 'Analyzing text' });
    reportOperationProgress({ operationId: jobId, task: 'Detect chapter structure', stage: 'Analyzing text', progress: 20, detail: `${text.length.toLocaleString()} characters` });
    const payload = { text, engines: { ...engines, custom: customs } };
    const bridge = (window as any).bpm4b;
    try {
      let result: Detected[];
      try {
        const remote = await bridge?.detectStructure?.(payload);
        result = Array.isArray(remote) ? remote : detectLocal(payload.text, payload.engines);
      } catch { result = detectLocal(payload.text, payload.engines); }
      setOut(result);
      reportOperationProgress({ operationId: jobId, task: 'Detect chapter structure', stage: 'Detection complete', progress: 100, detail: `${result.length} section(s) found` });
      updateJob(jobId, { state: 'completed', progress: 100, detail: `Found ${result.length} section(s)` });
      sfx.success(false);
    } catch (error) {
      updateJob(jobId, { state: 'failed', detail: error instanceof Error ? error.message : String(error) });
      sfx.error();
    }
  };
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">Chapter Studio — Delimiter Engines</h2>
        <p className="text-sm text-muted-foreground">Turn individual engines on or off. With Days off, a novel with “Chapter 1 / Day 1 / Chapter 2 / Day 2” keeps Days as body text instead of chapters.</p>
      </Card>
      <Card>
        <h3 className="font-semibold">Engines</h3>
        <div className="mt-2 grid gap-1.5">
          {ENGINES.map(([k, label, hint]) => (
            <label key={k} className="flex items-start gap-2 rounded-lg border border-border p-2 text-sm">
              <input data-cuelume-toggle type="checkbox" checked={!!engines[k]} onChange={() => toggle(k)} className="mt-1" aria-label={label} />
              <span><span className="font-medium">{label}</span><br /><span className="text-xs text-muted-foreground">{hint}</span></span>
            </label>
          ))}
        </div>
        <h4 className="mt-3 font-medium">Custom regex engine</h4>
        <div className="mt-1 flex flex-wrap gap-2">
          <Input placeholder="Name" aria-label="Custom engine name" value={customName} onChange={(e) => setCustomName(e.target.value)} />
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
        <h3 className="font-semibold">Preview</h3>
        <textarea data-cuelume-type value={text} onChange={(e) => setText(e.target.value)} rows={8} className="mt-2 w-full rounded-lg border border-input bg-background p-3 font-mono text-xs" aria-label="Sample text" />
        <div className="mt-2"><Button onClick={detect}>Detect structure</Button></div>
        {out && (
          <div className="mt-2 rounded bg-secondary p-3 text-xs">
            <p className="mb-1 font-semibold">Detected {out.length} section(s)</p>
            {out.map((d, i) => (
              <div key={i} style={{ paddingLeft: (d.level ?? 1) * 12 }} className="py-0.5"><Badge>{d.type}</Badge> <span>{d.title || d.line}</span></div>
            ))}
            {!out.length && <p className="text-muted-foreground">Nothing matched — enable more engines.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
