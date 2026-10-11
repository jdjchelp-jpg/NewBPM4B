import { useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { sfx } from '@/lib/sound';
import { pickImage, pickLocalFiles, type LocalSelection } from '@/lib/files';

const FIELDS: { key: string; label: string; ph?: string }[] = [
  { key: 'title', label: 'Title' }, { key: 'album', label: 'Album' },
  { key: 'artist', label: 'Author / Artist' }, { key: 'albumartist', label: 'Album Artist' },
  { key: 'genre', label: 'Genre' }, { key: 'year', label: 'Year', ph: '2026' },
  { key: 'track', label: 'Track' }, { key: 'disk', label: 'Disc' },
  { key: 'composer', label: 'Narrator / Composer' }, { key: 'publisher', label: 'Publisher' },
  { key: 'copyright', label: 'Copyright' }, { key: 'language', label: 'Language', ph: 'en' },
  { key: 'comment', label: 'Comment' }, { key: 'description', label: 'Description' },
];

export default function Metadata() {
  const [file, setFile] = useState<LocalSelection | null>(null);
  const [meta, setMeta] = useState<Record<string, string>>({});
  const [cover, setCover] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const pick = async () => {
    const r = await pickLocalFiles('audio', false);
    if (!r[0]) return;
    setFile(r[0]); setErr(''); setMsg('');
    if (r[0].file && !(window as any).bpm4b) { setMsg('Audio imported and ready. Reading and writing metadata requires BPM4B desktop.'); return; }
    const res = await (window as any).bpm4b?.readMeta?.({ file: r[0].path });
    const c = res?.common ?? {};
    setMeta(Object.fromEntries(FIELDS.map((f) => [f.key, String(c[f.key] ?? '')])));
    setMsg(res?.format ? `Loaded ${r[0].name} — ${res.format.codec ?? 'audio'}${res.format.duration ? `, ${Math.round(res.format.duration / 60)} min` : ''}` : (res?.note ?? ''));
    sfx.success(false);
  };
  const pickCover = async () => { const r = await pickImage(); if (r) { setCover(r.path ?? r.file?.name ?? ''); sfx.success(false); } };
  const save = async () => {
    setErr('');
    try {
      if (file?.file && !(window as any).bpm4b) throw new Error('Writing metadata requires BPM4B desktop.');
      await (window as any).bpm4b?.writeMeta?.({ file: file?.path, meta, cover, title: meta.title, author: meta.artist });
      setMsg('Metadata written.'); sfx.success(true);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); sfx.error(); }
  };
  return (
    <div className="grid gap-4">
      <Card>
        <h2 className="text-lg font-bold">Metadata Editor</h2>
        <p className="text-sm text-muted-foreground">Load an audiobook, read its tags, edit, and write them back with cover art.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={pick}>{file ? 'Change file' : 'Open audio'}</Button>
          {file && <><span className="truncate text-sm" title={file.name}>{file.name}</span>{file.url && <audio controls preload="metadata" src={file.url} aria-label="Preview selected audio" className="h-9 max-w-full" />}</>}
          <Button variant="outline" onClick={pickCover}>{cover ? 'Change cover' : 'Choose cover'}</Button>
          {cover && <span className="truncate text-xs text-muted-foreground" title={cover}>{cover.split(/[\\/]/).pop()}</span>}
          <Button variant="secondary" onClick={save} disabled={!file}>Save metadata</Button>
        </div>
        {msg && !err && <p role="status" className="mt-2 text-sm text-muted-foreground">{msg}</p>}
        {err && <p role="alert" className="mt-2 text-sm text-destructive">{err}</p>}
      </Card>
      <Card>
        <h3 className="font-semibold">Tags</h3>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <label key={f.key} className="grid gap-1 text-xs text-muted-foreground">{f.label}
              <Input aria-label={f.label} placeholder={f.ph} value={meta[f.key] ?? ''} onChange={(e) => setMeta((m) => ({ ...m, [f.key]: e.target.value }))} />
            </label>
          ))}
        </div>
      </Card>
    </div>
  );
}
