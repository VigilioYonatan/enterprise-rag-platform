import type { AuditEventItemResponseDto, DlqItemResponseDto } from '@enterprise-rag/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { listTenantsApi } from '@/knowledge/apis/knowledge.api';
import {
  getBudgetApi,
  getUsageSummaryApi,
  listAuditEventsApi,
  listDlqApi,
  replayDlqApi,
  updateBudgetApi,
} from '@/operations/apis/operations.api';
import { AUDIT_PAGE_SIZE } from '@/operations/const/operations.const';
import { type UpdateBudgetDto, updateBudgetDto } from '@/operations/dtos/update-budget.dto';
import { useActorKey } from '~/auth/auth-context';
import { Alert } from '~/libs/ui/alert';
import { Button } from '~/libs/ui/button';
import { EmptyState, ErrorState, PageHeader } from '~/libs/ui/feedback';
import { Field, inputControlClassName } from '~/libs/ui/field';
import { Modal } from '~/libs/ui/modal';
import { Panel } from '~/libs/ui/panel';
import { FormSkeleton, ListSkeleton, TableSkeleton } from '~/libs/ui/skeleton';
import { useToast } from '~/libs/ui/toast';

export function OperationsPage() {
  useSignals();
  const actorKey = useActorKey();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectedTenantId = useSignal('');
  const auditOffset = useSignal(0);
  const selectedAudit = useSignal<AuditEventItemResponseDto | null>(null);

  const tenants = useQuery({
    queryKey: ['tenants', actorKey],
    queryFn: () => listTenantsApi(),
  });
  const currentTenantId = selectedTenantId.value || tenants.data?.[0]?.id || '';

  const usage = useQuery({
    queryKey: ['usage', actorKey, currentTenantId],
    queryFn: () => getUsageSummaryApi(currentTenantId),
    enabled: !!currentTenantId,
  });

  const budget = useQuery({
    queryKey: ['budget', actorKey, currentTenantId],
    queryFn: () => getBudgetApi(currentTenantId),
    enabled: !!currentTenantId,
  });

  const dlq = useQuery({
    queryKey: ['dlq', actorKey, currentTenantId],
    queryFn: () => listDlqApi(currentTenantId, 25, 0),
    enabled: !!currentTenantId,
  });

  const audit = useQuery({
    queryKey: ['audit', actorKey, currentTenantId, auditOffset.value],
    queryFn: () => listAuditEventsApi(currentTenantId, AUDIT_PAGE_SIZE, auditOffset.value),
    enabled: !!currentTenantId,
  });

  const form = useForm<z.input<typeof updateBudgetDto>, unknown, UpdateBudgetDto>({
    resolver: zodResolver(updateBudgetDto),
    defaultValues: {
      daily_answer_limit: '100',
      daily_cost_limit_usd: '1000',
    },
  });

  useEffect(() => {
    if (budget.data) {
      form.reset({
        daily_answer_limit: String(budget.data.daily_answer_limit),
        daily_cost_limit_usd: String(budget.data.daily_cost_limit_usd),
      });
    }
  }, [budget.data, form]);

  const save = useMutation({
    mutationFn: (budgetPayload: UpdateBudgetDto) => updateBudgetApi(currentTenantId, budgetPayload),
    onSuccess: async () => {
      toast({
        variant: 'success',
        title: 'Presupuesto FinOps actualizado',
        description: 'Los límites diarios atómicos ya aplican sobre nuevas consultas.',
      });
      await queryClient.invalidateQueries({ queryKey: ['budget', actorKey, currentTenantId] });
      await queryClient.invalidateQueries({ queryKey: ['audit', actorKey, currentTenantId] });
    },
  });

  const replayDlq = useMutation({
    mutationFn: (dlqItem: DlqItemResponseDto) => replayDlqApi(dlqItem.id, dlqItem.source),
    onSuccess: async () => {
      toast({
        variant: 'info',
        title: 'Elemento reencolado desde DLQ',
      });
      await queryClient.invalidateQueries({ queryKey: ['dlq', actorKey, currentTenantId] });
      await queryClient.invalidateQueries({ queryKey: ['audit', actorKey, currentTenantId] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Operations / FinOps & SRE"
        title="Uso, DLQ y gobierno"
        description="Límites atómicos de consultas por organización, cola de trabajos fallidos (DLQ) con reintento controlado y auditoría inmutable."
      />
      <Panel>
        <label
          className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          htmlFor="ops-tenant"
        >
          Organización
        </label>
        <select
          id="ops-tenant"
          className={`max-w-md ${inputControlClassName}`}
          value={currentTenantId}
          onChange={(e) => {
            selectedTenantId.value = e.target.value;
            auditOffset.value = 0;
          }}
        >
          {tenants.data?.map((tenantItem) => (
            <option key={tenantItem.id} value={tenantItem.id}>
              {tenantItem.name}
            </option>
          ))}
        </select>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">Presupuesto diario</h2>
          {tenants.isPending || budget.isPending ? (
            <FormSkeleton fields={2} label="Cargando información…" />
          ) : budget.isError ? (
            <ErrorState />
          ) : (
            <form className="space-y-4" onSubmit={form.handleSubmit((v) => save.mutate(v))}>
              <Field
                id="daily-limit"
                label="Máximo de consultas de IA por día"
                type="number"
                min="1"
                max="10000"
                {...form.register('daily_answer_limit')}
                error={form.formState.errors.daily_answer_limit?.message}
              />
              <Field
                id="daily-cost"
                label="Presupuesto diario USD (tarifa de tokens configurada)"
                type="number"
                min="0.01"
                step="0.01"
                {...form.register('daily_cost_limit_usd')}
                error={form.formState.errors.daily_cost_limit_usd?.message}
              />
              <Button type="submit" disabled={save.isPending}>
                {save.isPending ? 'Guardando…' : 'Actualizar presupuesto'}
              </Button>
              {save.isSuccess && <Alert variant="success">Presupuesto actualizado.</Alert>}
              {save.isError && (
                <ErrorState
                  message={
                    save.error instanceof Error
                      ? save.error.message
                      : 'No tienes permiso para modificar el presupuesto.'
                  }
                />
              )}
            </form>
          )}
        </Panel>

        <Panel>
          <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Uso últimos 30 días
          </h2>
          {usage.isLoading ? (
            <ListSkeleton rows={3} label="Cargando métricas de uso…" />
          ) : usage.isError ? (
            <ErrorState message="Se requiere rol de administrador para consultar métricas." />
          ) : usage.data?.length ? (
            <dl className="space-y-3">
              {usage.data.map((usageItem) => (
                <div
                  key={usageItem.category}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/50"
                >
                  <dt className="font-mono text-xs font-semibold uppercase tracking-wider text-sky-700 dark:text-sky-400">
                    {usageItem.category}
                  </dt>
                  <dd className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {usageItem.requests} solicitudes · {usageItem.input_tokens} tokens entrada ·{' '}
                    {usageItem.output_tokens} salida · {usageItem.average_latency_ms} ms prom. · USD{' '}
                    {Number(usageItem.cost_usd || 0).toFixed(5)}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState
              title="Sin tráfico todavía"
              description="Las consultas e ingestas registrarán el uso por tenant."
            />
          )}
        </Panel>
      </div>

      <Panel>
        <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
          Cola de fallos (DLQ · Ingesta y Outbox)
        </h2>
        {dlq.isLoading ? (
          <ListSkeleton rows={2} label="Cargando cola DLQ…" />
        ) : dlq.isError ? (
          <ErrorState message="Solo propietarios o administradores pueden inspeccionar la DLQ." />
        ) : dlq.data?.results.length ? (
          <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
            {dlq.data.results.map((item) => (
              <li
                key={`${item.source}-${item.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-semibold text-zinc-950 dark:text-zinc-100">
                    {item.title ?? item.target_id}{' '}
                    <span className="ml-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-medium text-amber-800 dark:text-amber-300">
                      {item.source === 'ingestion_job' ? 'Ingesta' : 'Outbox'} · {item.attempts} intentos
                    </span>
                  </p>
                  {item.error_message && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">{item.error_message}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  className="min-h-9 px-3 py-1.5 text-xs"
                  disabled={replayDlq.isPending}
                  onClick={() => replayDlq.mutate(item)}
                >
                  <RotateCcw size={14} aria-hidden="true" /> Reencolar
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="DLQ limpia"
            description="No hay trabajos de ingesta ni eventos de outbox detenidos en estado fallido."
          />
        )}
      </Panel>

      <Panel>
        <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
          Eventos de auditoría {audit.data ? `(${audit.data.count})` : ''}
        </h2>
        {audit.isLoading ? (
          <TableSkeleton rows={4} columns={4} label="Cargando eventos de auditoría…" />
        ) : audit.isError ? (
          <ErrorState message="Solo los administradores pueden consultar la auditoría." />
        ) : audit.data?.results.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 font-mono text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                    <th className="p-3">Acción</th>
                    <th className="p-3">Actor</th>
                    <th className="p-3">Recurso</th>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Detalle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {audit.data.results.map((auditEvent) => (
                    <tr key={auditEvent.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40">
                      <td className="p-3 font-mono text-xs font-semibold text-zinc-950 dark:text-zinc-100">
                        {auditEvent.action}
                      </td>
                      <td className="p-3 font-mono text-xs text-zinc-500">
                        {auditEvent.actor_sub.slice(0, 12)}…
                      </td>
                      <td className="p-3 text-xs text-zinc-700 dark:text-zinc-300">
                        {auditEvent.target_type} ·{' '}
                        <span className="font-mono">{auditEvent.target_id.slice(0, 14)}</span>
                      </td>
                      <td className="p-3 font-mono text-xs text-zinc-500">
                        {new Date(auditEvent.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="ghost"
                          className="min-h-8 px-2.5 py-1 text-xs"
                          aria-label={`Ver evento ${auditEvent.action}`}
                          onClick={() => {
                            selectedAudit.value = auditEvent;
                          }}
                        >
                          <Eye size={13} aria-hidden="true" /> Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(audit.data.previous || audit.data.next) && (
              <div className="mt-4 flex items-center justify-between border-t border-zinc-200 pt-4 text-sm dark:border-zinc-800">
                <Button
                  variant="secondary"
                  disabled={!audit.data.previous}
                  onClick={() => {
                    auditOffset.value = Math.max(0, auditOffset.value - AUDIT_PAGE_SIZE);
                  }}
                >
                  ← Anterior
                </Button>
                <Button
                  variant="secondary"
                  disabled={!audit.data.next}
                  onClick={() => {
                    auditOffset.value = auditOffset.value + AUDIT_PAGE_SIZE;
                  }}
                >
                  Siguiente →
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            title="Sin eventos"
            description="Las modificaciones críticas aparecen aquí sin exponer contenido confidencial."
          />
        )}
      </Panel>

      <Modal
        open={!!selectedAudit.value}
        onClose={() => {
          selectedAudit.value = null;
        }}
        title={selectedAudit.value ? `Evento · ${selectedAudit.value.action}` : 'Evento de auditoría'}
        description="Registro inmutable de gobernanza Zero Trust"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              selectedAudit.value = null;
            }}
          >
            Cerrar
          </Button>
        }
      >
        {selectedAudit.value && (
          <dl className="space-y-3 text-xs">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <dt className="font-semibold text-zinc-500">ID de evento</dt>
              <dd className="mt-1 break-all font-mono text-zinc-900 dark:text-zinc-100">
                {selectedAudit.value.id}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <dt className="font-semibold text-zinc-500">Actor OIDC (sub)</dt>
              <dd className="mt-1 break-all font-mono text-zinc-900 dark:text-zinc-100">
                {selectedAudit.value.actor_sub}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <dt className="font-semibold text-zinc-500">Recurso afectado</dt>
              <dd className="mt-1 break-all font-mono text-zinc-900 dark:text-zinc-100">
                {selectedAudit.value.target_type} / {selectedAudit.value.target_id}
              </dd>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <dt className="font-semibold text-zinc-500">Marca temporal</dt>
              <dd className="mt-1 font-mono text-zinc-900 dark:text-zinc-100">
                {new Date(selectedAudit.value.created_at).toISOString()}
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}
