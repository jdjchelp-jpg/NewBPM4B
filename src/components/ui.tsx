// shadcn-style primitives (button, card, input, dialog, tabs, progress, slider, badge)
// Interaction sound per cuelume agents.md: declarative data-cuelume-* on chrome,
// imperative play() only for outcomes/progress (see src/lib/sound.ts).
import * as React from 'react';
import { cn } from '@/lib/utils';

export function Button({ className, variant='default', ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default'|'secondary'|'outline'|'ghost'|'destructive' }) {
  const v: Record<string,string> = {
    default: 'bg-primary text-primary-foreground hover:opacity-90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-accent',
    outline: 'border border-input bg-background hover:bg-accent',
    ghost: 'hover:bg-accent', destructive: 'bg-destructive text-destructive-foreground',
  };
  // tap = buttons/links, direct activation (agents.md table)
  return <button data-cuelume-tap className={cn('inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50', v[variant], className)} {...p} />;
}
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('card p-5', className)} {...p} />;
}
export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  const type = p.type ?? 'text';
  // type cue fires only for keys that edit text (agents.md); select for pickers/toggles.
  const soundAttr =
    type === 'checkbox' || type === 'radio' || type === 'range' || type === 'file' || type === 'color'
      ? { 'data-cuelume-select': '' } as const
      : { 'data-cuelume-type': '' } as const;
  return <input {...soundAttr} className={cn('flex h-9 w-full rounded-lg border border-input bg-background px-3 text-sm')} {...p} />;
}
export function Progress({ value, className }: { value: number; className?: string }) {
  return <div className={cn('h-2 w-full overflow-hidden rounded-full bg-secondary', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
    <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
  </div>;
}
export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn('inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium', className)} {...p} />;
}
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return <div className="card flex flex-col items-center gap-1 p-10 text-center"><p className="font-semibold">{title}</p>{hint && <p className="text-sm text-muted-foreground">{hint}</p>}</div>;
}
export function Toast({ title, body }: { title: string; body?: string }) {
  return <div role="status" className="card fixed bottom-4 right-4 z-50 max-w-sm p-4"><p className="font-semibold">{title}</p>{body && <p className="text-sm text-muted-foreground">{body}</p>}</div>;
}
