import {
  type CreateTenantRequestDto,
  createKnowledgeBaseRequestDto,
  createTenantRequestDto,
  type KnowledgeBaseResponseDto,
} from '@enterprise-rag/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderGit2, Pencil, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import type { z } from 'zod';
import {
  createKnowledgeBaseApi,
  createTenantApi,
  deleteKnowledgeBaseApi,
  listKnowledgeBasesApi,
  listTenantsApi,
  renameKnowledgeBaseApi,
} from '@/knowledge/apis/knowledge.api';
import { useActorKey } from '~/auth/auth-context';
import { Alert } from '~/libs/ui/alert';
import { Button } from '~/libs/ui/button';
import { ConfirmDialog } from '~/libs/ui/confirm-dialog';
import { EmptyState, PageHeader } from '~/libs/ui/feedback';
import { Field, inputControlClassName } from '~/libs/ui/field';
import { Panel } from '~/libs/ui/panel';
import { FormSkeleton, StatCardsSkeleton } from '~/libs/ui/skeleton';
import { useToast } from '~/libs/ui/toast';

export function KnowledgePage() {
  useSignals();
  const queryClient = useQueryClient();
  const actorKey = useActorKey();
  const { toast } = useToast();

  const selectedTenantId = useSignal('');
  const editingKnowledgeBaseId = useSignal<string | null>(null);
  const editingKnowledgeBaseName = useSignal('');
  const knowledgeBasePendingDeletion = useSignal<KnowledgeBaseResponseDto | null>(null);
  const actionError = useSignal('');

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

  const tenantForm = useForm<CreateTenantRequestDto>({
    resolver: zodResolver(createTenantRequestDto),
    defaultValues: { name: '' },
  });
  const kbFormSchema = createKnowledgeBaseRequestDto.pick({ name: true });
  type KbFormValues = z.infer<typeof kbFormSchema>;

  const kbForm = useForm<KbFormValues>({
    resolver: zodResolver(kbFormSchema),
    defaultValues: { name: '' },
  });

  const createTenant = useMutation({
    mutationFn: (formValues: CreateTenantRequestDto) => createTenantApi(formValues),
    onSuccess: async (record) => {
      selectedTenantId.value = record.id;
      tenantForm.reset();
      toast({
        variant: 'success',
        title: 'Organización creada',
        description: `«${record.name}» está lista con aislamiento RLS.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['tenants', actorKey] });
    },
  });

  const createKb = useMutation({
    mutationFn: (formValues: KbFormValues) =>
      createKnowledgeBaseApi(currentTenantId, { ...formValues, tenant_id: currentTenantId }),
    onSuccess: async (created) => {
      kbForm.reset();
      toast({
        variant: 'success',
        title: 'Base de conocimiento creada',
        description: `«${created.name}» ya acepta documentos.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['knowledge-bases', actorKey, currentTenantId] });
    },
  });

  const renameKb = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => renameKnowledgeBaseApi(id, { name }),
    onSuccess: async (updated) => {
      editingKnowledgeBaseId.value = null;
      editingKnowledgeBaseName.value = '';
      actionError.value = '';
      toast({
        variant: 'info',
        title: 'Nombre actualizado',
        description: `La base ahora se llama «${updated.name}».`,
      });
      await queryClient.invalidateQueries({ queryKey: ['knowledge-bases', actorKey, currentTenantId] });
    },
    onError: (err) => {
      actionError.value = err instanceof Error ? err.message : 'No se pudo renombrar la base.';
    },
  });

  const deleteKb = useMutation({
    mutationFn: (id: string) => deleteKnowledgeBaseApi(id),
    onSuccess: async () => {
      knowledgeBasePendingDeletion.value = null;
      actionError.value = '';
      toast({
        variant: 'warning',
        title: 'Base eliminada',
        description: 'Se revocaron sus fragmentos y se programó el borrado de objetos.',
      });
      await queryClient.invalidateQueries({ queryKey: ['knowledge-bases', actorKey, currentTenantId] });
    },
    onError: (err) => {
      knowledgeBasePendingDeletion.value = null;
      actionError.value = err instanceof Error ? err.message : 'No se pudo eliminar la base.';
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Knowledge hub"
        title="Bases de conocimiento"
        description="Organiza datos con aislamiento y permisos por organización."
      />

      {tenants.isPending ? (
        <Panel>
          <FormSkeleton fields={2} label="Cargando organizaciones…" />
        </Panel>
      ) : tenants.isError ? (
        <Alert variant="danger">No se pudieron cargar las organizaciones.</Alert>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2">
            <Panel>
              <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
                Nueva organización
              </h2>
              <form
                className="space-y-4"
                onSubmit={tenantForm.handleSubmit((formValues) => createTenant.mutate(formValues))}
              >
                <Field
                  id="tenant-name"
                  label="Nombre de organización"
                  placeholder="Ej. Corporación Financiera Andina"
                  {...tenantForm.register('name')}
                  error={tenantForm.formState.errors.name?.message}
                />
                <Button type="submit" disabled={createTenant.isPending}>
                  Crear organización
                </Button>
                {createTenant.isError && (
                  <Alert variant="danger">
                    {createTenant.error instanceof Error
                      ? createTenant.error.message
                      : 'No se pudo crear la organización.'}
                  </Alert>
                )}
              </form>
            </Panel>

            <Panel>
              <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">Nueva base</h2>
              <div className="mb-4 grid gap-1.5">
                <label
                  className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
                  htmlFor="tenant-choice"
                >
                  Organización
                </label>
                <select
                  id="tenant-choice"
                  value={currentTenantId}
                  onChange={(e) => {
                    selectedTenantId.value = e.target.value;
                  }}
                  className={inputControlClassName}
                >
                  {tenants.data?.map((tenantItem) => (
                    <option value={tenantItem.id} key={tenantItem.id}>
                      {tenantItem.name}
                    </option>
                  ))}
                </select>
              </div>
              <form
                className="space-y-4"
                onSubmit={kbForm.handleSubmit((formValues) => createKb.mutate(formValues))}
              >
                <Field
                  id="kb-name"
                  label="Nombre de base"
                  placeholder="Ej. Políticas de Seguridad ISO 27001"
                  {...kbForm.register('name')}
                  error={kbForm.formState.errors.name?.message}
                />
                <Button type="submit" disabled={!currentTenantId || createKb.isPending}>
                  Crear base
                </Button>
                {createKb.isError && (
                  <Alert variant="danger">
                    {createKb.error instanceof Error
                      ? createKb.error.message
                      : 'No autorizado o error de red.'}
                  </Alert>
                )}
              </form>
            </Panel>
          </div>

          <section className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Tus bases</h2>
            {actionError.value && (
              <Alert
                variant="danger"
                onDismiss={() => {
                  actionError.value = '';
                }}
              >
                {actionError.value}
              </Alert>
            )}
            {knowledge.isLoading ? (
              <StatCardsSkeleton count={2} label="Cargando…" />
            ) : knowledge.isError ? (
              <Alert variant="danger">No se pudieron cargar las bases.</Alert>
            ) : knowledge.data?.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {knowledge.data.map((knowledgeBaseItem) => (
                  <div
                    key={knowledgeBaseItem.id}
                    className="flex flex-col justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-6 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:bg-[#0a0a0a] dark:hover:border-zinc-600"
                  >
                    {editingKnowledgeBaseId.value === knowledgeBaseItem.id ? (
                      <form
                        className="space-y-3"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (editingKnowledgeBaseName.value.trim().length >= 2) {
                            renameKb.mutate({
                              id: knowledgeBaseItem.id,
                              name: editingKnowledgeBaseName.value,
                            });
                          }
                        }}
                      >
                        <Field
                          id={`rename-${knowledgeBaseItem.id}`}
                          label="Nuevo nombre"
                          value={editingKnowledgeBaseName.value}
                          onChange={(e) => {
                            editingKnowledgeBaseName.value = e.target.value;
                          }}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="submit"
                            disabled={renameKb.isPending || editingKnowledgeBaseName.value.trim().length < 2}
                          >
                            Guardar
                          </Button>
                          <Button
                            variant="secondary"
                            onClick={() => {
                              editingKnowledgeBaseId.value = null;
                              editingKnowledgeBaseName.value = '';
                            }}
                          >
                            Cancelar
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <Link
                          to={`/app/knowledge/${knowledgeBaseItem.id}`}
                          className="group block rounded-lg focus-visible:outline-2 focus-visible:outline-sky-500"
                        >
                          <div className="flex items-center gap-2.5">
                            <FolderGit2
                              size={18}
                              className="shrink-0 text-sky-600 dark:text-sky-400"
                              aria-hidden="true"
                            />
                            <h3 className="text-base font-semibold text-zinc-950 group-hover:text-sky-700 dark:text-zinc-50 dark:group-hover:text-sky-400">
                              {knowledgeBaseItem.name}
                            </h3>
                          </div>
                          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                            Ver documentos y consultar →
                          </p>
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 border-t border-zinc-200/80 pt-3 dark:border-zinc-800">
                          <Button
                            variant="ghost"
                            className="min-h-9 px-3 py-1.5 text-xs"
                            aria-label={`Renombrar ${knowledgeBaseItem.name}`}
                            onClick={() => {
                              editingKnowledgeBaseId.value = knowledgeBaseItem.id;
                              editingKnowledgeBaseName.value = knowledgeBaseItem.name;
                            }}
                          >
                            <Pencil size={14} aria-hidden="true" /> Renombrar
                          </Button>
                          <Button
                            variant="ghost"
                            className="min-h-9 px-3 py-1.5 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/15 dark:hover:text-red-300"
                            aria-label={`Eliminar ${knowledgeBaseItem.name}`}
                            onClick={() => {
                              knowledgeBasePendingDeletion.value = knowledgeBaseItem;
                            }}
                          >
                            <Trash2 size={14} aria-hidden="true" /> Eliminar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="Crea una base para comenzar."
                description="Cada biblioteca agrupa documentos indexados con control de acceso por organización."
              />
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={!!knowledgeBasePendingDeletion.value}
        title="¿Eliminar base de conocimiento?"
        description={
          knowledgeBasePendingDeletion.value
            ? `Se eliminará «${knowledgeBasePendingDeletion.value.name}», revocando sus fragmentos y programando el borrado de objetos asociados.`
            : ''
        }
        busy={deleteKb.isPending}
        onCancel={() => {
          knowledgeBasePendingDeletion.value = null;
        }}
        onConfirm={() => {
          if (knowledgeBasePendingDeletion.value) deleteKb.mutate(knowledgeBasePendingDeletion.value.id);
        }}
      />
    </div>
  );
}
