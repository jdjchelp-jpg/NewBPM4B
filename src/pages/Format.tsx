import { useEffect, useState } from 'react';
import { Card, Button, Progress } from '@/components/ui';
import { sfx } from '@/lib/sound';
import { pickLocalFiles, type LocalSelection } from '@/lib/files';
import { convertAudioInBrowser } from '@/lib/m4b-browser';

const AUDIO_OUT = ['mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg', 'opus', 'alac'];
const VIDEO_OUT = ['mp4', 'mkv', 'webm', 'mov', 'gif'];

export default function Format() {
  const [file, setFile] = useState<LocalSelection | null>(null);
  const [out, setOut] = useState('mp3');
  const [advanced, setAdvanced] = useState(false);
  const [sr, setSr] = useState('');
  const [ch, setCh] = useState('');
  const [prog, setProg] = useState(0);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { (window as any).bpm4b?.onProgress?.((p: number) => setProg(p)); }, []);
  const pick = async () => { const r = await pickLocalFiles('media', false); if (r[0]) { setFile(r[0]); sfx.success(false); } };
  const run = async () => {
    setProg(1); setErr(''); setBusy(true); sfx.loading();
    try {
      const bridge = (window as any).bpm4b;
      if (bridge) {
        const target = await bridge.pickSave?.({ defaultPath: `converted.${out}` });
        if (!target) return;
        await bridge.convert?.({ input: file?.path, output: target, sampleRate: sr, channels: ch });
      } else {
        const codecs: Record<string, string[]> = {
          mp3: ['-c:a', 'libmp3lame', '-b:a', '192k'], m4a: ['-c:a', 'aac', '-b:a', '192k'],
          aac: ['-c:a', 'aac', '-b:a', '192k'], flac: ['-c:a', 'flac'], wav: ['-c:a', 'pcm_s16le'],
          ogg: ['-c:a', 'libvorbis', '-q:a', '5'], opus: ['-c:a', 'libopus', '-b:a', '96k'],
          alac: ['-c:a', 'alac', '-f', 'ipod'], mp4: ['-c:v', 'libx264', '-c:a', 'aac'],
          mkv: ['-c:v', 'ffv1', '-c:a', 'flac'], webm: ['-c:v', 'libvpx', '-c:a', 'libopus'],
          mov: ['-c:v', 'mpeg4', '-c:a', 'aac'], gif: ['-vf', 'fps=10,scale=480:-1:flags=lanczos', '-loop', '0'],
        };
        const args = [...(codecs[out] ?? ['-c:a', 'copy'])];
        if (sr) args.push('-ar', sr);
        if (ch) args.push('-ac', ch);
        await convertAudioInBrowser({ input: file!, outputExtension: out, args, task: 'Convert media', includeVideo: VIDEO_OUT.includes(out), onStatus: (status) => setProg(status.progress) });
      }
      setProg(100); sfx.success(true);
    }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); sfx.error(); }
    finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">Format Switcher</h2>
        <p className="text-sm text-muted-foreground">Audio and video conversion through ffmpeg. Only formats ffmpeg can actually produce are offered.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={pick}>{file ? 'Change file' : 'Open media'}</Button>
          {file && <><span className="truncate text-sm" title={file.name}>{file.name}</span>{file.url && <audio controls preload="metadata" src={file.url} aria-label="Preview selected media" className="h-9 max-w-full" />}</>}
          <label className="flex items-center gap-1 text-sm">To
            <select data-cuelume-select value={out} onChange={(e) => setOut(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" aria-label="Output format">
              <optgroup label="Audio">{AUDIO_OUT.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}</optgroup>
              <optgroup label="Video">{VIDEO_OUT.map((f) => <option key={f} value={f}>{f.toUpperCase()}</option>)}</optgroup>
            </select>
          </label>
          <Button variant="secondary" onClick={run} disabled={!file}>Convert</Button>
          <Button variant="ghost" onClick={() => setAdvanced((a) => !a)}>{advanced ? 'Hide' : 'Advanced'} options</Button>
        </div>
        {advanced && (
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <label className="flex items-center gap-1">Sample rate
              <select data-cuelume-select value={sr} onChange={(e) => setSr(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" aria-label="Sample rate"><option value="">auto</option>{['8000', '22050', '44100', '48000', '96000'].map((v) => <option key={v} value={v}>{v} Hz</option>)}</select>
            </label>
            <label className="flex items-center gap-1">Channels
              <select data-cuelume-select value={ch} onChange={(e) => setCh(e.target.value)} className="h-9 rounded-lg border border-input bg-background px-2 text-sm" aria-label="Channels"><option value="">auto</option><option value="1">Mono</option><option value="2">Stereo</option></select>
            </label>
          </div>
        )}
        {prog > 0 && <Progress value={prog} className="mt-3" />}
        {err && <p role="alert" className="mt-2 whitespace-pre-line text-sm text-destructive">{err}</p>}
      </Card>
    </div>
  );
}
