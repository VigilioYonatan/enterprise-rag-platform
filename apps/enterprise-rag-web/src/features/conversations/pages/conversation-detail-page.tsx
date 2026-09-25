import type { ConversationCitationResponseDto, ResolvedCitationResponseDto } from '@enterprise-rag/contracts';
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Maximize2, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  deleteConversationApi,
  getConversationApi,
  resolveCitationApi,
  streamConversationTurnApi,
} from '@/conversations/apis/conversations.api';
import { CONVERSATION_STAGE_NAMES as stageNames } from '@/conversations/const/conversations.const';
import { useActorKey } from '~/auth/auth-context';
import { Button } from '~/libs/ui/button';
import { ConfirmDialog } from '~/libs/ui/confirm-dialog';
import { EmptyState, ErrorState, PageHeader } from '~/libs/ui/feedback';
import { inputControlClassName } from '~/libs/ui/field';
import { Modal } from '~/libs/ui/modal';
import { Panel } from '~/libs/ui/panel';
import { PageSkeleton, Skeleton } from '~/libs/ui/skeleton';
import { useToast } from '~/libs/ui/toast';

export function ConversationDetailPage() {
  useSignals();
  const { id } = useParams();
  const navigate = useNavigate();
  const actorKey = useActorKey();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const question = useSignal('');
  const citation = useSignal<ResolvedCitationResponseDto | null>(null);
  const citationModalOpen = useSignal(false);
  const sourceError = useSignal('');
  const streamStage = useSignal('');
  const streamError = useSignal('');
  const streaming = useSignal(false);
  const confirmDeleteOpen = useSignal(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const conversation = useQuery({
    queryKey: ['conversation', actorKey, id],
    queryFn: () => getConversationApi(id ?? ''),
    enabled: !!id,
  });

  const removeConversation = useMutation({
    mutationFn: () => deleteConversationApi(id ?? ''),
    onSuccess: async () => {
      confirmDeleteOpen.value = false;
      toast({
        variant: 'info',
        title: 'Conversación eliminada',
      });
      await queryClient.invalidateQueries({ queryKey: ['conversations', actorKey] });
      navigate('/app/conversations');
    },
  });

  async function sendStreamingTurn() {
    if (!id || question.value.trim().length < 2 || streaming.value) return;
    const abortController = new AbortController();
    abortRef.current = abortController;
    streaming.value = true;
    streamError.value = '';
    streamStage.value = 'Conectando…';

    try {
      await streamConversationTurnApi(id, question.value.trim(), abortController.signal, (frame) => {
        if (
          frame.event === 'status' &&
          typeof frame.data === 'object' &&
          frame.data !== null &&
          'phase' in frame.data
        ) {
          const phase = String(frame.data.phase);
          streamStage.value = stageNames[phase] || 'Procesando…';
        }
      });
      question.value = '';
      streamStage.value = '';
      await queryClient.invalidateQueries({ queryKey: ['conversation', actorKey, id] });
    } catch (err) {
      if (!abortController.signal.aborted) {
        streamError.value =
          err instanceof Error
            ? err.message
            : 'No se pudo responder. Revisa cuotas, conexión y disponibilidad del modelo.';
        streamStage.value = '';
      }
    } finally {
      abortRef.current = null;
      streaming.value = false;
    }
  }

  async function inspectCitation(targetCitation: ConversationCitationResponseDto) {
    citation.value = null;
    sourceError.value = '';
    try {
      citation.value = await resolveCitationApi(id ?? '', targetCitation.id);
    } catch (err) {
      sourceError.value =
        err instanceof Error
          ? err.message
          : 'La cita ya no es accesible. Puede haberse revocado el permiso o cambiado la versión.';
    }
  }

  if (conversation.isLoading) return <PageSkeleton label="Cargando información…" />;
  if (conversation.isError || !conversation.data) {
    return <ErrorState message="Conversación inaccesible o eliminada." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/app/conversations"
          className="text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
        >
          ← Conversaciones
        </Link>
        <Button
          variant="ghost"
          className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/15"
          onClick={() => {
            confirmDeleteOpen.value = true;
          }}
        >
          <Trash2 size={15} aria-hidden="true" /> Eliminar conversación
        </Button>
      </div>

      <PageHeader
        eyebrow="Assistant / Grounded"
        title={conversation.data.title}
        description="Respuesta sustentada en fragmentos autorizados. Las fuentes se comprueban cada vez que las abres."
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <div className="space-y-4">
          <Panel>
            <h2 className="mb-3 text-base font-semibold text-zinc-950 dark:text-zinc-50">Mensajes</h2>
            {conversation.data.messages.length ? (
              <ol aria-live="polite" className="space-y-4">
                {conversation.data.messages.map((message) => (
                  <li
                    key={message.id}
                    className={`rounded-xl border p-4 ${
                      message.role === 'user'
                        ? 'border-sky-500/25 bg-sky-500/10 text-zinc-950 dark:text-zinc-100'
                        : 'border-zinc-200 bg-zinc-50/50 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-100'
                    }`}
                  >
                    <div className="mb-2 font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {message.role === 'user' ? 'Tú' : 'Asistente'}
                      {message.abstained ? ' · abstención' : ''}
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                    {message.citations?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.citations.map((citationItem) => (
                          <button
                            key={citationItem.id}
                            type="button"
                            onClick={() => void inspectCitation(citationItem)}
                            className="rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 font-mono text-xs font-medium text-sky-800 transition-colors hover:bg-sky-500/20 dark:text-sky-300"
                          >
                            [{citationItem.reference_index}] {citationItem.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
                {streaming.value && (
                  <li
                    aria-hidden="true"
                    className="space-y-2.5 rounded-xl border border-zinc-200 bg-zinc-50/40 p-4 dark:border-zinc-800 dark:bg-zinc-900/40"
                  >
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3.5 w-full" />
                    <Skeleton className="h-3.5 w-5/6" />
                  </li>
                )}
              </ol>
            ) : (
              <EmptyState
                title="Escribe la primera pregunta"
                description="Las fuentes aparecerán como citas verificables en cada respuesta."
              />
            )}
          </Panel>

          <Panel>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendStreamingTurn();
              }}
            >
              <label
                htmlFor="conversation-question"
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Pregunta a tu base
              </label>
              <textarea
                id="conversation-question"
                maxLength={500}
                rows={4}
                className={inputControlClassName}
                value={question.value}
                onChange={(e) => {
                  question.value = e.target.value;
                }}
                placeholder="¿Cuál es la política de acceso…?"
              />
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={streaming.value || question.value.trim().length < 2}>
                  {streaming.value ? 'Consultando modelo…' : 'Enviar pregunta'}
                </Button>
                {streaming.value && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      abortRef.current?.abort();
                      streaming.value = false;
                      streamStage.value = 'Cancelado por el usuario';
                    }}
                  >
                    Cancelar
                  </Button>
                )}
                <span
                  role="status"
                  aria-live="polite"
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
                >
                  {streamStage.value}
                </span>
              </div>
              {streamError.value && (
                <div className="mt-3">
                  <ErrorState message={streamError.value} />
                </div>
              )}
            </form>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Cita seleccionada</h2>
              {citation.value && (
                <Button
                  variant="ghost"
                  className="p-1 text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
                  onClick={() => {
                    citationModalOpen.value = true;
                  }}
                  title="Ampliar cita"
                >
                  <Maximize2 size={16} />
                </Button>
              )}
            </div>

            {citation.value ? (
              <div className="mt-3 space-y-2">
                <div className="font-mono text-xs font-bold text-sky-700 dark:text-sky-400">
                  [{citation.value.reference_index}] {citation.value.title}
                </div>
                <p className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-100 p-3 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                  {citation.value.content}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Pulsa en cualquier [n] para comprobar la fuente contra los permisos actuales.
              </p>
            )}

            {sourceError.value && <ErrorState message={sourceError.value} />}
          </Panel>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen.value}
        title="¿Eliminar esta conversación?"
        description="Se borrará de tu historial. Esta acción no se puede deshacer."
        confirmLabel="Confirmar eliminación"
        busy={removeConversation.isPending}
        onConfirm={() => removeConversation.mutate()}
        onCancel={() => {
          confirmDeleteOpen.value = false;
        }}
      />

      <Modal
        open={citationModalOpen.value}
        title={
          citation.value
            ? `[${citation.value.reference_index}] ${citation.value.title}`
            : 'Detalle de la Cita'
        }
        onClose={() => {
          citationModalOpen.value = false;
        }}
      >
        <div className="space-y-4">
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Fragmento verificado contra políticas RLS y versión documental vigente
          </p>
          <p className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg bg-zinc-100 p-4 font-mono text-xs leading-relaxed text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
            {citation.value?.content}
          </p>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              onClick={() => {
                citationModalOpen.value = false;
              }}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
