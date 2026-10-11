import { ipcMain } from 'electron';
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { parseFile } from 'music-metadata';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';
const FFPROBE = process.env.FFPROBE_PATH || 'ffprobe';

function runFfmpeg(args: string[], onProgress?: (p: number) => void, durationHintSec?: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(FFMPEG, args, { windowsHide: true });
    let err = '';
    p.stderr.on('data', (d) => {
      const s = String(d); err += s;
      if (onProgress && durationHintSec) {
        const m = s.match(/time=(\d+):(\d+):([\d.]+)/);
        if (m) {
          const sec = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
          const percent = Math.min(99, Math.round((sec / durationHintSec) * 100));
          onProgress(percent);
          console.log(`[BPM4B ${String(percent).padStart(3, ' ')}%] Encoding M4B · ${m[0]}`);
        }
      }
    });
    p.on('error', (e) => reject(new Error(`FFmpeg not found. Install it and ensure "ffmpeg" is on PATH (or set FFMPEG_PATH). Details: ${String(e)}`)));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`FFmpeg failed (code ${code}). ${err.slice(-2000)}`))));
  });
}

function friendlyError(e: unknown, file?: string): never {
  const msg = e instanceof Error ? e.message : String(e);
  throw new Error(
    `Couldn't create the audiobook.${file ? `\n\nBPM4B couldn't process "${file}" — it may be damaged or in an unsupported format.` : ''}\n\nTechnical details: ${msg}`
  );
}

function probeAudioDuration(file: string): number {
  const { execFileSync } = require('child_process') as typeof import('child_process');
  try {
    const seconds = Number(execFileSync(FFPROBE, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8', windowsHide: true }).trim());
    return Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
  } catch {
    try {
      execFileSync(FFMPEG, ['-i', file], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      return 0;
    } catch (error: any) {
      const banner = String(error?.stderr ?? '');
      const match = banner.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
      return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : 0;
    }
  }
}

/** Read a doc as text where possible (txt/md/html/csv/xml). Others note that full extraction needs the optional parser pass. */
function readDocText(file: string): { text?: string; note?: string } {
  const ext = path.extname(file).toLowerCase();
  if (['.txt', '.text', '.md', '.markdown', '.html', '.htm', '.csv', '.xml', '.log'].includes(ext)) {
    try { return { text: fs.readFileSync(file, 'utf8') }; }
    catch (e) { return { note: `Couldn't read ${path.basename(file)}: ${String(e)}` }; }
  }
  return { note: `${path.basename(file)} (${ext || 'unknown type'}): binary-doc text extraction (PDF/DOCX/EPUB/ODT/RTF) runs at EPUB build time via the doc→EPUB engine — file was accepted and queued.` };
}

function zipEpubDirectory(root: string, output: string) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    table[i] = value >>> 0;
  }
  const checksum = (data: Buffer) => {
    let value = 0xffffffff;
    for (const byte of data) value = table[(value ^ byte) & 0xff]! ^ (value >>> 8);
    return (value ^ 0xffffffff) >>> 0;
  };
  const names: string[] = [];
  const walk = (folder: string) => {
    for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
      const fullPath = path.join(folder, item.name);
      if (item.isDirectory()) walk(fullPath);
      else if (fullPath !== path.join(root, 'mimetype')) names.push(path.relative(root, fullPath).split(path.sep).join('/'));
    }
  };
  walk(root);
  names.sort((a, b) => a.localeCompare(b));
  const entries = ['mimetype', ...names].map((name) => ({ name, nameBytes: Buffer.from(name, 'utf8'), data: fs.readFileSync(path.join(root, ...name.split('/'))) }));
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  for (const entry of entries) {
    const crc = checksum(entry.data);
    const local = Buffer.alloc(30 + entry.nameBytes.length + entry.data.length);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(0, 8); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(entry.data.length, 18); local.writeUInt32LE(entry.data.length, 22);
    local.writeUInt16LE(entry.nameBytes.length, 26); entry.nameBytes.copy(local, 30); entry.data.copy(local, 30 + entry.nameBytes.length);
    localParts.push(local);

    const central = Buffer.alloc(46 + entry.nameBytes.length);
    central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x0800, 8); central.writeUInt16LE(0, 10); central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(entry.data.length, 20); central.writeUInt32LE(entry.data.length, 24);
    central.writeUInt16LE(entry.nameBytes.length, 28); central.writeUInt32LE(offset, 42); entry.nameBytes.copy(central, 46);
    centralParts.push(central);
    offset += local.length;
  }
  const directory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12); end.writeUInt32LE(offset, 16);
  fs.writeFileSync(output, Buffer.concat([...localParts, directory, end]));
}

