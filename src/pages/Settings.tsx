import { Card, Button } from '@/components/ui';
import { useApp } from '@/lib/store';
import { setSoundEnabled, setSoundVolume, sfx } from '@/lib/sound';
export default function Settings() {
  const { theme, setTheme, volume, setVolume, soundEnabled, setSoundEnabled: setSE } = useApp();
  return (
    <div className="grid gap-4">
      <Card><h2 className="text-lg font-bold">Appearance</h2>
        <p className="text-sm text-muted-foreground">Five themes, one design system: Light · Dark · Green · Blue · Red.</p>
        <div className="mt-2 flex flex-wrap gap-2" data-cuelume-emphasis="subtle">
          {(['light','dark','green','blue','red'] as const).map((t) => (
            <Button key={t} data-cuelume-select variant={theme === t ? 'default' : 'outline'} onClick={() => setTheme(t)}>{t}</Button>
          ))}
        </div></Card>
      <Card><h2 className="text-lg font-bold">Sound</h2>
        <label className="flex items-center gap-2 text-sm">
          <input data-cuelume-toggle type="checkbox" checked={soundEnabled} onChange={(e) => { setSE(e.target.checked); setSoundEnabled(e.target.checked); }} />
          Interface sounds
        </label>
        <label className="mt-2 block text-sm">Volume: {Math.round(volume*100)}%</label>
        <input data-cuelume-select type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => { setVolume(Number(e.target.value)); setSoundVolume(Number(e.target.value)); }} className="w-64" aria-label="Global volume" />
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="secondary" data-cuelume-emphasis="strong" onClick={() => sfx.success(true)}>Test success (strong)</Button>
          <Button variant="secondary" onClick={() => sfx.warning()}>Test warning</Button>
          <Button variant="secondary" onClick={() => sfx.error()}>Test error</Button>
        </div></Card>
      <Card><h2 className="text-lg font-bold">Engines</h2><p className="text-sm text-muted-foreground">Toggle chapters, episodes, acts, scenes, volumes, days… + custom regex, redundant-number cleanup.</p></Card>
    </div>
  );
}

