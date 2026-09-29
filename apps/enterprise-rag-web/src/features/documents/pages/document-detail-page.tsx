import type { DocumentChunkResponseDto } from '@enterprise-rag/contracts';
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createDocumentVersionApi,
  deleteDocumentApi,
  downloadDocumentContentApi,
  getDocumentChunksApi,
  getDocumentDetailApi,
  getDocumentGrantsApi,
  getDocumentGroupGrantsApi,
  getDocumentJobApi,
  getDocumentVersionsApi,
  replaceDocumentGrantsApi,
  replaceDocumentGroupGrantsApi,
  retryDocumentJobApi,
} from '@/documents/apis/documents.api';
import { MAX_FILE_BYTES } from '@/documents/const/documents.const';
import { listGroupsApi, listMembersApi } from '@/security/apis/security.api';
import { useAuth } from '~/auth/auth-context';
import { Alert } from '~/libs/ui/alert';
import { Button } from '~/libs/ui/button';
import { ConfirmDialog } from '~/libs/ui/confirm-dialog';
import { EmptyState, ErrorState, PageHeader } from '~/libs/ui/feedback';
import { Field, TextareaField } from '~/libs/ui/field';
import { Modal } from '~/libs/ui/modal';
import { Panel } from '~/libs/ui/panel';
import { FormSkeleton, ListSkeleton, PageSkeleton } from '~/libs/ui/skeleton';
import { useToast } from '~/libs/ui/toast';

