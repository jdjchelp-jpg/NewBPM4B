import { useApp, type Route } from '@/lib/store';
import { initSound, sfx } from '@/lib/sound';
import { useEffect, useMemo, useState } from 'react';
import Dashboard from '@/pages/Dashboard';
import Mp3ToM4b from '@/pages/Mp3ToM4b';
import SingleManifest from '@/pages/SingleManifest';
import FolderToM4b from '@/pages/FolderToM4b';
import M4bChapters from '@/pages/M4bChapters';
import Extractor from '@/pages/Extractor';
import Merge from '@/pages/Merge';
import Format from '@/pages/Format';
import Metadata from '@/pages/Metadata';
import Epub from '@/pages/Epub';
import Chapters from '@/pages/Chapters';
import Jobs from '@/pages/Jobs';
import History from '@/pages/History';
import Settings from '@/pages/Settings';
import { useEffect as useReactEffect } from 'react';

interface NavItem { id: Route; label: string; icon: string; keys?: string; }
interface NavGroup { label: string; items: NavItem[]; }

const GROUPS: NavGroup[] = [
  { label: '', items: [{ id: 'dashboard', label: 'Dashboard', icon: '🏠' }] },
  { label: 'Audiobooks', items: [
    { id: 'mp3-to-m4b', label: 'MP3 → M4B', icon: '🎧' },
    { id: 'single-manifest', label: 'Single MP3 + Manifest', icon: '📝' },
    { id: 'folder-to-m4b', label: 'Folder → M4B', icon: '📁' },
    { id: 'm4b-chapters', label: 'M4B Chapter Tools', icon: '📑' },
  ] },
  { label: 'Audio', items: [
    { id: 'extractor', label: 'Audio Extractor', icon: '⤓' },
    { id: 'merge', label: 'Batch Merge', icon: '🧲' },
    { id: 'format', label: 'Format Switcher', icon: '🔁' },
    { id: 'metadata', label: 'Metadata Editor', icon: '🏷️' },
  ] },
  { label: 'Books', items: [{ id: 'epub', label: 'EPUB Creator', icon: '📖' }] },
  { label: 'Studio', items: [{ id: 'chapters', label: 'Chapter Studio', icon: '✂️' }] },
  { label: 'System', items: [
    { id: 'jobs', label: 'Jobs', icon: '⏳' },
    { id: 'history', label: 'History', icon: '🕘' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ] },
];

export default function App() {
  const { route, setRoute, theme, soundEnabled, volume, search, setSearch } = useApp();
  useEffect(() => { initSound({ enabled: soundEnabled, volume, material: theme === 'blue' || theme === 'red' ? 'light' : theme }); }, [soundEnabled, volume, theme]);
  const [collapsed, setCollapsed] = useState(false);
  const go = (id: Route) => { if (id !== route) { setRoute(id); sfx.navigate(); } };

  // Global shortcuts: Ctrl+O dashboard focus, Ctrl+Enter handled per-page.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') { e.preventDefault(); document.getElementById('bpm4b-search')?.focus(); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return GROUPS;
    const q = search.toLowerCase();
    return GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.label.toLowerCase().includes(q)) })).filter((g) => g.items.length);
  }, [search]);

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`${collapsed ? 'w-16' : 'w-60'} flex flex-col gap-1 overflow-y-auto border-r border-border bg-card p-3 transition-all`} aria-label="Primary">
        <div className="flex items-center gap-2 px-2 py-3">
          <button data-cuelume-toggle onClick={() => setCollapsed((c) => !c)} className="rounded p-1 hover:bg-accent" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>☰</button>
          <img src="/bpm4b-logo.png" alt="BPM4B logo" className={`${collapsed ? 'h-10 w-10' : 'h-12 w-12'} shrink-0 rounded-lg object-contain`} />
          {!collapsed && <div><h1 className="text-lg font-bold leading-none">BPM4B</h1><p className="text-xs text-muted-foreground">Audiobook Studio</p></div>}
        </div>
        {!collapsed && (
          <input id="bpm4b-search" data-cuelume-type value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search (Ctrl+O)" aria-label="Search tools" className="mb-1 h-9 rounded-lg border border-input bg-background px-3 text-sm" />
        )}
        {filtered.map((g, gi) => (
          <div key={gi}>
            {!collapsed && g.label && <p className="px-2 pb-0.5 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.label}</p>}
            {g.items.map((n) => (
              <button key={n.id} data-cuelume-navigate onClick={() => go(n.id)} title={collapsed ? n.label : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${route === n.id ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                aria-current={route === n.id ? 'page' : undefined}>
                <span aria-hidden>{n.icon}</span>{!collapsed && n.label}
              </button>
            ))}
          </div>
        ))}
        {!collapsed && <div className="mt-auto px-2 pt-2 text-xs text-muted-foreground">{greet} · Ctrl+O search · Ctrl+Enter start</div>}
      </aside>
      <main className="flex-1 overflow-auto p-6">
        {route === 'dashboard' && <Dashboard go={go} greet={greet} />}
        {route === 'mp3-to-m4b' && <Mp3ToM4b />}
        {route === 'single-manifest' && <SingleManifest />}
        {route === 'folder-to-m4b' && <FolderToM4b />}
        {route === 'm4b-chapters' && <M4bChapters />}
        {route === 'extractor' && <Extractor />}
        {route === 'merge' && <Merge />}
        {route === 'format' && <Format />}
        {route === 'metadata' && <Metadata />}
        {route === 'epub' && <Epub />}
        {route === 'chapters' && <Chapters />}
        {route === 'jobs' && <Jobs />}
        {route === 'history' && <History />}
        {route === 'settings' && <Settings />}
      </main>
    </div>
  );
}


