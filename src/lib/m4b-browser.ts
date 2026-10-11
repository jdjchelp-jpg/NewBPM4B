import { FFmpeg } from '@ffmpeg/ffmpeg';
import coreURL from '@ffmpeg/core?url';
import wasmURL from '@ffmpeg/core/wasm?url';
import type { LocalSelection } from '@/lib/files';
import { createOperationId, reportOperationProgress, type OperationProgress } from '@/lib/progress';

let instance: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let progressCallback: ((progress: number, detail?: string) => void) | undefined;
let ffmpegLog = '';

function ffmetadataEscape(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/=/g, '\\=').replace(/;/g, '\\;').replace(/#/g, '\\#').replace(/\r?\n/g, ' ');
}

function cleanName(name: string, index: number) {
  const ext = name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'audio';
  return `input-${index}.${ext}`;
}

function getFFmpeg(onProgress?: (progress: number, detail?: string) => void) {
  progressCallback = onProgress;
  if (!loading) {
    const ffmpeg = new FFmpeg();
    ffmpeg.on('progress', ({ progress }) => {
      const logLines = ffmpegLog.trim().split('\n');
      const detail = logLines[logLines.length - 1]?.slice(-220);
      progressCallback?.(Math.min(99, Math.max(0, Math.round(progress * 100))), detail);
    });
    ffmpeg.on('log', ({ message }) => { ffmpegLog = `${ffmpegLog}${message}\n`.slice(-4000); });
    loading = ffmpeg.load({ coreURL, wasmURL }).then(() => { instance = ffmpeg; return ffmpeg; }).catch((error) => { loading = null; throw error; });
  }
  return loading;
}

