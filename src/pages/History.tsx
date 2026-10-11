import { Card, Empty, Badge, Button } from '@/components/ui';
import { useApp, type Job } from '@/lib/store';

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function History() {
  const { jobs, clearJobs } = useApp();
  const done = jobs
    .filter((j: Job) => j.state === 'completed' || j.state === 'failed' || j.state === 'cancelled')
    .sort((a: Job, b: Job) => b.updatedAt - a.updatedAt);
  return (
    <div className="grid gap-4">
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">History</h2>
          {done.length > 0 && <Button variant="ghost" onClick={clearJobs}>Clear history</Button>}
        </div>
        <p className="text-sm text-muted-foreground">Completed, failed and cancelled jobs from this workspace.</p>
      </Card>
      <Card>
        {done.map((j: Job) => (
          <div key={j.id} className="flex items-center gap-2 border-b border-border py-2 text-sm last:border-0">
            <span aria-hidden>{j.state === 'completed' ? '✓' : j.state === 'failed' ? '✕' : '⊘'}</span>
            <span className="truncate">{j.title}</span>
            <Badge>{j.kind}</Badge>
            {j.detail && <span className="hidden max-w-[40%] truncate text-xs text-muted-foreground sm:inline" title={j.detail}>{j.detail}</span>}
            <span className="ml-auto text-xs text-muted-foreground">{j.state} · {timeAgo(j.updatedAt)}</span>
          </div>
        ))}
        {!done.length && <Empty title="Nothing completed yet" />}
      </Card>
    </div>
  );
}
