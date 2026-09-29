import { type CreateTextDocumentRequestDto, createTextDocumentRequestDto } from '@enterprise-rag/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSignal, useSignals } from '@preact/signals-react/runtime';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, FileUp } from 'lucide-react';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import type { z } from 'zod';
import {
  createTextDocumentApi,
  listDocumentsApi,
  uploadDocumentBinaryApi,
} from '@/documents/apis/documents.api';
import { DOCUMENT_PAGE_LIMIT, MAX_FILE_BYTES } from '@/documents/const/documents.const';
import { type UploadMetadataDto, uploadMetadataDto } from '@/documents/dtos/upload-metadata.dto';
import { useActorKey } from '~/auth/auth-context';
import { Alert } from '~/libs/ui/alert';
import { Button } from '~/libs/ui/button';
import { EmptyState, ErrorState, PageHeader } from '~/libs/ui/feedback';
import { Field, SelectField, TextareaField } from '~/libs/ui/field';
import { Panel } from '~/libs/ui/panel';
import { ListSkeleton } from '~/libs/ui/skeleton';
import { useToast } from '~/libs/ui/toast';

export function DocumentPage() {
  useSignals();
  const { id } = useParams();
  const actorKey = useActorKey();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const mode = useSignal<'text' | 'file'>('file');
  const offset = useSignal(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileError = useSignal('');
  const file = useSignal<File | null>(null);

  const docs = useQuery({
    queryKey: ['documents', actorKey, id, offset.value],
    queryFn: () => listDocumentsApi(id ?? '', DOCUMENT_PAGE_LIMIT, offset.value),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const form = useForm<z.input<typeof createTextDocumentRequestDto>, unknown, CreateTextDocumentRequestDto>({
    resolver: zodResolver(createTextDocumentRequestDto),
    defaultValues: { title: '', text: '', visibility: 'private' },
  });

  const uploadForm = useForm<z.input<typeof uploadMetadataDto>, unknown, UploadMetadataDto>({
    resolver: zodResolver(uploadMetadataDto),
    defaultValues: { title: '', visibility: 'private' },
  });

  const textMutation = useMutation({
    mutationFn: (documentPayload: CreateTextDocumentRequestDto) =>
      createTextDocumentApi(id ?? '', documentPayload),
    onSuccess: async () => {
      form.reset();
      offset.value = 0;
      toast({
        variant: 'success',
        title: 'Documento encolado',
        description: 'El worker está fragmentando e indexando el contenido textual.',
      });
      await queryClient.invalidateQueries({ queryKey: ['documents', actorKey, id] });
    },
  });

  const fileMutation = useMutation({
    mutationFn: async (uploadMetadata: UploadMetadataDto) => {
      if (!file.value) throw new Error('Selecciona un archivo');
      if (file.value.size < 1 || file.value.size > MAX_FILE_BYTES) {
        throw new Error('El archivo debe medir entre 1 byte y 20 MiB');
      }
      const data = new FormData();
      data.append('file', file.value);
      data.append('title', uploadMetadata.title || file.value.name);
      data.append('visibility', uploadMetadata.visibility);
      return uploadDocumentBinaryApi(id ?? '', data);
    },
    onSuccess: async () => {
      file.value = null;
      if (fileRef.current) fileRef.current.value = '';
      fileError.value = '';
      uploadForm.reset();
      offset.value = 0;
      toast({
        variant: 'success',
        title: 'Archivo enviado a ingesta segura',
        description: 'ClamAV verificará el objeto en cuarentena antes de indexarlo en pgvector.',
      });
      await queryClient.invalidateQueries({ queryKey: ['documents', actorKey, id] });
    },
  });

  const totalDocs = docs.data?.count ?? 0;
  const results = docs.data?.results ?? [];

  return (
    <div className="space-y-7">
      <Link
        className="inline-flex items-center text-sm font-medium text-sky-700 hover:underline dark:text-sky-400"
        to="/app/knowledge"
      >
        ← Volver a bases
      </Link>
      <PageHeader
        eyebrow="Knowledge"
        title="Documentos e ingesta segura"
        description="Agrega archivos a la cola de cuarentena (escaneo ClamAV y extracción) o crea documentos de texto directo."
      />

      <Panel>
        <fieldset
          aria-label="Tipo de ingesta documental"
          className="mb-4 inline-flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-zinc-100/80 p-1 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <button
            type="button"
            aria-pressed={mode.value === 'file'}
            onClick={() => {
              mode.value = 'file';
            }}
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              mode.value === 'file'
                ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            <FileUp size={15} aria-hidden="true" /> Subir archivo seguro
          </button>
          <button
            type="button"
            aria-pressed={mode.value === 'text'}
            onClick={() => {
              mode.value = 'text';
            }}
            className={`inline-flex min-h-9 items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
              mode.value === 'text'
                ? 'bg-white text-zinc-950 shadow-2xs dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            <FileText size={15} aria-hidden="true" /> Pegar texto directo
          </button>
        </fieldset>

        {mode.value === 'file' ? (
          <form onSubmit={uploadForm.handleSubmit((meta) => fileMutation.mutate(meta))} className="space-y-4">
            <Field
              id="upload-title"
              label="Título visible"
              placeholder="Por defecto usa el nombre del archivo"
              error={uploadForm.formState.errors.title?.message}
              {...uploadForm.register('title')}
            />

            <div>
              <label
                htmlFor="file"
                className="mb-1.5 block text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Archivo (PDF, DOCX, TXT, MD, máx. 20 MiB)
              </label>
              <input
                id="file"
                ref={fileRef}
                type="file"
                accept=".pdf,.txt,.md,.docx,.html,.csv,.json"
                className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-xl file:border file:border-zinc-300 file:bg-white file:px-4 file:py-2 file:text-xs file:font-semibold file:text-zinc-900 hover:file:bg-zinc-50 dark:text-zinc-400 dark:file:border-zinc-700 dark:file:bg-zinc-800 dark:file:text-zinc-100 dark:hover:file:bg-zinc-700"
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0] || null;
                  file.value = selectedFile;
                  fileError.value = '';
                }}
              />
              <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                Formatos permitidos: PDF, TXT, MD, DOCX, HTML, CSV, JSON (máx. 20 MiB). Los archivos pasan por
                cuarentena y ClamAV.
              </p>
              {fileError.value && (
                <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {fileError.value}
                </p>
              )}
            </div>

            <SelectField
              id="file-visibility"
              label="Visibilidad inicial"
              error={uploadForm.formState.errors.visibility?.message}
              {...uploadForm.register('visibility')}
            >
              <option value="private">Privado (solo tú y grants explícitos)</option>
              <option value="tenant">Tenant (todos los miembros de la organización)</option>
            </SelectField>

            <Button type="submit" disabled={!file.value || fileMutation.isPending}>
              {fileMutation.isPending ? 'Enviando a cuarentena…' : 'Enviar archivo a ingesta'}
            </Button>

            {fileMutation.isError && (
              <Alert variant="danger">
                {fileMutation.error instanceof Error ? fileMutation.error.message : 'Error en la subida'}
              </Alert>
            )}
          </form>
        ) : (
          <form
            onSubmit={form.handleSubmit((documentPayload) => textMutation.mutate(documentPayload))}
            className="space-y-4"
          >
            <Field
              id="text-title"
              label="Título"
              placeholder="Ej. Procedimiento de compras 2026"
              error={form.formState.errors.title?.message}
              {...form.register('title')}
            />
            <TextareaField
              id="text-content"
              label="Contenido"
              rows={8}
              placeholder="Pega aquí el contenido que será fragmentado e indexado…"
              error={form.formState.errors.text?.message}
              {...form.register('text')}
            />
            <SelectField
              id="text-visibility"
              label="Visibilidad inicial"
              error={form.formState.errors.visibility?.message}
              {...form.register('visibility')}
            >
              <option value="private">Privado (solo tú y grants explícitos)</option>
              <option value="tenant">Tenant (todos los miembros de la organización)</option>
            </SelectField>
            <Button type="submit" disabled={textMutation.isPending}>
              {textMutation.isPending ? 'Encolando…' : 'Indexar texto'}
            </Button>
            {textMutation.isError && <ErrorState />}
          </form>
        )}
      </Panel>

      <Panel>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
            Documentos en la base ({totalDocs})
          </h2>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">Actualización automática cada 5 s</span>
        </div>

        {docs.isLoading ? (
          <div className="mt-4">
            <ListSkeleton rows={3} label="Cargando información…" />
          </div>
        ) : docs.isError ? (
          <div className="mt-4">
            <ErrorState />
          </div>
        ) : results.length ? (
          <div className="mt-4 space-y-4">
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {results.map((documentItem) => (
                <li key={documentItem.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/app/documents/${documentItem.id}`}
                      className="block truncate text-sm font-medium text-zinc-900 hover:text-sky-600 hover:underline dark:text-zinc-100 dark:hover:text-sky-400"
                    >
                      {documentItem.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{documentItem.visibility === 'tenant' ? 'Toda la organización' : 'Privado'}</span>
                      <span>·</span>
                      <span>{new Date(documentItem.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        documentItem.status === 'ready'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300'
                          : documentItem.status === 'failed'
                            ? 'bg-red-500/10 text-red-700 dark:bg-red-400/10 dark:text-red-300'
                            : documentItem.status === 'queued'
                              ? 'bg-amber-500/10 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300'
                              : 'bg-sky-500/10 text-sky-700 dark:bg-sky-400/10 dark:text-sky-300'
                      }`}
                    >
                      {documentItem.status === 'ready'
                        ? 'Listo'
                        : documentItem.status === 'failed'
                          ? 'Fallido'
                          : documentItem.status === 'queued'
                            ? 'En cola'
                            : 'Indexando'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>

            {totalDocs > DOCUMENT_PAGE_LIMIT && (
              <div className="flex items-center justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <Button
                  variant="secondary"
                  disabled={offset.value === 0}
                  onClick={() => {
                    offset.value = Math.max(0, offset.value - DOCUMENT_PAGE_LIMIT);
                  }}
                >
                  Anterior
                </Button>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  Mostrando {offset.value + 1}–{Math.min(offset.value + DOCUMENT_PAGE_LIMIT, totalDocs)} de{' '}
                  {totalDocs}
                </span>
                <Button
                  variant="secondary"
                  disabled={offset.value + DOCUMENT_PAGE_LIMIT >= totalDocs}
                  onClick={() => {
                    offset.value = offset.value + DOCUMENT_PAGE_LIMIT;
                  }}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <EmptyState
              title="Sin documentos"
              description="Sube un archivo para pasarlo por cuarentena o añade texto directo para indexación inmediata."
            />
          </div>
        )}
      </Panel>
    </div>
  );
}
