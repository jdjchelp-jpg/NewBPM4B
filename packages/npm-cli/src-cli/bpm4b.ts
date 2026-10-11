#!/usr/bin/env node
// BPM4B CLI — npm / pypi / choco entry point.
// Pure engine imports keep this dependency-free (commander only).
import { Command } from 'commander';
import { detect, splitChapters, type EngineState } from '../electron/ipc/detect.ts';
import { spawn, execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const run = (args: string[]): Promise<void> =>
  new Promise((res, rej) => {
    const proc = spawn(FFMPEG, args, { stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true });
    proc.on('error', (e) => rej(new Error(`ffmpeg not found (set FFMPEG_PATH). ${e}`)));
    proc.on('close', (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`))));
  });
const listFile = (inputs: string[]): string => {
  const f = path.join(os.tmpdir(), `bpm4b-list-${Date.now()}.txt`);
  fs.writeFileSync(f, inputs.map((x) => `file '${path.resolve(x).replace(/\\/g, '/').replace(/'/g, "'\\''")}'`).join('\n'), 'utf8');
  return f;
};
const duration = (file: string): number => {
  try {
    const s = execFileSync(FFMPEG, ['-i', file], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] } as any);
    const m = String(s).match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  } catch (e: any) {
    const m = String(e?.stderr ?? '').match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
    if (m) return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  }
  return 0;
};