function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return 'Documento de texto';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function DocumentDetailPage() {
  useSignals();
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, actorKey } = useAuth();
  const { toast } = useToast();

  const selectedUserSubs = useSignal<string[]>([]);
  const isGrantsSaved = useSignal(false);
  const selectedGroups = useSignal<string[] | null>(null);
  const confirmDeleteOpen = useSignal(false);
  const downloadError = useSignal('');
  const versionMode = useSignal<'file' | 'text'>('file');
  const versionTitle = useSignal('');
  const versionText = useSignal('');
  const versionFile = useSignal<File | null>(null);
  const inspectedChunk = useSignal<DocumentChunkResponseDto | null>(null);
  const versionFileRef = useRef<HTMLInputElement>(null);

  const documentQuery = useQuery({
    queryKey: ['document', actorKey, id],
    queryFn: () => getDocumentDetailApi(id ?? ''),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const isOwner = !!documentQuery.data && documentQuery.data.owner_sub === user?.profile.sub;
  const docStatus = documentQuery.data?.status;

  const chunks = useQuery({
    queryKey: ['chunks', actorKey, id],
    queryFn: () => getDocumentChunksApi(id ?? '', 100, 0),
    enabled: !!id && docStatus === 'ready',
    refetchInterval: 3000,
  });

  const versions = useQuery({
    queryKey: ['versions', actorKey, id],
    queryFn: () => getDocumentVersionsApi(id ?? '', 50, 0),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const job = useQuery({
    queryKey: ['job', actorKey, id],
    queryFn: () => getDocumentJobApi(id ?? ''),
    enabled: !!id && isOwner && docStatus !== 'ready',
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'completed' || status === 'failed' ? false : 4000;
    },
  });

  useEffect(() => {
    const jobStatus = job.data?.status;
    if ((jobStatus === 'completed' || jobStatus === 'failed') && docStatus !== 'ready') {
      void queryClient.invalidateQueries({ queryKey: ['document', actorKey, id] });
      void queryClient.invalidateQueries({ queryKey: ['chunks', actorKey, id] });
      void queryClient.invalidateQueries({ queryKey: ['versions', actorKey, id] });
    }
  }, [job.data?.status, docStatus, queryClient, actorKey, id]);

  const grants = useQuery({
    queryKey: ['grants', actorKey, id],
    queryFn: () => getDocumentGrantsApi(id ?? ''),
    enabled: !!id && isOwner,
  });

  const tenantId = documentQuery.data?.tenant_id ?? '';
  const members = useQuery({
    queryKey: ['members', actorKey, tenantId],
    queryFn: () => listMembersApi(tenantId, 100, 0),
    enabled: isOwner && !!tenantId,
  });

  const groups = useQuery({
    queryKey: ['groups', actorKey, tenantId],
    queryFn: () => listGroupsApi(tenantId, 100, 0),
    enabled: isOwner && !!tenantId,
  });

  const groupGrants = useQuery({
    queryKey: ['group-grants', actorKey, id],
    queryFn: () => getDocumentGroupGrantsApi(id ?? ''),
    enabled: !!id && isOwner,
  });

  const replaceGroups = useMutation({
    mutationFn: (groupIds: string[]) => replaceDocumentGroupGrantsApi(id ?? '', groupIds),
    onSuccess: async () => {
      toast({
        variant: 'success',
        title: 'Grupos autorizados actualizados',
        description: 'Las reglas ACL grupales aplican de inmediato en PostgreSQL RLS.',
      });
      await queryClient.invalidateQueries({ queryKey: ['group-grants', actorKey, id] });
    },
  });

  const replaceUsers = useMutation({
    mutationFn: (userSubs: string[]) => replaceDocumentGrantsApi(id ?? '', userSubs),
    onSuccess: async () => {
      isGrantsSaved.value = true;
      toast({
        variant: 'success',
        title: 'Permisos de lectura guardados',
        description: 'Los cambios de acceso ya están vigentes para búsqueda y citas.',
      });
      await queryClient.invalidateQueries({ queryKey: ['grants', actorKey, id] });
    },
  });

  const retry = useMutation({
    mutationFn: () => retryDocumentJobApi(id ?? ''),
    onSuccess: async () => {
      toast({
        variant: 'info',
        title: 'Reintento de ingesta programado',
      });
      await queryClient.invalidateQueries({ queryKey: ['document', actorKey, id] });
      await queryClient.invalidateQueries({ queryKey: ['job', actorKey, id] });
    },
  });

  const uploadNewVersion = useMutation({
    mutationFn: async () => {
      if (versionMode.value === 'file') {
        if (!versionFile.value) throw new Error('Selecciona el archivo de la nueva versión.');
        if (versionFile.value.size < 1 || versionFile.value.size > MAX_FILE_BYTES) {
          throw new Error('El archivo debe medir entre 1 byte y 20 MiB.');
        }
        const formData = new FormData();
        formData.append('file', versionFile.value);
        if (versionTitle.value.trim()) formData.append('title', versionTitle.value.trim());
        return createDocumentVersionApi(id ?? '', formData);
      }
      if (!versionText.value.trim()) throw new Error('Ingresa el texto de la nueva versión.');
      return createDocumentVersionApi(id ?? '', {
        ...(versionTitle.value.trim() ? { title: versionTitle.value.trim() } : {}),
        text: versionText.value.trim(),
      });
    },
    onSuccess: async () => {
      versionFile.value = null;
      versionText.value = '';
      versionTitle.value = '';
      if (versionFileRef.current) versionFileRef.current.value = '';
      toast({
        variant: 'success',
        title: 'Nueva versión publicada',
        description: 'Las citas anteriores fueron invalidadas mientras se reindexa la nueva versión.',
      });
      await queryClient.invalidateQueries({ queryKey: ['document', actorKey, id] });
      await queryClient.invalidateQueries({ queryKey: ['versions', actorKey, id] });
      await queryClient.invalidateQueries({ queryKey: ['chunks', actorKey, id] });
      await queryClient.invalidateQueries({ queryKey: ['job', actorKey, id] });
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteDocumentApi(id ?? ''),
    onSuccess: async () => {
      const kbId = documentQuery.data?.knowledge_base_id;
      confirmDeleteOpen.value = false;
      toast({
        variant: 'warning',
        title: 'Documento eliminado',
        description: 'Se revocaron sus citas y se encoló el borrado físico en RustFS.',
      });
      await queryClient.invalidateQueries({ queryKey: ['documents', actorKey, kbId] });
      if (kbId) {
        navigate(`/app/knowledge/${kbId}`);
      }
    },
  });

  if (documentQuery.isLoading) return <PageSkeleton label="Cargando información…" />;
  if (documentQuery.isError || !documentQuery.data) {
    return <ErrorState message="No tienes acceso a este documento o ya no existe." />;
  }

  const doc = documentQuery.data;
  const initialGrants = grants.data?.map((grantItem) => grantItem.user_sub) ?? [];
  const selectedUserSubList =
    selectedUserSubs.value.length || isGrantsSaved.value ? selectedUserSubs.value : initialGrants;

  return (
    <div className="space-y-6">
      <Link
        className="inline-flex items-center text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
        to={`/app/knowledge/${doc.knowledge_base_id}`}
      >
        ← Volver a documentos
      </Link>
      <PageHeader
        eyebrow="Knowledge / Document"
        title={doc.title}
        description={`Versión ${doc.version} · ${doc.visibility === 'private' ? 'Documento privado' : 'Acceso de la organización'} · ${doc.status}`}
      />
      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <Panel>
            <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Fragmentos indexados
            </h2>
            {chunks.isLoading ? (
              <ListSkeleton rows={3} label="Cargando fragmentos…" />
            ) : chunks.isError ? (
              <ErrorState />
            ) : chunks.data?.length ? (
              <ol className="space-y-4">
                {chunks.data.map((chunkItem) => (
                  <li
                    key={chunkItem.id}
                    className="rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/40"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-400">
                        Fragmento {chunkItem.ordinal + 1} · v{chunkItem.document_version}
                      </p>
                      <Button
                        variant="ghost"
                        className="min-h-8 px-2.5 py-1 text-xs"
                        aria-label={`Ampliar fragmento ${chunkItem.ordinal + 1}`}
                        onClick={() => {
                          inspectedChunk.value = chunkItem;
                        }}
                      >
                        <Eye size={13} aria-hidden="true" /> Ampliar
                      </Button>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                      {chunkItem.content}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState
                title="Aún no hay fragmentos"
                description="El worker indexará el contenido cuando termine el escaneo e ingesta."
              />
            )}
          </Panel>

          <Panel>
            <h2 className="mb-3 text-base font-semibold text-zinc-950 dark:text-zinc-50">
              Historial de versiones
            </h2>
            {versions.isLoading ? (
              <ListSkeleton rows={2} label="Cargando versiones…" />
            ) : versions.data?.length ? (
              <ul className="divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
                {versions.data.map((versionItem) => (
                  <li
                    key={versionItem.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                  >
                    <div>
                      <span className="font-semibold text-zinc-950 dark:text-zinc-100">
                        Versión {versionItem.version}
                      </span>
                      {versionItem.original_filename && (
                        <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                          · {versionItem.original_filename}
                        </span>
                      )}
                      {versionItem.sha256 && (
                        <span className="ml-2 font-mono text-xs text-zinc-500">
                          sha256:{versionItem.sha256.slice(0, 12)}…
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(versionItem.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Versión inicial registrada: v{doc.version}.
              </p>
            )}

            {isOwner && (
              <form
                className="mt-5 space-y-3 border-t border-zinc-200 pt-4 dark:border-zinc-800"
                onSubmit={(e) => {
                  e.preventDefault();
                  uploadNewVersion.mutate();
                }}
              >
                <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                  Publicar nueva versión (v{doc.version + 1})
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Publicar una versión purga los fragmentos previos e invalida citas obsoletas hasta completar
                  la re-ingesta.
                </p>
                <div className="inline-flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900">
                  <button
                    type="button"
                    aria-pressed={versionMode.value === 'file'}
                    onClick={() => {
                      versionMode.value = 'file';
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      versionMode.value === 'file'
                        ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Archivo
                  </button>
                  <button
                    type="button"
                    aria-pressed={versionMode.value === 'text'}
                    onClick={() => {
                      versionMode.value = 'text';
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                      versionMode.value === 'text'
                        ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    Texto
                  </button>
                </div>
                <Field
                  id="version-title"
                  label="Título actualizado (opcional)"
                  value={versionTitle.value}
                  onChange={(e) => {
                    versionTitle.value = e.target.value;
                  }}
                  maxLength={180}
                />
                {versionMode.value === 'file' ? (
                  <div>
                    <label
                      htmlFor="version-file"
                      className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                    >
                      Archivo de reemplazo
                    </label>
                    <input
                      id="version-file"
                      ref={versionFileRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.md,.png,.jpg,.jpeg"
                      className="block w-full rounded-xl border border-dashed border-zinc-300 bg-zinc-50/70 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                      onChange={(e) => {
                        versionFile.value = e.currentTarget.files?.[0] ?? null;
                      }}
                    />
                  </div>
                ) : (
                  <TextareaField
                    id="version-text"
                    label="Nuevo contenido textual"
                    rows={5}
                    value={versionText.value}
                    onChange={(e) => {
                      versionText.value = e.target.value;
                    }}
                  />
                )}
                <Button type="submit" disabled={uploadNewVersion.isPending}>
                  {uploadNewVersion.isPending ? 'Subiendo versión…' : `Subir versión v${doc.version + 1}`}
                </Button>
                {uploadNewVersion.isError && (
                  <ErrorState
                    message={
                      uploadNewVersion.error instanceof Error
                        ? uploadNewVersion.error.message
                        : 'No se pudo publicar la nueva versión.'
                    }
                  />
                )}
              </form>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Metadatos</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-600 dark:text-zinc-400">Estado</dt>
                <dd className="font-mono font-semibold text-zinc-950 dark:text-zinc-100">{doc.status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-zinc-600 dark:text-zinc-400">Tamaño</dt>
                <dd className="text-zinc-900 dark:text-zinc-200">{formatBytes(doc.byte_size)}</dd>
              </div>
              {doc.media_type && (
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-600 dark:text-zinc-400">Tipo MIME</dt>
                  <dd className="font-mono text-xs text-zinc-800 dark:text-zinc-300">{doc.media_type}</dd>
                </div>
              )}
            </dl>
            {doc.original_filename && (
              <Button
                className="mt-4 w-full"
                variant="secondary"
                disabled={doc.status !== 'ready'}
                onClick={() => {
                  downloadError.value = '';
                  void downloadDocumentContentApi(doc.id, doc.original_filename ?? 'documento').catch(
                    (err) => {
                      downloadError.value =
                        err instanceof Error ? err.message : 'No se pudo descargar el documento.';
                    },
                  );
                }}
              >
                {doc.status === 'ready' ? 'Descargar original' : 'En cuarentena hasta finalizar escaneo'}
              </Button>
            )}
            {downloadError.value && (
              <Alert variant="danger" className="mt-3">
                {downloadError.value}
              </Alert>
            )}
            {job.data && (
              <div
                role="status"
                className="mt-3 space-y-1.5 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-900/60"
              >
                <p className="text-zinc-700 dark:text-zinc-300">
                  Ingesta: <span className="font-semibold">{job.data.stage}</span> · Intentos:{' '}
                  {job.data.attempts}
                </p>
                {job.data.error_message && (
                  <p className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-700 dark:text-red-300">
                    {job.data.error_message}
                  </p>
                )}
              </div>
            )}
            {(job.data?.status === 'failed' || doc.status === 'failed') && isOwner && (
              <Button className="mt-3 w-full" disabled={retry.isPending} onClick={() => retry.mutate()}>
                Reintentar ingesta
              </Button>
            )}
          </Panel>

          {isOwner && (
            <Panel>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Permisos de lectura</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Además del propietario, selecciona miembros autorizados. Los permisos se aplican antes de
                recuperar fragmentos.
              </p>
              {members.isLoading || grants.isLoading ? (
                <div className="mt-4">
                  <FormSkeleton fields={2} label="Cargando permisos…" />
                </div>
              ) : (
                <form
                  className="mt-4 space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    replaceUsers.mutate(selectedUserSubList);
                  }}
                >
                  <fieldset>
                    <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                      Miembros del tenant
                    </legend>
                    <div className="mt-3 max-h-48 space-y-2 overflow-y-auto pr-1">
                      {members.data
                        ?.filter((memberItem) => memberItem.user_sub !== user?.profile.sub)
                        .map((memberItem) => (
                          <label
                            className="flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                            key={memberItem.user_sub}
                          >
                            <input
                              type="checkbox"
                              checked={selectedUserSubList.includes(memberItem.user_sub)}
                              onChange={(e) => {
                                isGrantsSaved.value = true;
                                const current =
                                  selectedUserSubs.value.length || isGrantsSaved.value
                                    ? selectedUserSubs.value
                                    : initialGrants;
                                selectedUserSubs.value = e.target.checked
                                  ? [...new Set([...current, memberItem.user_sub])]
                                  : current.filter((x) => x !== memberItem.user_sub);
                              }}
                            />
                            <span className="truncate">{memberItem.email ?? memberItem.user_sub}</span>
                            <span className="font-mono text-xs text-zinc-500">({memberItem.role})</span>
                          </label>
                        ))}
                    </div>
                  </fieldset>
                  <Button type="submit" disabled={replaceUsers.isPending}>
                    {replaceUsers.isPending ? 'Guardando…' : 'Guardar permisos'}
                  </Button>
                  {replaceUsers.isError && <ErrorState message="No se pudieron guardar los permisos." />}
                  {replaceUsers.isSuccess && <Alert variant="success">Permisos actualizados.</Alert>}
                </form>
              )}
            </Panel>
          )}

          {isOwner && (
            <Panel>
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Grupos autorizados</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                La pertenencia a grupos también autoriza lectura de documentos privados.
              </p>
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  replaceGroups.mutate(
                    selectedGroups.value ?? groupGrants.data?.map((grantItem) => grantItem.group_id) ?? [],
                  );
                }}
              >
                <fieldset>
                  <legend className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                    Grupos del tenant
                  </legend>
                  <div className="mt-3 space-y-2">
                    {groups.data?.map((groupItem) => (
                      <label
                        className="flex cursor-pointer items-center gap-2.5 rounded-lg p-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        key={groupItem.id}
                      >
                        <input
                          type="checkbox"
                          checked={(
                            selectedGroups.value ??
                            groupGrants.data?.map((x) => x.group_id) ??
                            []
                          ).includes(groupItem.id)}
                          onChange={(e) => {
                            const base =
                              selectedGroups.value ?? groupGrants.data?.map((x) => x.group_id) ?? [];
                            selectedGroups.value = e.target.checked
                              ? [...new Set([...base, groupItem.id])]
                              : base.filter((x) => x !== groupItem.id);
                          }}
                        />
                        <span>
                          {groupItem.name} <span className="text-zinc-500">({groupItem.member_count})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <Button type="submit" disabled={replaceGroups.isPending}>
                  Guardar grupos
                </Button>
                {replaceGroups.isError && <ErrorState />}
              </form>
            </Panel>
          )}

          {isOwner && (
            <Panel className="border-red-500/25 dark:border-red-500/25">
              <h2 className="text-base font-semibold text-red-700 dark:text-red-400">Zona de riesgo</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                La eliminación purga fragmentos inmediatamente y programa el borrado seguro en RustFS.
              </p>
              <Button
                variant="danger"
                className="mt-4"
                disabled={remove.isPending}
                onClick={() => {
                  confirmDeleteOpen.value = true;
                }}
              >
                Eliminar documento
              </Button>
            </Panel>
          )}
        </div>
      </div>

      <Modal
        open={!!inspectedChunk.value}
        onClose={() => {
          inspectedChunk.value = null;
        }}
        size="lg"
        title={
          inspectedChunk.value
            ? `Fragmento ${inspectedChunk.value.ordinal + 1} · Versión ${inspectedChunk.value.document_version}`
            : 'Fragmento'
        }
        description={doc.title}
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              inspectedChunk.value = null;
            }}
          >
            Cerrar
          </Button>
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          {inspectedChunk.value?.content}
        </p>
      </Modal>

      <ConfirmDialog
        open={confirmDeleteOpen.value}
        title="¿Eliminar este documento?"
        description={`Se eliminará «${doc.title}», revocando de inmediato todas sus citas y programando el borrado de su objeto en almacenamiento.`}
        busy={remove.isPending}
        onCancel={() => {
          confirmDeleteOpen.value = false;
        }}
        onConfirm={() => remove.mutate()}
      />
    </div>
  );
}