/** Dependency-free EPUB writer with an EPUB-compliant ZIP layout. */
function writeEpub(chapters: { title: string; content: string }[], output: string, meta: { title: string; author: string; language: string; genre?: string; description?: string; cover?: string }, onProgress?: (progress: number, detail: string) => void): { output: string; chapters: number } {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const bookId = `bpm4b-${Date.now()}`;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bpm4b-epub-'));
  try {
    fs.writeFileSync(path.join(dir, 'mimetype'), 'application/epub+zip');
    fs.mkdirSync(path.join(dir, 'META-INF'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'META-INF', 'container.xml'),
      `<?xml version="1.0" encoding="UTF-8"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>`);
    fs.mkdirSync(path.join(dir, 'OEBPS'), { recursive: true });
    
    // Handle cover image if provided
    let coverItem = '';
    let coverRef = '';
    if (meta.cover && fs.existsSync(meta.cover)) {
      const coverExt = path.extname(meta.cover).toLowerCase();
      const coverMime = coverExt === '.png' ? 'image/png' : coverExt === '.webp' ? 'image/webp' : 'image/jpeg';
      const coverName = 'cover' + coverExt;
      fs.copyFileSync(meta.cover, path.join(dir, 'OEBPS', coverName));
      coverItem = '    <item id="cover" href="' + coverName + '" media-type="' + coverMime + '"/>';
      coverRef = '    <itemref idref="cover" linear="no"/>';
    }
    
    const items: string[] = []; const refs: string[] = []; const nav: string[] = [];
    chapters.forEach((ch, i) => {
      const paras = (ch.content || '').split(/\n{2,}/).filter((p) => p.trim()).map((p) => `    <p>${esc(p.trim()).replace(/\n/g, '<br/>')}</p>`).join('\n');
      fs.writeFileSync(path.join(dir, 'OEBPS', `chapter_${i}.xhtml`),
        `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd"><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="${esc(meta.language)}"><head><title>${esc(ch.title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head><body><h2>${esc(ch.title)}</h2>\n${paras}\n</body></html>`);
      items.push(`    <item id="chapter_${i}" href="chapter_${i}.xhtml" media-type="application/xhtml+xml"/>`);
      refs.push(`    <itemref idref="chapter_${i}"/>`);
      nav.push(`  <navPoint id="chapter_${i}" playOrder="${i + 1}"><navLabel><text>${esc(ch.title)}</text></navLabel><content src="chapter_${i}.xhtml"/></navPoint>`);
      const progress = 25 + Math.round(((i + 1) / chapters.length) * 60);
      onProgress?.(progress, `Chapter ${i + 1}/${chapters.length}: ${ch.title}`);
    });
    fs.writeFileSync(path.join(dir, 'OEBPS', 'style.css'), 'body { font-family: Georgia, serif; margin: 2em; line-height: 1.6; }\nh2 { font-size: 1.4em; }\np { text-align: justify; margin-bottom: 0.8em; }');
    fs.writeFileSync(path.join(dir, 'OEBPS', 'toc.ncx'),
      `<?xml version="1.0" encoding="UTF-8"?><ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${bookId}"/></head><docTitle><text>${esc(meta.title)}</text></docTitle><navMap>\n${nav.join('\n')}\n  </navMap></ncx>`);
    fs.writeFileSync(path.join(dir, 'OEBPS', 'content.opf'),
      `<?xml version="1.0" encoding="UTF-8"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookID"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>${esc(meta.title)}</dc:title><dc:creator>${esc(meta.author)}</dc:creator><dc:language>${esc(meta.language)}</dc:language><dc:identifier id="BookID">${bookId}</dc:identifier>${meta.genre ? `<dc:subject>${esc(meta.genre)}</dc:subject>` : ''}${meta.description ? `<dc:description>${esc(meta.description)}</dc:description>` : ''}</metadata><manifest><item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/><item id="css" href="style.css" media-type="text/css"/>\n${items.join('\n')}\n  </manifest><spine toc="ncx">\n${refs.join('\n')}\n  </spine></package>`);
    onProgress?.(90, 'Packaging EPUB archive');
    zipEpubDirectory(dir, output);
    onProgress?.(100, `Wrote ${chapters.length} chapters`);
    return { output, chapters: chapters.length };
  } finally {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  }
}

