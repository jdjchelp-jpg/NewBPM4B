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
    const exitCode = await ffmpeg.exec(['-i', inputName, '-vn', ...options.args, '-y', output]);
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
