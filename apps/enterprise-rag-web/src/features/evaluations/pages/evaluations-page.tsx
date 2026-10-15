import { createCaseRequestDto, createDatasetRequestDto } from '@enterprise-rag/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  createCaseApi,
  createDatasetApi,
  deleteCaseApi,
  deleteDatasetApi,
  getRunDetailApi,
  listCasesApi,
  listDatasetsApi,
  listRunsApi,
  startEvaluationRunApi,
} from '@/evaluations/apis/evaluations.api';
import { listKnowledgeBasesApi, listTenantsApi } from '@/knowledge/apis/knowledge.api';
import { useActorKey } from '~/auth/auth-context';
import { Button } from '~/libs/ui/button';
import { ConfirmDialog } from '~/libs/ui/confirm-dialog';
import { EmptyState, ErrorState, PageHeader } from '~/libs/ui/feedback';
import { Field, inputControlClassName } from '~/libs/ui/field';
import { Panel } from '~/libs/ui/panel';
import { ListSkeleton, TableSkeleton } from '~/libs/ui/skeleton';
import { useToast } from '~/libs/ui/toast';

export function EvaluationsPage() {
  useSignals();
  const actorKey = useActorKey();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const selectedTenantId = useSignal('');
  const selectedKnowledgeBaseId = useSignal('');
  const selectedDatasetId = useSignal('');
  const selectedRunId = useSignal('');
  const confirmDeleteDataset = useSignal(false);

  const tenants = useQuery({
    queryKey: ['tenants', actorKey],
    queryFn: () => listTenantsApi(),
  });
  const currentTenantId = selectedTenantId.value || tenants.data?.[0]?.id || '';

  const knowledge = useQuery({
    queryKey: ['knowledge-bases', actorKey, currentTenantId],
    queryFn: () => listKnowledgeBasesApi(currentTenantId),
    enabled: !!currentTenantId,
  });
  const currentKnowledgeBaseId = selectedKnowledgeBaseId.value || knowledge.data?.[0]?.id || '';

  const datasets = useQuery({
    queryKey: ['evaluation-datasets', actorKey, currentTenantId],
    queryFn: () => listDatasetsApi(currentTenantId),
    enabled: !!currentTenantId,
  });
  const activeDatasetId = selectedDatasetId.value || datasets.data?.[0]?.id || '';

  const cases = useQuery({
    queryKey: ['evaluation-cases', actorKey, activeDatasetId],
    queryFn: () => listCasesApi(activeDatasetId, 100, 0),
    enabled: !!activeDatasetId,
  });

  const runs = useQuery({
    queryKey: ['evaluation-runs', actorKey, currentTenantId],
    queryFn: () => listRunsApi(currentTenantId, 25, 0),
    enabled: !!currentTenantId,
  });

  const runDetail = useQuery({
    queryKey: ['evaluation-run-detail', actorKey, selectedRunId.value],
    queryFn: () => getRunDetailApi(selectedRunId.value),
    enabled: !!selectedRunId.value,
  });

  const datasetFormSchema = createDatasetRequestDto.pick({ name: true });
  type DatasetFormValues = z.infer<typeof datasetFormSchema>;

  const form = useForm<DatasetFormValues>({
    resolver: zodResolver(datasetFormSchema),
    defaultValues: { name: '' },
  });

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const caseUiSchema = z
    .object({
      question: createCaseRequestDto.shape.question,
      expected_document_ids: z.string().optional().default(''),
      expected_abstention: z.boolean().default(false),
    })
    .refine(
      (caseValues) => {
        if (caseValues.expected_abstention) return true;
        const tokens = (caseValues.expected_document_ids || '').split(/[\s,]+/).filter(Boolean);
        return tokens.length > 0 && tokens.every((token) => uuidRegex.test(token));
      },
      {
        message: 'UUID inválido',
        path: ['expected_document_ids'],
      },
    );
  type CaseUiInput = z.input<typeof caseUiSchema>;
  type CaseUiOutput = z.output<typeof caseUiSchema>;

  const caseForm = useForm<CaseUiInput, unknown, CaseUiOutput>({
    resolver: zodResolver(caseUiSchema),
    defaultValues: { question: '', expected_document_ids: '', expected_abstention: false },
  });

  const create = useMutation({
    mutationFn: (datasetValues: DatasetFormValues) =>
      createDatasetApi(currentTenantId, currentKnowledgeBaseId, datasetValues),
    onSuccess: async (createdDataset) => {
      selectedDatasetId.value = createdDataset.id;
      form.reset();
      toast({
        variant: 'success',
        title: 'Dataset creado',
        description: `«${createdDataset.name}» registrado en revisión ${createdDataset.revision}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['evaluation-datasets', actorKey, currentTenantId] });
    },
  });

  const removeDataset = useMutation({
    mutationFn: () => deleteDatasetApi(activeDatasetId),
    onSuccess: async () => {
      confirmDeleteDataset.value = false;
      selectedDatasetId.value = '';
      toast({
        variant: 'warning',
        title: 'Dataset eliminado',
      });
      await queryClient.invalidateQueries({ queryKey: ['evaluation-datasets', actorKey, currentTenantId] });
      await queryClient.invalidateQueries({ queryKey: ['evaluation-runs', actorKey, currentTenantId] });
    },
  });

  const addCase = useMutation({
    mutationFn: (caseValues: CaseUiOutput) =>
      createCaseApi(activeDatasetId, {
        question: caseValues.question,
        expected_document_ids: caseValues.expected_abstention
          ? []
          : (caseValues.expected_document_ids || '')
              .split(/[\s,]+/)
              .map((s) => s.trim())
              .filter(Boolean),
        expected_abstention: caseValues.expected_abstention,
      }),
    onSuccess: async () => {
      caseForm.reset();
      toast({
        variant: 'success',
        title: 'Caso de evaluación guardado',
      });
      await queryClient.invalidateQueries({ queryKey: ['evaluation-cases', actorKey, activeDatasetId] });
      await queryClient.invalidateQueries({ queryKey: ['evaluation-datasets', actorKey, currentTenantId] });
    },
  });

  const removeCase = useMutation({
    mutationFn: (caseId: string) => deleteCaseApi(activeDatasetId, caseId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['evaluation-cases', actorKey, activeDatasetId] });
      await queryClient.invalidateQueries({ queryKey: ['evaluation-datasets', actorKey, currentTenantId] });
    },
  });

  const run = useMutation({
    mutationFn: () => startEvaluationRunApi(activeDatasetId),
    onSuccess: async (createdRun) => {
      selectedRunId.value = createdRun.id;
      toast({
        variant: 'success',
        title: 'Evaluación completada',
        description: `Estado: ${createdRun.status} · ${createdRun.case_count} casos evaluados.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['evaluation-runs', actorKey, currentTenantId] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="LLMOps / Calidad"
        title="Evaluación de retrieval"
        description="Datasets versionados con ground truth verificable, métricas separadas de recuperación (Recall@6, MRR@6, nDCG@6) frente a abstención y trazabilidad por caso."
      />
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="eval-tenant"
              className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Organización
            </label>
            <select
              id="eval-tenant"
              value={currentTenantId}
              onChange={(e) => {
                selectedTenantId.value = e.target.value;
                selectedKnowledgeBaseId.value = '';
                selectedDatasetId.value = '';
                selectedRunId.value = '';
              }}
              className={inputControlClassName}
            >
              {tenants.data?.map((tenantItem) => (
                <option key={tenantItem.id} value={tenantItem.id}>
                  {tenantItem.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="eval-kb"
              className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Base de conocimiento
            </label>
            <select
              id="eval-kb"
              value={currentKnowledgeBaseId}
              onChange={(e) => {
                selectedKnowledgeBaseId.value = e.target.value;
              }}
              className={inputControlClassName}
            >
              {knowledge.data?.map((knowledgeBaseItem) => (
                <option value={knowledgeBaseItem.id} key={knowledgeBaseItem.id}>
                  {knowledgeBaseItem.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">Crear dataset</h2>
          <form
            onSubmit={form.handleSubmit((datasetValues) => create.mutate(datasetValues))}
            className="space-y-3"
          >
            <Field
              id="dataset-name"
              label="Nombre del dataset"
              placeholder="Ej. Golden Set Seguridad Q4"
              {...form.register('name')}
              error={form.formState.errors.name?.message}
            />
            <Button type="submit" disabled={create.isPending || !currentKnowledgeBaseId}>
              Crear dataset
            </Button>
            {create.isError && <ErrorState />}
          </form>
        </Panel>

        <Panel>
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Dataset activo</h2>
            {activeDatasetId && (
              <Button
                variant="ghost"
                className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/15"
                onClick={() => {
                  confirmDeleteDataset.value = true;
                }}
              >
                <Trash2 size={14} aria-hidden="true" /> Eliminar dataset
              </Button>
            )}
          </div>
          <label
            htmlFor="dataset-choice"
            className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
          >
            Seleccionar dataset
          </label>
          <select
            id="dataset-choice"
            className={inputControlClassName}
            value={activeDatasetId}
            onChange={(e) => {
              selectedDatasetId.value = e.target.value;
            }}
          >
            {datasets.data?.map((datasetItem) => (
              <option key={datasetItem.id} value={datasetItem.id}>
                {datasetItem.name} · revisión {datasetItem.revision}
              </option>
            ))}
          </select>
          <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
            Cada caso especifica documentos relevantes; los resultados usan búsqueda híbrida autorizada.
          </p>
        </Panel>
      </div>

      {activeDatasetId && (
        <>
          <Panel>
            <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Nuevo caso de evaluación
            </h2>
            <form
              onSubmit={caseForm.handleSubmit((caseValues) => addCase.mutate(caseValues))}
              className="grid gap-4 md:grid-cols-2"
            >
              <Field
                id="eval-question"
                label="Pregunta"
                {...caseForm.register('question')}
                error={caseForm.formState.errors.question?.message}
              />
              <Field
                id="eval-expected"
                label="IDs UUID de documentos relevantes, separados por comas"
                {...caseForm.register('expected_document_ids')}
                error={caseForm.formState.errors.expected_document_ids?.message}
              />
              <label className="flex cursor-pointer items-center gap-2.5 text-sm text-zinc-800 dark:text-zinc-200">
                <input type="checkbox" {...caseForm.register('expected_abstention')} /> Esperamos abstención
                (sin documentos relevantes)
              </label>
              <div>
                <Button type="submit" disabled={addCase.isPending}>
                  Guardar caso
                </Button>
                {addCase.isError && (
                  <div className="mt-2">
                    <ErrorState message="Comprueba que los documentos existen, están listos y son accesibles." />
                  </div>
                )}
              </div>
            </form>

            <h3 className="mt-6 text-sm font-semibold text-zinc-950 dark:text-zinc-100">Casos registrados</h3>
            {cases.isLoading ? (
              <ListSkeleton rows={2} label="Cargando información…" />
            ) : cases.data?.length ? (
              <ol className="mt-3 space-y-2 text-sm">
                {cases.data.map((caseItem) => (
                  <li
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40"
                    key={caseItem.id}
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-zinc-950 dark:text-zinc-100">
                        {caseItem.question}
                      </span>{' '}
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        ·{' '}
                        {caseItem.expected_abstention
                          ? 'Abstención esperada'
                          : `${caseItem.expected_document_ids.length} documentos esperados`}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      aria-label={`Eliminar caso ${caseItem.question}`}
                      className="min-h-8 px-2.5 py-1 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/15"
                      disabled={removeCase.isPending}
                      onClick={() => removeCase.mutate(caseItem.id)}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="mt-3">
                <EmptyState
                  title="Sin casos"
                  description="Crea preguntas con ground truth antes de evaluar."
                />
              </div>
            )}
          </Panel>

          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Ejecutar suite</h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Hasta 25 casos por ejecución. Métricas calculadas en servidor.
                </p>
              </div>
              <Button onClick={() => run.mutate()} disabled={!cases.data?.length || run.isPending}>
                {run.isPending ? 'Evaluando…' : 'Ejecutar evaluación'}
              </Button>
            </div>
            {run.isError && (
              <div className="mt-3">
                <ErrorState message="La evaluación falló. Revisa disponibilidad de embeddings." />
              </div>
            )}
          </Panel>
        </>
      )}

      <Panel>
        <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
          Ejecuciones recientes
        </h2>
        {runs.isLoading ? (
          <TableSkeleton rows={3} columns={4} label="Cargando información…" />
        ) : runs.data?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 font-mono text-xs uppercase text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <th className="p-3">Dataset</th>
                  <th className="p-3">Estado</th>
                  <th className="p-3">Recall@6</th>
                  <th className="p-3">MRR@6</th>
                  <th className="p-3">nDCG@6</th>
                  <th className="p-3">Abstención</th>
                  <th className="p-3">Casos</th>
                  <th className="p-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {runs.data.map((runItem) => (
                  <tr key={runItem.id} className="hover:bg-zinc-50/70 dark:hover:bg-zinc-900/40">
                    <td className="p-3 font-medium text-zinc-950 dark:text-zinc-100">
                      {runItem.dataset_name ?? 'Dataset'}
                    </td>
                    <td className="p-3 font-mono text-xs">{runItem.status}</td>
                    <td className="p-3 font-mono text-xs">
                      {runItem.recall_at_6 === null
                        ? '—'
                        : `${(Number(runItem.recall_at_6) * 100).toFixed(1)}%`}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {runItem.mrr_at_6 === null ? '—' : Number(runItem.mrr_at_6).toFixed(3)}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {runItem.ndcg_at_6 === null ? '—' : Number(runItem.ndcg_at_6).toFixed(3)}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      {runItem.abstention_pass_rate === null
                        ? '—'
                        : `${(Number(runItem.abstention_pass_rate) * 100).toFixed(1)}%`}
                    </td>
                    <td className="p-3 font-mono text-xs">{runItem.case_count}</td>
                    <td className="p-3">
                      <Button
                        variant="ghost"
                        className="min-h-8 px-2.5 py-1 text-xs"
                        onClick={() => {
                          selectedRunId.value = selectedRunId.value === runItem.id ? '' : runItem.id;
                        }}
                      >
                        {selectedRunId.value === runItem.id ? 'Ocultar' : 'Inspeccionar'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Aún no hay ejecuciones"
            description="Ejecuta un dataset para crear una baseline verificable."
          />
        )}

        {selectedRunId.value && (
          <div className="mt-6 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <h3 className="mb-3 text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Resultados por caso · ejecución {selectedRunId.value.slice(0, 8)}
            </h3>
            {runDetail.isLoading ? (
              <ListSkeleton rows={2} label="Cargando resultados por caso…" />
            ) : runDetail.isError ? (
              <ErrorState message="No se pudo obtener el detalle de la ejecución." />
            ) : (
              <ul className="space-y-2 text-xs">
                {runDetail.data?.results.map((item) => (
                  <li
                    key={item.case_id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
                  >
                    <span className="font-mono font-semibold text-sky-700 dark:text-sky-400">
                      Caso {item.case_id.slice(0, 8)}
                    </span>{' '}
                    ·{' '}
                    {item.abstention_pass !== null ? (
                      <span>
                        Abstención: {item.abstention_pass ? 'PASS' : 'FAIL'} (recuperados:{' '}
                        {item.retrieved_document_ids.length})
                      </span>
                    ) : (
                      <span>
                        Recall@6: {(item.recall_at_6 * 100).toFixed(0)}% · nDCG@6: {item.ndcg_at_6.toFixed(3)}{' '}
                        · Primer acierto: {item.rank_of_first_match ?? 'sin acierto'}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Panel>

      <ConfirmDialog
        open={confirmDeleteDataset.value}
        title="¿Eliminar dataset de evaluación?"
        description="Se eliminarán el dataset seleccionado, sus casos y sus ejecuciones asociadas."
        busy={removeDataset.isPending}
        onCancel={() => {
          confirmDeleteDataset.value = false;
        }}
        onConfirm={() => removeDataset.mutate()}
      />
    </div>
  );
}
