import { Inbox, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { Alert } from './alert';
import { Skeleton } from './skeleton';

export function Loading({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div className="space-y-3 py-6" role="status" aria-live="polite">
      <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <LoaderCircle size={16} className="animate-spin text-sky-600 dark:text-sky-400" />
        <span>{label}</span>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-3/4 max-w-md" />
        <Skeleton className="h-3.5 w-1/2 max-w-xs" />
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/70 p-8 text-center dark:border-zinc-800 dark:bg-zinc-950/60">
      <Inbox className="mx-auto mb-3 text-zinc-500 dark:text-zinc-400" size={22} />
      <h3 className="font-semibold text-zinc-950 dark:text-zinc-100">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export function ErrorState({ message }: { message?: string }) {
  return <Alert variant="danger">{message ?? 'No se pudo cargar la información. Reintenta.'}</Alert>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[11px] font-semibold uppercase tracking-widest text-sky-700 dark:text-sky-400">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-zinc-950 sm:text-3xl dark:text-zinc-50">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
