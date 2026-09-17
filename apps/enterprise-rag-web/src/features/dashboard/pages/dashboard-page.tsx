import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTenantsSummaryApi } from '@/dashboard/apis/dashboard.api';
import { DASHBOARD_CARDS as cards } from '@/dashboard/const/dashboard.const';
import { useActorKey } from '~/auth/auth-context';
import { Alert } from '~/libs/ui/alert';
import { Skeleton } from '~/libs/ui/skeleton';

export function DashboardPage() {
  const actorKey = useActorKey();
  const tenants = useQuery({
    queryKey: ['tenants-summary', actorKey],
    queryFn: () => getTenantsSummaryApi(10, 0),
  });

  return (
    <div className="space-y-8">
      <header className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-7 shadow-2xs sm:p-10 dark:border-zinc-800 dark:bg-[#0a0a0a]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-sky-700 dark:text-sky-400">
            Enterprise knowledge / 2026
          </span>
          {tenants.isLoading ? (
            <Skeleton className="h-6 w-48 rounded-full" />
          ) : (
            tenants.data && (
              <span className="inline-flex items-center rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 font-mono text-xs font-medium text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
                Organizaciones accesibles: {tenants.data.count}
              </span>
            )
          )}
        </div>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-zinc-950 md:text-4xl dark:text-zinc-50">
          Conocimiento confiable, de extremo a extremo.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
          Ingesta segura con cuarentena antivirus, búsqueda híbrida FTS + pgvector y generación de respuestas
          sustentadas con aislamiento entre organizaciones.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            to="/app/knowledge"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-zinc-900 bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            Empezar con documentos →
          </Link>
          <Link
            to="/app/evaluations"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-200/80 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Evaluar calidad RAG <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {tenants.isError && (
        <Alert variant="warning" title="Sincronización pendiente">
          No pudimos consultar el resumen de organizaciones en este instante. Revisa tu conexión o vuelve a
          intentarlo desde Bibliotecas.
        </Alert>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link
            to={card.to}
            key={card.title}
            className="group flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-400 dark:border-zinc-800 dark:bg-[#0a0a0a] dark:hover:border-zinc-600"
          >
            <div>
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sky-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-sky-400">
                <card.icon size={20} aria-hidden="true" />
              </span>
              <h2 className="mt-4 text-base font-semibold text-zinc-950 group-hover:text-sky-700 dark:text-zinc-50 dark:group-hover:text-sky-400">
                {card.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{card.detail}</p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1 font-mono text-xs font-medium text-zinc-500 group-hover:text-zinc-900 dark:text-zinc-500 dark:group-hover:text-zinc-200">
              Abrir módulo <ArrowUpRight size={13} aria-hidden="true" />
            </span>
          </Link>
        ))}
      </section>

      <Alert variant="info" title="Arquitectura Zero Trust activa">
        <span className="inline-flex items-center gap-1.5">
          <ShieldAlert size={14} className="shrink-0" aria-hidden="true" />
          Todos los objetos binarios pasan por cuarentena ClamAV en RustFS antes de indexar fragmentos 1024d
          en pgvector.
        </span>
      </Alert>
    </div>
  );
}
