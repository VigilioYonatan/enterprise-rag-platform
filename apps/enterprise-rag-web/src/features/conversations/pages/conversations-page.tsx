import { type ConversationSummaryResponseDto, createConversationRequestDto } from '@enterprise-rag/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router-dom';
import type { z } from 'zod';
import {
  createConversationApi,
  deleteConversationApi,
  listConversationsApi,
} from '@/conversations/apis/conversations.api';
import { listKnowledgeBasesApi, listTenantsApi } from '@/knowledge/apis/knowledge.api';
import { useActorKey } from '~/auth/auth-context';
import { Alert } from '~/libs/ui/alert';
import { Button } from '~/libs/ui/button';
import { ConfirmDialog } from '~/libs/ui/confirm-dialog';
import { EmptyState, ErrorState, PageHeader } from '~/libs/ui/feedback';
import { inputControlClassName } from '~/libs/ui/field';
import { Panel } from '~/libs/ui/panel';
import { ListSkeleton } from '~/libs/ui/skeleton';
import { useToast } from '~/libs/ui/toast';

export function ConversationsPage() {
  useSignals();
  const actorKey = useActorKey();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [params] = useSearchParams();

  const selectedTenantId = useSignal('');
  const selectedKnowledgeBaseId = useSignal(params.get('kb') || '');
  const conversationPendingDeletion = useSignal<ConversationSummaryResponseDto | null>(null);

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

  const conversations = useQuery({
    queryKey: ['conversations', actorKey, currentKnowledgeBaseId],
    queryFn: () => listConversationsApi(currentKnowledgeBaseId, 50, 0),
    enabled: !!currentKnowledgeBaseId,
  });

  const createFormSchema = createConversationRequestDto.pick({ title: true });
  type CreateFormValues = z.infer<typeof createFormSchema>;

  const form = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: { title: '' },
  });

  const mutation = useMutation({
    mutationFn: (formValues: CreateFormValues) =>
      createConversationApi(currentKnowledgeBaseId, {
        title: formValues.title,
        knowledge_base_id: currentKnowledgeBaseId,
      }),
    onSuccess: async (created) => {
      form.reset();
      toast({
        variant: 'success',
        title: 'Conversación iniciada',
        description: `«${created.title}» está lista para consultas con citas.`,
      });
      await queryClient.invalidateQueries({ queryKey: ['conversations', actorKey, currentKnowledgeBaseId] });
    },
  });

  const removeConversation = useMutation({
    mutationFn: (conversationId: string) => deleteConversationApi(conversationId),
    onSuccess: async () => {
      conversationPendingDeletion.value = null;
      toast({
        variant: 'info',
        title: 'Conversación eliminada',
      });
      await queryClient.invalidateQueries({ queryKey: ['conversations', actorKey, currentKnowledgeBaseId] });
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Assistant / Conversaciones"
        title="Conversaciones con evidencia"
        description="Cada conversación está asociada a una base de conocimiento autorizada. Las citas se validan de nuevo cuando se consultan."
      />
      <Panel>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              htmlFor="chat-tenant"
            >
              Organización
            </label>
            <select
              className={inputControlClassName}
              id="chat-tenant"
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
              htmlFor="chat-kb"
              className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
            >
              Base de conocimiento
            </label>
            <select
              className={inputControlClassName}
              id="chat-kb"
              value={currentKnowledgeBaseId}
              onChange={(e) => {
                selectedKnowledgeBaseId.value = e.target.value;
              }}
            >
              {knowledge.data?.map((knowledgeBaseItem) => (
                <option key={knowledgeBaseItem.id} value={knowledgeBaseItem.id}>
                  {knowledgeBaseItem.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Panel>
      <Panel>
        <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Nueva conversación</h2>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={form.handleSubmit((formValues) => mutation.mutate(formValues))}
        >
          <label className="sr-only" htmlFor="conversation-title">
            Título de la conversación
          </label>
          <input
            id="conversation-title"
            placeholder="Ej. Consulta de políticas internas"
            className={`min-w-48 flex-1 ${inputControlClassName}`}
            aria-invalid={!!form.formState.errors.title}
            {...form.register('title')}
          />
          <Button type="submit" disabled={!currentKnowledgeBaseId || mutation.isPending}>
            Crear conversación
          </Button>
        </form>
        {form.formState.errors.title && (
          <Alert variant="danger" className="mt-3">
            {form.formState.errors.title.message}
          </Alert>
        )}
        {mutation.isError && (
          <div className="mt-3">
            <ErrorState />
          </div>
        )}
      </Panel>
      <Panel>
        <h2 className="mb-4 text-base font-semibold text-zinc-950 dark:text-zinc-50">Historial</h2>
        {conversations.isLoading ? (
          <ListSkeleton rows={3} label="Cargando información…" />
        ) : conversations.isError ? (
          <ErrorState />
        ) : conversations.data?.length ? (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {conversations.data.map((conversationItem) => (
              <li key={conversationItem.id} className="flex items-center justify-between gap-3 py-1.5">
                <Link
                  className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 focus-visible:outline-2 dark:text-zinc-100 dark:hover:bg-zinc-900/70"
                  to={`/app/conversations/${conversationItem.id}`}
                >
                  <MessageSquare
                    size={16}
                    className="shrink-0 text-sky-600 dark:text-sky-400"
                    aria-hidden="true"
                  />
                  <span className="truncate">{conversationItem.title}</span>
                </Link>
                <Button
                  variant="ghost"
                  aria-label={`Eliminar conversación ${conversationItem.title}`}
                  className="px-3 py-2 text-xs text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-500/15"
                  onClick={() => {
                    conversationPendingDeletion.value = conversationItem;
                  }}
                >
                  <Trash2 size={15} aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Sin conversaciones"
            description="Inicia una conversación dentro de la base seleccionada."
          />
        )}
      </Panel>
      <ConfirmDialog
        open={!!conversationPendingDeletion.value}
        title="¿Eliminar conversación?"
        description={
          conversationPendingDeletion.value
            ? `Se ocultará y eliminará «${conversationPendingDeletion.value.title}» de tu historial personal.`
            : ''
        }
        busy={removeConversation.isPending}
        onCancel={() => {
          conversationPendingDeletion.value = null;
        }}
        onConfirm={() => {
          if (conversationPendingDeletion.value)
            removeConversation.mutate(conversationPendingDeletion.value.id);
        }}
      />
    </div>
  );
}
