import type { AnswerResponseDto, SearchHitResponseDto } from '@enterprise-rag/contracts';
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useQuery } from '@tanstack/react-query';
import { MessageSquareText, Search } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { searchHybridApi, streamAnswerChatApi } from '@/chat/apis/chat.api';
import { CHAT_PROGRESS_STAGES as progressNames } from '@/chat/const/chat.const';
import { listKnowledgeBasesApi, listTenantsApi } from '@/knowledge/apis/knowledge.api';
import { useActorKey } from '~/auth/auth-context';
import { Alert } from '~/libs/ui/alert';
import { Button } from '~/libs/ui/button';
import { PageHeader } from '~/libs/ui/feedback';
import { inputControlClassName } from '~/libs/ui/field';
import { Panel } from '~/libs/ui/panel';
import { Skeleton } from '~/libs/ui/skeleton';

function isAnswer(value: unknown): value is AnswerResponseDto {
  if (!value || typeof value !== 'object') return false;
  return (
    'answer' in value &&
    typeof value.answer === 'string' &&
    'abstained' in value &&
    typeof value.abstained === 'boolean' &&
    'citations' in value &&
    Array.isArray(value.citations)
  );
}

export function AssistantPage() {
  useSignals();
  const actorKey = useActorKey();
  const [params] = useSearchParams();
  const initialKbParam = params.get('kb') || '';

  const mode = useSignal<'answer' | 'search'>('answer');
  const selectedKnowledgeBaseId = useSignal(initialKbParam);
  const query = useSignal('');
  const result = useSignal<AnswerResponseDto | null>(null);
  const chunks = useSignal<SearchHitResponseDto[] | null>(null);
  const error = useSignal('');
  const busy = useSignal(false);
  const stage = useSignal('');
  const selectedTenantId = useSignal('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

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

  const currentKnowledgeBaseId =
    knowledge.data &&
    selectedKnowledgeBaseId.value &&
    knowledge.data.some((item) => item.id === selectedKnowledgeBaseId.value)
      ? selectedKnowledgeBaseId.value
      : (knowledge.data?.[0]?.id ?? '');

  async function send() {
    if (!currentKnowledgeBaseId || query.value.trim().length < 2 || busy.value) return;
    const abortController = new AbortController();
    abortRef.current = abortController;
    busy.value = true;
    error.value = '';
    result.value = null;
    chunks.value = null;

    if (mode.value === 'search') {
      stage.value = 'Buscando fragmentos autorizados…';
      try {
        const hits = await searchHybridApi(
          currentKnowledgeBaseId,
          query.value.trim(),
          abortController.signal,
        );
        chunks.value = hits;
        stage.value = '';
      } catch (e) {
        if (!abortController.signal.aborted) {
          error.value = e instanceof Error ? e.message : 'Búsqueda fallida';
          stage.value = '';
        }
      } finally {
        abortRef.current = null;
        busy.value = false;
      }
      return;
    }

    stage.value = 'Conectando…';
    try {
      await streamAnswerChatApi(
        { knowledge_base_id: currentKnowledgeBaseId, question: query.value.trim() },
        abortController.signal,
        (frame) => {
          if (
            frame.event === 'status' &&
            typeof frame.data === 'object' &&
            frame.data !== null &&
            'phase' in frame.data
          ) {
            const phase = String(frame.data.phase);
            stage.value = progressNames[phase] || 'Procesando…';
          }
          if (frame.event === 'complete' && isAnswer(frame.data)) result.value = frame.data;
        },
      );
      if (!abortController.signal.aborted) stage.value = '';
    } catch (e) {
      if (!abortController.signal.aborted) {
        error.value = e instanceof Error ? e.message : 'Consulta fallida';
        stage.value = '';
      }
    } finally {
      abortRef.current = null;
      busy.value = false;
    }
  }

  function cancel() {
    abortRef.current?.abort();
    busy.value = false;
    stage.value = 'Cancelado por el usuario';
  }

  return (
    <div className="max-w-4xl space-y-7">
      <PageHeader
        eyebrow="Grounded assistant"
        title="Búsqueda y respuesta con evidencias"
        description="Solo utilizamos fragmentos autorizados bajo RLS. En modo respuesta, las citas se revalidan antes de entregar el resultado."
      />

      <Panel>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="space-y-4"
        >
          <fieldset
            aria-label="Modo de consulta"
            className="inline-flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              aria-pressed={mode.value === 'answer'}
              onClick={() => {
                mode.value = 'answer';
              }}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                mode.value === 'answer'
                  ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <MessageSquareText size={15} aria-hidden="true" /> Respuesta sustentada (SSE)
            </button>
            <button
              type="button"
              aria-pressed={mode.value === 'search'}
              onClick={() => {
                mode.value = 'search';
              }}
              className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                mode.value === 'search'
                  ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              <Search size={15} aria-hidden="true" /> Solo búsqueda híbrida
            </button>
          </fieldset>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                htmlFor="tenant-s"
              >
                Organización
              </label>
              <select
                id="tenant-s"
                className={inputControlClassName}
                value={currentTenantId}
                onChange={(e) => {
                  selectedTenantId.value = e.target.value;
                  selectedKnowledgeBaseId.value = '';
                }}
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
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
                htmlFor="kb-s"
              >
                Base de conocimiento
              </label>
              <select
                id="kb-s"
                className={inputControlClassName}
                value={currentKnowledgeBaseId}
                onChange={(e) => {
                  selectedKnowledgeBaseId.value = e.target.value;
                }}
              >
                <option value="">Selecciona una base</option>
                {knowledge.data?.map((knowledgeBaseItem) => (
                  <option key={knowledgeBaseItem.id} value={knowledgeBaseItem.id}>
                    {knowledgeBaseItem.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              htmlFor="question"
            >
              {mode.value === 'answer' ? 'Tu pregunta' : 'Términos o consulta semántica'}
            </label>
            <textarea
              id="question"
              className={inputControlClassName}
              rows={4}
              minLength={2}
              maxLength={500}
              placeholder="¿Qué establecen los documentos sobre…?"
              required
              value={query.value}
              onChange={(e) => {
                query.value = e.target.value;
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              disabled={busy.value || !currentKnowledgeBaseId || query.value.trim().length < 2}
            >
              {busy.value ? 'Consultando…' : mode.value === 'answer' ? 'Preguntar' : 'Buscar fragmentos'}
            </Button>
            {busy.value && (
              <Button variant="secondary" onClick={cancel}>
                Cancelar
              </Button>
            )}
            <span
              role="status"
              aria-live="polite"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400"
            >
              {stage.value}
            </span>
          </div>

          {error.value && (
            <Alert variant="danger" title="No se pudo completar la consulta">
              {error.value}
            </Alert>
          )}
        </form>
      </Panel>

      {busy.value && !result.value && !chunks.value && (
        <Panel>
          <div aria-hidden="true" className="space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </Panel>
      )}

      {result.value && (
        <section aria-labelledby="assistant-answer-title" className="space-y-4">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2
                id="assistant-answer-title"
                className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
              >
                Respuesta del asistente
              </h2>
              {result.value.abstained && (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-400/10 dark:text-amber-300">
                  Respuesta abstenida por falta de evidencia
                </span>
              )}
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
              {result.value.answer}
            </p>
          </Panel>

          <Panel>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
              Citas autorizadas ({result.value.citations.length})
            </h3>
            {result.value.citations.length ? (
              <ul className="mt-3 space-y-3">
                {result.value.citations.map((citation) => (
                  <li
                    key={citation.chunk_id}
                    className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-sky-700 dark:text-sky-400">
                        {citation.title}
                      </span>
                      {citation.document_id && (
                        <Link
                          to={`/app/documents/${citation.document_id}`}
                          className="text-xs font-medium text-sky-700 hover:underline dark:text-sky-400"
                        >
                          Ver documento →
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                Esta respuesta no incluyó citas válidas o no requirió evidencia adicional.
              </p>
            )}
          </Panel>
        </section>
      )}

      {chunks.value && (
        <section aria-labelledby="assistant-search-title">
          <Panel>
            <h2
              id="assistant-search-title"
              className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
            >
              Fragmentos autorizados ({chunks.value.length})
            </h2>
            {chunks.value.length ? (
              <ul className="mt-3 space-y-3">
                {chunks.value.map((chunk) => (
                  <li
                    key={chunk.chunk_id}
                    className="rounded-xl border border-zinc-200/90 bg-zinc-50/50 p-3.5 dark:border-zinc-800 dark:bg-zinc-900/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                        {chunk.title}
                      </span>
                      <span className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        score: {chunk.score}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-700 dark:text-zinc-300">
                      {chunk.content}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                No se encontraron fragmentos relevantes para tu consulta con los permisos actuales.
              </p>
            )}
          </Panel>
        </section>
      )}
    </div>
  );
}
