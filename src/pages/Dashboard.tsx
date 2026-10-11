import { Card, Button } from '@/components/ui';
import { sfx } from '@/lib/sound';
import type { Route } from '@/lib/store';

const CARDS: { id: Route; title: string; hint: string; icon: string }[] = [
  { id: 'mp3-to-m4b', title: 'MP3 → M4B', hint: 'Chapters from filenames', icon: '🎧' },
  { id: 'extractor', title: 'Extract Audio', hint: 'M4B → MP3 + quality', icon: '⤓' },
  { id: 'merge', title: 'Merge Audio', hint: 'Glue parts together', icon: '🧲' },
  { id: 'metadata', title: 'Metadata Editor', hint: 'Tags + cover art', icon: '🏷️' },
  { id: 'format', title: 'Format Switcher', hint: 'Audio & video convert', icon: '🔁' },
  { id: 'epub', title: 'EPUB Creator', hint: 'Documents → ebook', icon: '📖' },
];

export default function Dashboard({ go, greet }: { go: (r: Route) => void; greet: string }) {
  return (
    <div className="grid gap-4">
      <div>
        <h2 className="text-2xl font-bold">{greet}</h2>
        <p className="text-sm text-muted-foreground">What would you like to create?</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {CARDS.map((c) => (
          <button key={c.id} data-cuelume-open onClick={() => { go(c.id); }}
            className="card group p-5 text-left transition-shadow hover:shadow-md" aria-label={`Open ${c.title}`}>
            <span className="text-2xl" aria-hidden>{c.icon}</span>
            <p className="mt-2 font-semibold">{c.title}</p>
            <p className="text-xs text-muted-foreground">{c.hint}</p>
          </button>
        ))}
      </div>
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Recent Projects</h3>
          <Button variant="ghost" data-cuelume-navigate onClick={() => { go('jobs'); sfx.navigate(); }}>View jobs →</Button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Nothing yet — build your first audiobook and it lands here.</p>
      </Card>
    </div>
  );
}