export async function buildM4bInBrowser(options: {
  inputs: LocalSelection[];
  bitrate: string;
  chapters?: { start: number; title: string }[];
  chapterTitles?: string[];
  cover?: LocalSelection | null;
  onProgress?: (progress: number) => void;
  onStatus?: (status: OperationProgress) => void;
  operationId?: string;
}) {
  const { inputs, bitrate, chapters, chapterTitles, cover, onProgress, onStatus } = options;
  if (!inputs.length || inputs.some((input) => !input.file)) throw new Error('Select audio files from your device first.');
  const operationId = options.operationId ?? createOperationId('m4b');
  const publish = (stage: string, progress: number, detail?: string) => {
    const update: OperationProgress = { operationId, task: 'Build M4B', stage, progress, detail, timestamp: new Date().toISOString() };
    onProgress?.(update.progress);
    onStatus?.(update);
    reportOperationProgress(update);
  };
  publish('Loading FFmpeg WebAssembly', 1, 'Starting local encoder');
  const ffmpeg = await getFFmpeg((progress, detail) => publish('Encoding M4B', 74 + Math.round(progress * 0.24), detail));
  const names: string[] = [];
  const created: string[] = [];
  const output = 'audiobook.m4b';
  const list = 'inputs.txt';
  const metadata = 'chapters.txt';
  try {
    for (let i = 0; i < inputs.length; i++) {
      const selection = inputs[i]!;
      publish('Reading audio files', 5 + Math.floor((i / inputs.length) * 20), `${i + 1}/${inputs.length} · ${selection.name}`);
      const name = cleanName(selection.name, i);
      names.push(name);
      await ffmpeg.writeFile(name, new Uint8Array(await selection.file!.arrayBuffer()));
      created.push(name);
    }
    let chapterRows = chapters?.length ? [...chapters].sort((a, b) => a.start - b.start) : undefined;
    if (!chapterRows && chapterTitles?.length) {
      const titles = chapterTitles;
        let start = 0;
        chapterRows = [];
        for (let i = 0; i < inputs.length; i++) {
          const selection = inputs[i]!;
          publish('Reading audio duration', 28 + Math.floor((i / inputs.length) * 18), `${i + 1}/${inputs.length} · ${selection.name}`);
          const url = selection.url ?? URL.createObjectURL(selection.file!);
          const temporaryUrl = !selection.url;
          const duration = await new Promise<number>((resolve, reject) => {
            const audio = new Audio(); audio.preload = 'metadata'; audio.src = url;
            audio.onloadedmetadata = () => resolve(audio.duration);
            audio.onerror = () => reject(new Error(`Could not read the duration of ${selection.name}.`));
          }).finally(() => { if (temporaryUrl) URL.revokeObjectURL(url); });
          chapterRows.push({ start, title: titles[i] ?? `Chapter ${i + 1}` });
          start += duration;
        }
    }
    const getDuration = (selection: LocalSelection) => new Promise<number>((resolve, reject) => {
      const url = selection.url ?? URL.createObjectURL(selection.file!);
      const audio = new Audio(); audio.preload = 'metadata'; audio.src = url;
      audio.onloadedmetadata = () => { if (!selection.url) URL.revokeObjectURL(url); resolve(audio.duration); };
      audio.onerror = () => { if (!selection.url) URL.revokeObjectURL(url); reject(new Error(`Could not read the duration of ${selection.name}.`)); };
    });
    publish('Preparing chapter metadata', 48, `${chapterRows?.length ?? 0} chapters`);
    const endOfAudio = chapterRows ? await getDuration(inputs[inputs.length - 1]!) : 0;
    const concat = names.map((name) => `file '${name}'`).join('\n');
    await ffmpeg.writeFile(list, new TextEncoder().encode(concat)); created.push(list);
    let ffmeta = ';FFMETADATA1\n';
    if (chapterRows) {
      ffmeta += chapterRows.map((row, index) => {
        const start = Math.round(row.start * 1000);
        const end = Math.round((chapterRows[index + 1]?.start ?? endOfAudio) * 1000);
        return `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${start}\nEND=${end}\ntitle=${ffmetadataEscape(row.title)}\n`;
      }).join('');
    }
    await ffmpeg.writeFile(metadata, new TextEncoder().encode(ffmeta)); created.push(metadata);
    const args = ['-f', 'concat', '-safe', '0', '-i', list, '-i', metadata];
    if (cover?.file) {
      const coverName = cleanName(cover.name, inputs.length);
      await ffmpeg.writeFile(coverName, new Uint8Array(await cover.file.arrayBuffer())); created.push(coverName);
      args.push('-i', coverName);
    }
    args.push('-map_metadata', '1', '-c:a', 'aac', '-b:a', bitrate);
    if (cover?.file) args.push('-map', '0:a', '-map', '2:v', '-c:v', 'mjpeg', '-disposition:v:0', 'attached_pic');
    else args.push('-vn');
    args.push('-f', 'ipod', '-y', output);
    ffmpegLog = '';
    publish('Encoding M4B', 74, `AAC ${bitrate} · ${inputs.length} input file(s)`);
    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) throw new Error(`FFmpeg couldn't create this M4B. ${ffmpegLog.slice(-1600)}`);
    const data = await ffmpeg.readFile(output);
    if (typeof data === 'string') throw new Error('FFmpeg returned invalid output.');
    const url = URL.createObjectURL(new Blob([new Uint8Array(data).buffer], { type: 'audio/mp4' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = output; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    publish('Download ready', 99, 'Saving audiobook to your device');
    publish('Complete', 100, 'M4B downloaded');
  } finally {
    for (const name of [...created, output]) { try { await ffmpeg.deleteFile(name); } catch { /* already removed */ } }
  }
}

type BrowserConversionOptions = {
  input: LocalSelection;
  outputExtension: string;
  args: string[];
  task: string;
  onStatus?: (status: OperationProgress) => void;
  operationId?: string;
  includeVideo?: boolean;
};

/** Run any FFmpeg audio extraction/conversion in the browser and download the result. */
export async function convertAudioInBrowser(options: BrowserConversionOptions) {
  if (!options.input.file) throw new Error('Choose an audio file from this device.');
  const operationId = options.operationId ?? createOperationId('audio');
  const output = `converted.${options.outputExtension.replace(/^\./, '')}`;
  const inputName = cleanName(options.input.name, 0);
  const publish = (stage: string, progress: number, detail?: string) => {
    const status: OperationProgress = { operationId, task: options.task, stage, progress, detail, timestamp: new Date().toISOString() };
    options.onStatus?.(status);
    reportOperationProgress(status);
  };
  publish('Loading FFmpeg WebAssembly', 1, 'Starting local encoder');
  const ffmpeg = await getFFmpeg((progress, detail) => publish('Encoding audio', Math.min(98, Math.max(2, progress)), detail));
  try {
    publish('Reading audio file', 8, options.input.name);
    await ffmpeg.writeFile(inputName, new Uint8Array(await options.input.file.arrayBuffer()));
    ffmpegLog = '';
    publish('Encoding audio', 10, `Writing ${output}`);
    const exitCode = await ffmpeg.exec(['-i', inputName, ...(options.includeVideo ? [] : ['-vn']), ...options.args, '-y', output]);
    if (exitCode !== 0) throw new Error(`FFmpeg couldn't create ${output}. ${ffmpegLog.slice(-1600)}`);
    const data = await ffmpeg.readFile(output);
    if (typeof data === 'string') throw new Error('FFmpeg returned invalid output.');
    const type = output.endsWith('.mp3') ? 'audio/mpeg' : output.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream';
    const url = URL.createObjectURL(new Blob([new Uint8Array(data).buffer as ArrayBuffer], { type }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = output; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    publish('Complete', 100, `${output} downloaded`);
    return { filename: output };
  } finally {
    for (const name of [inputName, output]) { try { await ffmpeg.deleteFile(name); } catch { /* already removed */ } }
  }
}

function downloadBytes(data: Uint8Array, filename: string, mimeType = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([new Uint8Array(data).buffer as ArrayBuffer], { type: mimeType }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function safeDownloadName(name: string, suffix: string, extension?: string) {
  const stem = name.replace(/\.[^.]+$/, '') || 'audio';
  const ext = extension ?? name.split('.').pop() ?? 'm4a';
  return `${stem}${suffix}.${ext}`;
}

function publishUpdate(task: string, operationId: string, onStatus: BrowserConversionOptions['onStatus'], stage: string, progress: number, detail?: string) {
  const update: OperationProgress = { operationId, task, stage, progress, detail, timestamp: new Date().toISOString() };
  onStatus?.(update);
  reportOperationProgress(update);
}

/** Join audio files in the local browser and download the result. */
export async function mergeAudioInBrowser(options: {
  inputs: LocalSelection[];
  outputExtension?: string;
  onStatus?: BrowserConversionOptions['onStatus'];
  operationId?: string;
}) {
  if (options.inputs.length < 2 || options.inputs.some((item) => !item.file)) throw new Error('Choose at least two audio files from this device.');
  const operationId = options.operationId ?? createOperationId('merge');
  const task = 'Merge audio files';
  const output = `merged.${(options.outputExtension ?? 'mp3').replace(/^\./, '')}`;
  const names = options.inputs.map((item, index) => cleanName(item.name, index));
  const list = 'merge-inputs.txt';
  const created = [...names, list, output];
  const publish = (stage: string, progress: number, detail?: string) => publishUpdate(task, operationId, options.onStatus, stage, progress, detail);
  publish('Loading FFmpeg WebAssembly', 1, 'Processing stays on this device');
  const ffmpeg = await getFFmpeg((progress, detail) => publish('Merging audio', Math.min(98, Math.max(2, progress)), detail));
  try {
    for (let index = 0; index < options.inputs.length; index++) {
      const item = options.inputs[index]!;
      publish('Reading audio files', 5 + Math.round(index / options.inputs.length * 15), `${index + 1}/${options.inputs.length} · ${item.name}`);
      await ffmpeg.writeFile(names[index]!, new Uint8Array(await item.file!.arrayBuffer()));
    }
    await ffmpeg.writeFile(list, new TextEncoder().encode(names.map((name) => `file '${name}'`).join('\n')));
    publish('Merging audio', 22, `${options.inputs.length} tracks`);
    ffmpegLog = '';
    let result = await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-y', output]);
    if (result !== 0) {
      ffmpegLog = '';
      result = await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', list, '-y', output]);
    }
    if (result !== 0) throw new Error(`FFmpeg couldn't merge these files. ${ffmpegLog.slice(-1200)}`);
    const data = await ffmpeg.readFile(output);
    if (typeof data === 'string') throw new Error('FFmpeg returned invalid output.');
    downloadBytes(data, output, output.endsWith('.mp3') ? 'audio/mpeg' : 'audio/mp4');
    publish('Complete', 100, `${output} downloaded`);
    return { filename: output };
  } finally {
    for (const name of created) { try { await ffmpeg.deleteFile(name); } catch { /* already removed */ } }
  }
}

/** Read common audio tags, duration, and embedded chapters in the browser. */
export async function readAudioInBrowser(selection: LocalSelection) {
  if (!selection.file) throw new Error('Choose an audio file from this device.');
  const input = cleanName(selection.name, 0);
  const metadata = 'read-metadata.ffmeta';
  const ffmpeg = await getFFmpeg();
  try {
    await ffmpeg.writeFile(input, new Uint8Array(await selection.file.arrayBuffer()));
    const exitCode = await ffmpeg.exec(['-i', input, '-f', 'ffmetadata', '-y', metadata]);
    if (exitCode !== 0) throw new Error(ffmpegLog.slice(-1000) || 'This file format could not be read by the web media engine.');
    const data = await ffmpeg.readFile(metadata);
    if (typeof data === 'string') throw new Error('FFmpeg returned invalid metadata.');
    const raw = new TextDecoder().decode(data);
    const common: Record<string, string> = {};
    const keys: Record<string, string> = { title: 'title', album: 'album', artist: 'artist', album_artist: 'albumartist', albumartist: 'albumartist', genre: 'genre', date: 'year', year: 'year', track: 'track', disc: 'disk', composer: 'composer', publisher: 'publisher', copyright: 'copyright', comment: 'comment', description: 'description', language: 'language' };
    for (const line of raw.split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
      if (match && keys[match[1]!.toLowerCase()]) common[keys[match[1]!.toLowerCase()]!] = unescapeMetadata(match[2]!);
    }
    const duration = await new Promise<number>((resolve) => {
      const url = selection.url ?? URL.createObjectURL(selection.file!);
      const audio = new Audio(); audio.preload = 'metadata'; audio.src = url;
      audio.onloadedmetadata = () => { if (!selection.url) URL.revokeObjectURL(url); resolve(Number.isFinite(audio.duration) ? audio.duration : 0); };
      audio.onerror = () => { if (!selection.url) URL.revokeObjectURL(url); resolve(0); };
    });
    const chapters = parseChapters(raw);
    return { common, format: { duration }, chapters, raw };
  } finally {
    for (const name of [input, metadata]) { try { await ffmpeg.deleteFile(name); } catch { /* already removed */ } }
  }
}

function unescapeMetadata(value: string) {
  return value.replace(/\\([\\=;#])/g, '$1').trim();
}

function parseChapters(raw: string) {
  return [...raw.matchAll(/\[CHAPTER\]([\s\S]*?)(?=\[CHAPTER\]|$)/g)].map(([, body]) => {
    const values = Object.fromEntries((body ?? '').split(/\r?\n/).map((line) => {
      const at = line.indexOf('=');
      return at < 0 ? ['', ''] : [line.slice(0, at).trim().toUpperCase(), line.slice(at + 1).trim()];
    }).filter(([key]) => key));
    const [numerator, denominator] = (values.TIMEBASE || '1/1000').split('/').map(Number);
    const start = Number(values.START ?? 0) * (numerator || 1) / (denominator || 1000);
    return { start, title: unescapeMetadata(values.TITLE || `Chapter ${Math.round(start / 3600) + 1}`) };
  }).filter((chapter) => Number.isFinite(chapter.start));
}

/** Re-mux a file with updated tags, preserving its audio/video streams. */
export async function writeAudioMetadataInBrowser(options: {
  file: LocalSelection;
  meta: Record<string, string>;
  cover?: LocalSelection | null;
}) {
  if (!options.file.file) throw new Error('Choose an audio file from this device.');
  const input = cleanName(options.file.name, 0);
  const metadata = 'write-metadata.ffmeta';
  const output = safeDownloadName(options.file.name, '-tagged');
  const ffmpeg = await getFFmpeg();
  const created = [input, metadata, output];
  try {
    await ffmpeg.writeFile(input, new Uint8Array(await options.file.file.arrayBuffer()));
    const tagNames: Record<string, string> = { year: 'DATE', albumartist: 'ALBUM_ARTIST' };
    const fields = Object.entries(options.meta).filter(([, value]) => value.trim()).map(([key, value]) => `${tagNames[key] ?? key.toUpperCase()}=${ffmetadataEscape(value)}`);
    await ffmpeg.writeFile(metadata, new TextEncoder().encode(`;FFMETADATA1\n${fields.join('\n')}\n`));
    const args = ['-i', input, '-i', metadata, '-map', '0', '-map_metadata', '1', '-c', 'copy'];
    if (options.cover?.file) {
      const coverName = cleanName(options.cover.name, 1);
      created.push(coverName);
      await ffmpeg.writeFile(coverName, new Uint8Array(await options.cover.file.arrayBuffer()));
      args.push('-i', coverName, '-map', '2:v', '-c:v', 'mjpeg', '-disposition:v:0', 'attached_pic');
    }
    args.push('-y', output);
    ffmpegLog = '';
    const exitCode = await ffmpeg.exec(args);
    if (exitCode !== 0) throw new Error(`Couldn't write tags to this format. ${ffmpegLog.slice(-1200)}`);
    const data = await ffmpeg.readFile(output);
    if (typeof data === 'string') throw new Error('FFmpeg returned invalid output.');
    downloadBytes(data, output);
    return { filename: output };
  } finally {
    for (const name of created) { try { await ffmpeg.deleteFile(name); } catch { /* already removed */ } }
  }
}

/** Save edited chapter markers into a new media file and download it. */
export async function writeChaptersInBrowser(options: {
  file: LocalSelection;
  chapters: { start: number; title: string }[];
}) {
  if (!options.file.file) throw new Error('Choose an audio file from this device.');
  if (!options.chapters.length || options.chapters[0]!.start !== 0) throw new Error('The first chapter must start at 00:00:00.');
  const ordered = [...options.chapters].sort((a, b) => a.start - b.start);
  if (ordered.some((chapter, index) => index > 0 && chapter.start <= ordered[index - 1]!.start)) throw new Error('Chapter start times must be unique and increasing.');
  const input = cleanName(options.file.name, 0);
  const metadata = 'edited-chapters.ffmeta';
  const output = safeDownloadName(options.file.name, '-chapters');
  const ffmpeg = await getFFmpeg();
  try {
    await ffmpeg.writeFile(input, new Uint8Array(await options.file.file.arrayBuffer()));
    const rows = ordered.map((chapter, index) => `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(chapter.start * 1000)}\nEND=${Math.round((ordered[index + 1]?.start ?? chapter.start + 3600) * 1000)}\ntitle=${ffmetadataEscape(chapter.title)}\n`);
    await ffmpeg.writeFile(metadata, new TextEncoder().encode(`;FFMETADATA1\n${rows.join('')}`));
    ffmpegLog = '';
    const exitCode = await ffmpeg.exec(['-i', input, '-i', metadata, '-map', '0', '-map_metadata', '0', '-map_chapters', '1', '-c', 'copy', '-y', output]);
    if (exitCode !== 0) throw new Error(`Couldn't write chapters to this format. ${ffmpegLog.slice(-1200)}`);
    const data = await ffmpeg.readFile(output);
    if (typeof data === 'string') throw new Error('FFmpeg returned invalid output.');
    downloadBytes(data, output);
    return { filename: output };
  } finally {
    for (const name of [input, metadata, output]) { try { await ffmpeg.deleteFile(name); } catch { /* already removed */ } }
  }
}