const escapeFfmetadata = (value: string) => value.replace(/\\/g, '\\\\').replace(/=/g, '\\=').replace(/;/g, '\\;').replace(/#/g, '\\#').replace(/\r?\n/g, ' ');
const parseTimestamp = (value: string) => {
  const match = value.trim().match(/^(?:(\d+):)?([0-5]?\d):([0-5]\d)$/);
  if (!match) throw new Error(`Invalid chapter timestamp "${value}". Use HH:MM:SS or MM:SS.`);
  return Number(match[1] ?? 0) * 3600 + Number(match[2]) * 60 + Number(match[3]);
};

const p = new Command();
p.name('bpm4b').description('BPM4B — audiobook & audio workspace CLI').version('14.0.0');

p.command('detect <file>')
  .description('Detect document structure with the delimiter engines')
  .option('--no-days', 'disable the Days/Journals engine')
  .option('--no-episodes', 'disable the Episodes engine')
  .option('--no-chapters', 'disable the Chapters engine')
  .option('--no-headings', 'disable Markdown/HTML headings')
  .option('--no-bold', 'disable bold standalone lines')
  .option('--no-cleanup', 'keep redundant leading numbers')
  .action((file: string, o: Record<string, boolean>) => {
    const text = fs.readFileSync(file, 'utf8');
    const engines: Partial<EngineState> = {
      days: o.days, episodes: o.episodes, chapters: o.chapters,
      headings: o.headings, bold: o.bold, cleanupRedundantNumbers: o.cleanup,
    };
    const out = detect(text, engines);
    if (!out.length) { console.log('No sections matched.'); return; }
    out.forEach((d) => console.log(`${'  '.repeat(Math.max(0, d.level))}[${d.type}] ${d.title}`));
    console.log(`\n${out.length} section(s).`);
  });

p.command('split <file>')
  .description('Split a document into chapters and print JSON')
  .action((file: string) => {
    const chapters = splitChapters(fs.readFileSync(file, 'utf8'), {});
    console.log(JSON.stringify(chapters, null, 2));
    console.error(`${chapters.length} chapter(s).`);
  });

p.command('m4b')
  .description('Concatenate audio files into an M4B with chapter markers')
  .requiredOption('-i, --input <files>', 'comma-separated input audio files')
  .requiredOption('-o, --output <file>', 'output .m4b path')
  .option('-b, --bitrate <br>', 'audio bitrate', '128k')
  .option('-t, --titles <names>', 'comma-separated chapter titles (one per input)')
  .option('-c, --chapters <list>', 'chapter list for a single input: "Title@HH:MM:SS,Title@HH:MM:SS"')
  .option('--cover <image>', 'optional JPG/PNG/WebP cover image')
  .action(async (o: { input: string; output: string; bitrate: string; titles?: string; chapters?: string; cover?: string }) => {
    const inputs = o.input.split(',').map((s) => s.trim()).filter(Boolean);
    if (inputs.length < 1) throw new Error('Need at least one input file.');
    if (o.chapters && inputs.length !== 1) throw new Error('--chapters is for one long input file; use --titles for one chapter per input.');
    let meta = '';
    if (o.chapters) {
      const chapters = o.chapters.split(',').map((entry) => {
        const splitAt = entry.lastIndexOf('@');
        if (splitAt < 1) throw new Error(`Invalid chapter "${entry}". Use Title@HH:MM:SS.`);
        return { title: entry.slice(0, splitAt).trim(), start: parseTimestamp(entry.slice(splitAt + 1)) };
      }).sort((a, b) => a.start - b.start);
      if (!chapters.length || chapters[0].start !== 0) chapters.unshift({ title: 'Chapter 1', start: 0 });
      if (chapters.some((chapter, index) => index > 0 && chapter.start === chapters[index - 1].start)) throw new Error('Chapter timestamps must be unique.');
      meta = ';FFMETADATA1\n' + chapters.map((chapter, index) => {
        const end = chapters[index + 1]?.start ?? duration(inputs[0]);
        if (end <= chapter.start) throw new Error('Each chapter must start before the end of the audio.');
        return `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(chapter.start * 1000)}\nEND=${Math.round(end * 1000)}\ntitle=${escapeFfmetadata(chapter.title)}\n`;
      }).join('');
    } else if (o.titles) {
      const titles = o.titles.split(',').map((s) => s.trim());
      let acc = 0;
      const rows = inputs.map((f, i) => { const start = acc; acc += duration(f); return { start, title: titles[i] ?? `Chapter ${i + 1}` }; });
      meta = ';FFMETADATA1\n' + rows.map((r, i) => {
        const end = i + 1 < rows.length ? rows[i + 1].start : r.start + 3600;
        return `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(r.start * 1000)}\nEND=${Math.round(end * 1000)}\ntitle=${escapeFfmetadata(r.title)}\n`;
      }).join('');
    }
    const list = listFile(inputs);
    const metaPath = path.join(os.tmpdir(), `bpm4b-meta-${Date.now()}.txt`);
    fs.writeFileSync(metaPath, meta || ';FFMETADATA1\n', 'utf8');
    try {
      await run(['-f', 'concat', '-safe', '0', '-i', list, '-i', metaPath, ...(o.cover ? ['-i', o.cover] : []), '-map_metadata', '1', '-c:a', 'aac', '-b:a', o.bitrate, ...(o.cover ? ['-map', '0:a', '-map', '2:v', '-c:v', 'copy', '-disposition:v:0', 'attached_pic'] : ['-vn']), '-f', 'ipod', '-y', o.output]);
      console.log(`M4B written: ${o.output}`);
    } finally { try { fs.unlinkSync(list); } catch {} try { fs.unlinkSync(metaPath); } catch {} }
  });

p.command('extract <input> <output>')
  .description('Extract/convert audio from one file (MP3, M4B, OGG …)')
  .option('--bitrate <br>', 'bitrate for lossy outputs', '128k')
  .action(async (input: string, output: string, o: { bitrate: string }) => {
    const ext = path.extname(output).toLowerCase();
    const codec: Record<string, string[]> = {
      '.mp3': ['-c:a', 'libmp3lame', '-b:a', o.bitrate],
      '.m4a': ['-c:a', 'aac', '-b:a', o.bitrate],
      '.aac': ['-c:a', 'aac', '-b:a', o.bitrate],
      '.ogg': ['-c:a', 'libvorbis', '-q:a', '5'],
      '.opus': ['-c:a', 'libopus', '-b:a', '96k'],
      '.wav': ['-c:a', 'pcm_s16le'],
      '.flac': ['-c:a', 'flac'],
      '.alac': ['-c:a', 'alac'],
    };
    await run(['-i', input, '-vn', ...(codec[ext] ?? ['-c:a', 'copy']), '-y', output]);
    console.log(`Extracted: ${output}`);
  });

p.command('merge')
  .description('Concatenate audio files into one output (stream-copy when safe)')
  .requiredOption('-i, --input <files>', 'comma-separated input audio files')
  .requiredOption('-o, --output <file>', 'output file path')
  .action(async (o: { input: string; output: string }) => {
    const inputs = o.input.split(',').map((s) => s.trim()).filter(Boolean);
    const list = listFile(inputs);
    try { await run(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-y', o.output]); }
    catch { await run(['-f', 'concat', '-safe', '0', '-i', list, '-y', o.output]); }
    try { fs.unlinkSync(list); } catch {}
    console.log(`Merged: ${o.output}`);
  });

p.parse(process.argv);

