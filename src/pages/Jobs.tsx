import { Card, Progress, Badge, Button } from '@/components/ui';
import { useApp, type Route, type Job } from '@/lib/store';

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Jobs() {
  const { jobs, setRoute } = useApp();
  const active = jobs.filter((j) => j.state === 'processing' || j.state === 'queued');
  const done = jobs.filter((j) => j.state === 'completed' || j.state === 'failed' || j.state === 'cancelled');
  const view = (r: Route) => setRoute(r);
  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Jobs</h2>
          <Button variant="ghost" data-cuelume-navigate onClick={() => view('history')}>History →</Button>
        </div>
        <p className="text-sm text-muted-foreground">Live progress for current work and a saved record of finished or interrupted tasks.</p>
      </Card>
      <Card>
        <h3 className="font-semibold">Active ({active.length})</h3>
        <div className="mt-2 grid gap-3">
          {active.map((j: Job) => (
            <div key={j.id} className="grid gap-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">{j.title}</span><Badge>{j.kind}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{j.state}{j.detail ? ` · ${j.detail}` : ''}</span>
              </div>
              <Progress value={j.progress} />
              <div className="flex gap-2 text-xs">
              </div>
            </div>
          ))}
          {!active.length && <p className="text-sm text-muted-foreground">Nothing running. Chapter scans, document imports and audiobook builds will appear here while they run.</p>}
        </div>
      </Card>
      <Card>
        <h3 className="font-semibold">Finished ({done.length})</h3>
        {done.map((j: Job) => (
          <div key={j.id} className="flex items-center gap-2 border-b border-border py-1.5 text-sm">
            <span>{j.state === 'completed' ? '✓' : j.state === 'failed' ? '✕' : '⊘'}</span>
            <span className="truncate">{j.title}</span><Badge>{j.kind}</Badge>
            {j.detail && <span className="hidden max-w-[35%] truncate text-xs text-muted-foreground sm:inline" title={j.detail}>{j.detail}</span>}
            <span className="ml-auto text-xs text-muted-foreground">{j.state} · {timeAgo(j.updatedAt)}</span>
          </div>
        ))}
        {!done.length && <p className="py-2 text-sm text-muted-foreground">No finished jobs yet.</p>}
      </Card>
    </div>
  );
}
