// Client-side structure detection — mirrors electron/ipc/detect.ts exactly.
// Used as a fallback when the Electron IPC bridge (window.bpm4b) is not
// available, e.g. when running the renderer in a plain browser.

export interface EngineState {
  chapters: boolean; episodes: boolean; acts: boolean; scenes: boolean;
  volumes: boolean; days: boolean; numbered: boolean; classical: boolean;
  headings: boolean; bold: boolean; cleanupRedundantNumbers: boolean;
  custom: { name: string; pattern: string }[];
}

const RX: Record<string, RegExp> = {
  episodes: /^(episode|epsoide|ep\.|arc|installment|saga)\s+[ivxlc\d]+/i,
  chapters: /^(chapter|part|section)\s+[\w\d.\s:—-]+/i,
  acts: /^(act|canto|scene)\s+[ivxlc\d]+/i,
  volumes: /^(volume|vol\.?|book|tome)\s+[\w\d]+/i,
  days: /^(day|night|entry|letter|log)\s+\d+/i,
  numbered: /^(\d{1,3}\s*[-.:]\s+.+|[ivxlc]+\.\s+.+)/i,
  classical: /^(prologue|epilogue|preface|conclusion|foreword|afterword)/i,
};

export interface DetectedSection { line: string; type: string; title: string; level: number; }

export function detect(text: string, engines: Partial<EngineState> = {}): DetectedSection[] {
  const { custom, ...flags } = engines;
  const on: Record<string, boolean> = {
    chapters: true, episodes: true, acts: true, scenes: true, volumes: true,
    days: true, numbered: true, classical: true, headings: true, bold: true,
    cleanupRedundantNumbers: true, ...flags,
  };
  const cleanup = (t: string) => (on.cleanupRedundantNumbers
    ? t.replace(/^((?:chapter|part|episode|section)\s+\S+[:\s—-]+)\d{1,3}\s*[-.:]\s+/i, '$1').trim()
    : t);
  const out: DetectedSection[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (on.headings && (/^#{1,6}\s+/.test(line) || /^<h[1-6][^>]*>.+<\/h[1-6]>$/i.test(line))) {
      out.push({ line, type: 'heading', title: cleanup(line.replace(/^#{1,6}\s+/, '').replace(/<\/?h[1-6][^>]*>/gi, '')), level: 1 });
      continue;
    }
    if (on.bold && (/^\*\*.+\*\*$/.test(line) || /^<b>.+<\/b>$/i.test(line))) {
      const t = line.replace(/^\*\*|\*\*$/g, '').replace(/<\/?b>/gi, '');
      out.push({ line, type: 'bold-line', title: cleanup(t), level: 2 });
      continue;
    }
    for (const [k, rx] of Object.entries(RX)) {
      if (k === 'acts' && !on.acts && !on.scenes) continue;
      if (k !== 'acts' && (on as Record<string, boolean>)[k] === false) continue;
      if (rx.test(line)) {
        out.push({ line, type: k, title: cleanup(line), level: k === 'volumes' || k === 'classical' ? 0 : 1 });
        break;
      }
    }
  }
  const customs = Array.isArray(custom) ? custom : [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || out.some((o) => o.line === line)) continue;
    for (const c of customs) {
      try {
        if (c?.pattern && new RegExp(c.pattern, 'i').test(line)) {
          out.push({ line, type: `custom:${c.name}`, title: cleanup(line), level: 1 });
          break;
        }
      } catch { /* invalid custom regex — skip */ }
    }
  }
  return out;
}

export interface SplitChapter { title: string; content: string; }

export function splitChapters(text: string, engines: Partial<EngineState> = {}): SplitChapter[] {
  const marks = new Set(detect(text, engines).map((d) => d.line));
  const paras = text.split(/\n{2,}/);
  const out: SplitChapter[] = [];
  let title: string | null = null;
  let buf: string[] = [];
  const flush = () => {
    const content = buf.join('\n\n').trim();
    if (content.length > 80) out.push({ title: title ?? `Chapter ${out.length + 1}`, content });
  };
  for (const p of paras) {
    const first = p.split('\n')[0]?.trim() ?? '';
    if (marks.has(first) || marks.has(p.trim())) { flush(); title = first || p.trim().slice(0, 80); buf = []; }
    else buf.push(p);
  }
  flush();
  if (out.length >= 2) return out;
  const target = Math.min(30000, Math.max(3000, Math.floor(text.length / 10)));
  const blocks: SplitChapter[] = [];
  let cur = '';
  let n = 1;
  for (const para of paras) {
    if (cur && cur.length + para.length > target) { blocks.push({ title: `Chapter ${n++}`, content: cur.trim() }); cur = para; }
    else cur += (cur ? '\n\n' : '') + para;
  }
  if (cur.trim()) blocks.push({ title: `Chapter ${n}`, content: cur.trim() });
  return blocks.length ? blocks : [{ title: 'Chapter 1', content: text }];
}