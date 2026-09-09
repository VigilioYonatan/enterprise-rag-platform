import type { HTMLAttributes } from 'react';

export function Skeleton({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" {...props} className={`atlas-skeleton rounded-lg ${className}`} />;
}

export function StatCardsSkeleton({
  count = 3,
  label = 'Cargando métricas…',
}: {
  count?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="grid gap-4 md:grid-cols-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }, (_, idx) => (
        <div
          key={`stat-sk-${String(idx)}`}
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <Skeleton className="h-5 w-5 rounded-md" />
          <Skeleton className="mt-4 h-5 w-2/3" />
          <Skeleton className="mt-2.5 h-3.5 w-full" />
          <Skeleton className="mt-1.5 h-3.5 w-4/5" />
        </div>
      ))}
    </div>
  );
}

export function ListSkeleton({ rows = 4, label = 'Cargando listado…' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3 py-2">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, idx) => (
        <div
          key={`list-sk-${String(idx)}`}
          className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40"
        >
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5 max-w-xs" />
            <Skeleton className="h-3 w-2/5 max-w-48" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
  label = 'Cargando registros…',
}: {
  rows?: number;
  columns?: number;
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
    >
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-4 gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/60">
        {Array.from({ length: columns }, (_, idx) => (
          <Skeleton key={`th-sk-${String(idx)}`} className="h-3.5 w-20" />
        ))}
      </div>
      <div className="divide-y divide-zinc-200 dark:divide-zinc-800/80">
        {Array.from({ length: rows }, (_, rIdx) => (
          <div key={`tr-sk-${String(rIdx)}`} className="grid grid-cols-4 gap-4 px-4 py-3.5">
            {Array.from({ length: columns }, (_, cIdx) => (
              <Skeleton key={`td-sk-${String(rIdx)}-${String(cIdx)}`} className="h-3.5 w-full max-w-32" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FormSkeleton({
  fields = 2,
  label = 'Cargando formulario…',
}: {
  fields?: number;
  label?: string;
}) {
  return (
    <div role="status" aria-live="polite" className="space-y-4 py-1">
      <span className="sr-only">{label}</span>
      {Array.from({ length: fields }, (_, idx) => (
        <div key={`form-sk-${String(idx)}`} className="space-y-2">
          <Skeleton className="h-3.5 w-36" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      ))}
      <Skeleton className="h-10 w-44 rounded-xl" />
    </div>
  );
}

export function ChatSkeleton({ label = 'Generando respuesta sustentada…' }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <span className="sr-only">{label}</span>
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-5 w-5 rounded-full" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="space-y-2.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-11/12" />
        <Skeleton className="h-3.5 w-4/5" />
      </div>
      <div className="flex gap-2 pt-1">
        <Skeleton className="h-6 w-28 rounded-md" />
        <Skeleton className="h-6 w-28 rounded-md" />
      </div>
    </div>
  );
}

export function PageSkeleton({ label = 'Cargando información…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-6 py-4">
      <span className="sr-only">{label}</span>
      <div className="space-y-2.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, idx) => (
          <div
            key={`page-card-sk-${String(idx)}`}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <Skeleton className="h-5 w-5 rounded-md" />
            <Skeleton className="mt-4 h-5 w-2/3" />
            <Skeleton className="mt-2.5 h-3.5 w-full" />
          </div>
        ))}
      </div>
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