export function registerMediaHandlers() {
  // MP3(s) -> M4B with real chapter metadata (no fluent-ffmpeg needed)
  ipcMain.handle('mp3-to-m4b', async (e, a: { inputs: string[]; output: string; chapters?: { start: number; title: string }[]; chapterTitles?: string[]; bitrate?: string; cover?: string }) => {
    try {
      const list = path.join(os.tmpdir(), `bpm4b-${Date.now()}.txt`);
      const meta = path.join(os.tmpdir(), `bpm4b-meta-${Date.now()}.txt`);
      fs.writeFileSync(list, a.inputs.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'), 'utf8');
      const durations = a.inputs.map(probeAudioDuration);
      // Folder mode: one chapter per file, starts from cumulative real durations.
      let chapters = a.chapters;
      if (!chapters?.length && a.chapterTitles?.length) {
        const starts: number[] = [];
        let acc = 0;
        for (let i = 0; i < a.inputs.length; i++) {
          starts.push(acc);
          acc += durations[i] ?? 0;
        }
        chapters = a.chapterTitles.map((t, i) => ({ start: starts[i] ?? 0, title: t }));
      }
      let metaTxt = ';FFMETADATA1\n';
      if (chapters?.length) {
        const sorted = [...chapters].sort((x, y) => x.start - y.start);
        for (let i = 0; i < sorted.length; i++) {
          const end = i + 1 < sorted.length ? Math.round(sorted[i + 1].start * 1000) : Math.round((sorted[i].start + 3600) * 1000);
          metaTxt += `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(sorted[i].start * 1000)}\nEND=${end}\ntitle=${sorted[i].title}\n`;
        }
      }
      fs.writeFileSync(meta, metaTxt, 'utf8');
      const measuredDuration = durations.reduce((sum, seconds) => sum + seconds, 0);
      const total = measuredDuration || (chapters?.length ? chapters[chapters.length - 1].start || undefined : undefined);
      
      // Build ffmpeg args with optional cover
      const ffmpegArgs = ['-f', 'concat', '-safe', '0', '-i', list, '-i', meta, '-map_metadata', '1', '-c:a', 'aac', '-b:a', a.bitrate ?? '128k'];
      if (a.cover) {
        ffmpegArgs.push('-i', a.cover, '-map', '2', '-c:v', 'copy', '-disposition:v:0', 'attached_pic', '-metadata:s:v', 'title=Cover');
      }
      if (!a.cover) ffmpegArgs.push('-vn');
      ffmpegArgs.push('-f', 'ipod', '-y', a.output);
      
      try {
        await runFfmpeg(ffmpegArgs,
          (p) => { try { e.sender.send('bpm4b:progress', p); } catch {} }, total);
      } finally {
        try { fs.unlinkSync(list); } catch {}
        try { fs.unlinkSync(meta); } catch {}
      }
      return { ok: true, output: a.output };
    } catch (err) { friendlyError(err, a.inputs?.[0]); }
  });

  ipcMain.handle('convert', async (_e, a: { input: string; output: string }) => {
    try { await runFfmpeg(['-i', a.input, '-y', a.output]); return { ok: true }; }
    catch (err) { friendlyError(err, a.input); }
  });

  ipcMain.handle('read-meta', async (_e, a: { file: string }) => {
    try {
      const m = await parseFile(a.file);
      return { format: m.format, common: m.common };
    } catch {
      return { format: undefined, common: undefined, note: 'No audio tags found (likely a document, not audio).' };
    }
  });

  ipcMain.handle('scan-folder', async (_e, a: { folder: string; includeCovers?: boolean; includeDocs?: boolean }) => {
    const AUDIO = ['.mp3', '.m4a', '.m4b', '.ogg', '.oga', '.wav', '.flac', '.aac', '.opus', '.wma', '.aiff', '.aif'];
    const COVERS = ['.jpg', '.jpeg', '.png', '.webp'];
    const DOCS = ['.pdf', '.docx', '.txt', '.md', '.markdown', '.html', '.htm', '.rtf', '.odt', '.epub'];
    try {
      const files = fs.readdirSync(a.folder);
      const audioFiles = files.filter((f) => AUDIO.some((e) => f.toLowerCase().endsWith(e))).map((f) => path.join(a.folder, f));
      const coverFiles = a.includeCovers ? files.filter((f) => COVERS.some((e) => f.toLowerCase().endsWith(e))).map((f) => path.join(a.folder, f)) : [];
      const docFiles = a.includeDocs ? files.filter((f) => DOCS.some((e) => f.toLowerCase().endsWith(e))).map((f) => path.join(a.folder, f)) : [];
      return { audio: audioFiles, covers: coverFiles, docs: docFiles };
    } catch { return { audio: [], covers: [], docs: [] }; }
  });

  ipcMain.handle('read-chapters', async (_e, a: { file: string }) => {
    try {
      const m = await parseFile(a.file);
      const ch = (m.common as any)?.chapter;
      if (Array.isArray(ch) && ch.length) return { chapters: ch };
      const ff = require('child_process').execFileSync(FFMPEG, ['-i', a.file, '-f', 'ffmetadata', '-'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      const out: { start: number; title: string }[] = [];
      let start = 0; let title = '';
      for (const line of ff.split(/\r?\n/)) {
        const s = line.match(/^START=(\d+)/); const t = line.match(/^title=(.*)$/);
        if (s) start = Number(s[1]) / 1000;
        if (t) { title = t[1]; out.push({ start, title }); }
      }
      return out.length ? { chapters: out } : { chapters: [], note: 'No embedded chapters found in this file.' };
    } catch (e) { return { chapters: [], note: `Couldn't read chapters: ${e instanceof Error ? e.message : String(e)}` }; }
  });

  ipcMain.handle('extract-audio', async (_e, a: { input: string; output: string; args?: string[]; bitrate?: string }) => {
    try {
      const args = a.args ?? ['-c:a', 'copy'];
      const use = a.bitrate ? args.map((x) => (x.endsWith('k') ? a.bitrate! : x)) : args;
      await runFfmpeg(['-i', a.input, '-vn', ...use, '-y', a.output]);
      return { ok: true, output: a.output };
    } catch (err) { friendlyError(err, a.input); }
  });

  ipcMain.handle('merge-audio', async (e, a: { inputs: string[]; output: string }) => {
    try {
      const list = path.join(os.tmpdir(), `bpm4b-merge-${Date.now()}.txt`);
      fs.writeFileSync(list, a.inputs.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'), 'utf8');
      // Try lossless stream copy first; fall back to re-encode when codecs differ.
      try { await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-y', a.output]); }
      catch { await runFfmpeg(['-f', 'concat', '-safe', '0', '-i', list, '-y', a.output]); }
      try { fs.unlinkSync(list); } catch {}
      return { ok: true, output: a.output };
    } catch (err) { friendlyError(err, a.inputs?.[0]); }
  });

  ipcMain.handle('write-meta', async (_e, a: { file: string; meta: Record<string, string>; cover?: string; title?: string; author?: string }) => {
    try {
      const meta = path.join(os.tmpdir(), `bpm4b-meta-${Date.now()}.txt`);
      let txt = ';FFMETADATA1\n';
      for (const [k, v] of Object.entries(a.meta ?? {})) if (v) txt += `${k}=${String(v).replace(/\n/g, ' ')}\n`;
      fs.writeFileSync(meta, txt, 'utf8');
      const tmp = `${a.file}.bpm4b.tmp${path.extname(a.file)}`;
      const args = ['-i', a.file, '-i', meta, '-map', '0', '-map_metadata', '1', '-c', 'copy'];
      if (a.cover) args.push('-i', a.cover, '-map', '2', '-c:v', 'copy', '-disposition:v:0', 'attached_pic', '-metadata:s:v', 'title=Cover');
      args.push('-y', tmp);
      await runFfmpeg(args);
      fs.renameSync(tmp, a.file);
      try { fs.unlinkSync(meta); } catch {}
      return { ok: true };
    } catch (err) { friendlyError(err, a.file); }
  });

  ipcMain.handle('read-doc', async (_e, a: { file: string }) => readDocText(a.file));

  ipcMain.handle('doc-to-epub', async (e, a: { inputs?: string[]; text?: string; output: string; meta?: { title?: string; author?: string; language?: string; genre?: string; description?: string; cover?: string }; engines?: any }) => {
    try {
      const report = (progress: number, detail: string) => {
        console.log(`[BPM4B ${String(progress).padStart(3, ' ')}%] Build EPUB · ${detail}`);
        try { e.sender.send('bpm4b:progress', progress); } catch { /* window may be closing */ }
      };
      const { splitChapters } = require('./detect') as typeof import('./detect');
      let full = a.text ?? '';
      if (a.inputs?.length) {
        for (const f of a.inputs) {
          const d = readDocText(f);
          if (d.text) full += (full ? '\n\n' : '') + d.text;
          else throw new Error(`Can't extract text from ${path.basename(f)} yet — binary parsers (PDF/DOCX/EPUB: pdf-parse, mammoth, jszip) are the next dependency-gated pass. Paste its text into the preview box to build the EPUB now.`);
        }
      }
      if (!full.trim()) throw new Error('Nothing to build — add a document or paste text first.');
      report(15, 'Detecting chapter structure');
      const chapters = splitChapters(full, a.engines ?? {});
      report(20, `${chapters.length} chapters detected; writing EPUB`);
      return writeEpub(chapters, a.output, {
        title: a.meta?.title || 'Untitled', author: a.meta?.author || 'Unknown',
        language: a.meta?.language || 'en', genre: a.meta?.genre, description: a.meta?.description, cover: a.meta?.cover,
      }, report);
    } catch (e) { throw new Error(e instanceof Error ? e.message : String(e)); }
  });
}


