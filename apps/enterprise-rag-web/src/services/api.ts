import { userManager } from '../auth/oidc';
import { getRuntimeConfig } from '../config/runtime-config';
import { SseDecoder, type SseFrame } from './sse';

export type { SseFrame };

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function getApiBase(): string {
  return getRuntimeConfig().apiBase;
}

async function authorizedHeaders(): Promise<{ Authorization: string }> {
  const user = await userManager.getUser();
  if (!user || user.expired) {
    throw new ApiError('Tu sesión expiró. Inicia sesión nuevamente.', 401, 'SESSION_EXPIRED');
  }
  return { Authorization: `Bearer ${user.access_token}` };
}

function fallbackStatusMessage(status: number): string {
  if (status === 400) return 'Datos de entrada inválidos. Revisa los campos e inténtalo de nuevo.';
  if (status === 401) return 'Tu sesión no es válida. Inicia sesión nuevamente.';
  if (status === 403) return 'No tienes permisos para esta operación.';
  if (status === 404) return 'Recurso no encontrado o inaccesible.';
  if (status === 409) return 'Conflicto de estado o registro duplicado.';
  if (status === 429) return 'Se alcanzó un límite de uso o presupuesto diario.';
  if (status === 503) return 'Servicio temporalmente no disponible.';
  return `Error del servidor (${status})`;
}

async function parseErrorResponse(response: Response): Promise<ApiError> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as {
        code?: unknown;
        message?: unknown;
        error?: unknown;
      };
      const code = typeof payload.code === 'string' ? payload.code : undefined;
      if (code === 'BUDGET_EXHAUSTED') {
        return new ApiError(
          'Se agotó el presupuesto diario de consultas de la organización.',
          response.status,
          code,
        );
      }
      if (typeof payload.message === 'string' && payload.message.trim().length > 0) {
        return new ApiError(payload.message, response.status, code);
      }
      if (Array.isArray(payload.message) && payload.message.length > 0) {
        return new ApiError(payload.message.map(String).join(' · '), response.status, code);
      }
    } catch {
      // Fall back to HTTP status mapping when JSON parsing fails.
    }
  }
  return new ApiError(fallbackStatusMessage(response.status), response.status);
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const auth = await authorizedHeaders();
  const isMultipart = init.body instanceof FormData;
  const response = await fetch(getApiBase() + path, {
    ...init,
    headers: {
      ...(!isMultipart && init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...auth,
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new ApiError('Respuesta API inesperada', response.status);
  }
  return response.json() as Promise<T>;
}

export function isPaginatedPayload<T>(value: unknown): value is PaginatedResponse<T> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Partial<PaginatedResponse<T>>;
  return typeof candidate.count === 'number' && Array.isArray(candidate.results);
}

export async function apiPaginated<T>(path: string, init: RequestInit = {}): Promise<PaginatedResponse<T>> {
  const payload = await api<PaginatedResponse<T> | T[]>(path, init);
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload,
    };
  }
  if (isPaginatedPayload<T>(payload)) {
    return payload;
  }
  throw new ApiError('Respuesta paginada inválida del servidor', 500);
}

export async function apiList<T>(path: string, init: RequestInit = {}): Promise<T[]> {
  const page = await apiPaginated<T>(path, init);
  return page.results;
}

export async function downloadDocument(documentId: string, filename: string): Promise<void> {
  const auth = await authorizedHeaders();
  const response = await fetch(`${getApiBase()}/documents/${encodeURIComponent(documentId)}/download`, {
    headers: auth,
  });
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

function extractSseErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const record = data as { code?: unknown; message?: unknown };
    if (record.code === 'BUDGET_EXHAUSTED') {
      return 'Se agotó el presupuesto diario de consultas de la organización.';
    }
    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return record.message;
    }
  }
  return 'El servidor no pudo completar la respuesta.';
}

async function consumeSseStream(response: Response, onEvent: (frame: SseFrame) => void): Promise<void> {
  if (!response.ok) {
    throw await parseErrorResponse(response);
  }
  if (!response.body) {
    throw new ApiError('El servidor no inició un flujo de eventos válido.', response.status);
  }

  const decoder = new SseDecoder();
  const reader = response.body.getReader();
  const textDecoder = new TextDecoder();
  let completed = false;

  const handleFrames = (frames: SseFrame[]) => {
    for (const frame of frames) {
      onEvent(frame);
      if (frame.event === 'complete') completed = true;
      if (frame.event === 'error') {
        throw new Error(extractSseErrorMessage(frame.data));
      }
    }
  };

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        const trailing = textDecoder.decode();
        if (trailing) {
          handleFrames(decoder.push(trailing));
        }
        break;
      }
      handleFrames(decoder.push(textDecoder.decode(value, { stream: true })));
    }
    if (!completed) {
      throw new Error('La conexión se cerró antes de completar la respuesta.');
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

/** POST + Bearer authenticated SSE: EventSource cannot attach an Authorization header. */
export async function streamAnswer(
  input: { knowledge_base_id: string; question: string },
  signal: AbortSignal,
  onEvent: (frame: SseFrame) => void,
): Promise<void> {
  const auth = await authorizedHeaders();
  const response = await fetch(`${getApiBase()}/answers/stream`, {
    method: 'POST',
    signal,
    headers: { ...auth, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify(input),
  });
  await consumeSseStream(response, onEvent);
}

/** POST + Bearer authenticated SSE turn inside an existing conversation. */
export async function streamConversationMessage(
  conversationId: string,
  question: string,
  signal: AbortSignal,
  onEvent: (frame: SseFrame) => void,
): Promise<void> {
  const auth = await authorizedHeaders();
  const response = await fetch(
    `${getApiBase()}/conversations/${encodeURIComponent(conversationId)}/messages/stream`,
    {
      method: 'POST',
      signal,
      headers: { ...auth, 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ question }),
    },
  );
  await consumeSseStream(response, onEvent);
}
