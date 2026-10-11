import { useEffect, useState } from 'react';
import { Card, Button, Progress } from '@/components/ui';
import { BarVisualizer } from '@/components/ui/bar-visualizer';
import { sfx } from '@/lib/sound';
import { pickLocalFiles, type LocalSelection } from '@/lib/files';
import { convertAudioInBrowser } from '@/lib/m4b-browser';
const FORMATS = ['mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'opus', 'alac'];
const FMTS: Record<string, string[]> = { mp3: ['-c:a', 'libmp3lame', '-q:a', '2'], m4a: ['-c:a', 'aac'], aac: ['-c:a', 'aac'], wav: ['-c:a', 'pcm_s16le'], flac: ['-c:a', 'flac'], ogg: ['-c:a', 'libvorbis', '-q:a', '5'], opus: ['-c:a', 'libopus', '-b:a', '96k'], alac: ['-c:a', 'alac'] };

export default function Extractor() {
  const [file, setFile] = useState<LocalSelection | null>(null);
  const [format, setFormat] = useState('mp3');
  const [bitrate, setBitrate] = useState('128k');
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { (window as any).bpm4b?.onProgress?.((p: number) => setProg(p)); }, []);
  const pick = async () => { const r = await pickLocalFiles('audio', false); if (r[0]) { setFile(r[0]); sfx.success(false); } };
  const run = async () => {
    if (!file) return;
    const desktop = (window as any).bpm4b;
    const out = desktop?.pickSave ? await desktop.pickSave({ defaultPath: `extracted.${format}` }) : undefined;
    if (desktop && !out) return;
    setProg(1); setErr(''); setBusy(true); sfx.loading();
    try {
      const args = FMTS[format] ?? ['-c:a', 'copy'];
      if (desktop) await desktop.extractAudio({ input: file.path, output: out, args, bitrate });
      else await convertAudioInBrowser({ input: file, outputExtension: format, args: [...args, ...(format === 'aac' || format === 'm4a' ? ['-b:a', bitrate] : [])], task: 'Extract audio', onStatus: (status) => setProg(status.progress) });
      setProg(100); sfx.success(true);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); sfx.error(); }
    finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">Audio Extractor</h2>
        <p className="text-sm text-muted-foreground">Pull the audio out of an audiobook (M4B/M4A/MP3) into MP3, FLAC, WAV and more.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={pick}>{file ? 'Change file' : 'Open audiobook'}</Button>
          {file && <><span className="truncate text-sm" title={file.name}>{file.name}</span>{file.url && <audio controls preload="metadata" src={file.url} aria-label="Preview selected audio" className="h-9 max-w-full" />}</>}
          <label className="flex items-center gap-1 text-sm">Format
            <select data-cuelume-select value={format} onChange={(e) => setFormat(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" aria-label="Output format">
              {FORMATS.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}
            </select>
          </label>
          {(format === 'mp3' || format === 'aac' || format === 'm4a') && (
            <label className="flex items-center gap-1 text-sm">Bitrate
              <select data-cuelume-select value={bitrate} onChange={(e) => setBitrate(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" aria-label="Bitrate">
                {['64k', '96k', '128k', '192k', '256k', '320k'].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </label>
          )}
          <Button variant="secondary" onClick={run} disabled={!file || busy}>{busy ? 'Extracting…' : 'Extract'}</Button>
        </div>
        {busy && <div className="mt-3"><BarVisualizer aria-label="Extracting" barCount={24} className="h-12 text-primary" loading /></div>}
        {prog > 0 && <Progress value={prog} className="mt-3" />}
        {err && <p role="alert" className="mt-2 whitespace-pre-line text-sm text-destructive">{err}</p>}
      </Card>
    </div>
  );
}
