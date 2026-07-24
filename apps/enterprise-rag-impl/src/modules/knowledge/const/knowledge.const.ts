export const MAX_TEXT_DOCUMENT_CHARACTERS = 100_000;
export const MAX_TEXT_DOCUMENT_UTF8_BYTES = 102_400;
export const MIN_QUESTION_LENGTH = 2;
export const MAX_QUESTION_LENGTH = 500;
export const RETRIEVAL_TOP_K = 10;
export const MAX_CHUNK_EXCERPT_CHARACTERS = 1400;
export const MAX_ANSWER_CHARACTERS = 12_000;
export const SUPPORTED_EMBEDDING_DIMENSIONS = new Set<number>([768, 1024]);
export const ABSTENTION_MESSAGE = 'No encuentro evidencia autorizada suficiente para responder.';
export const AI_PROVIDER_UNAVAILABLE_MESSAGE =
  'El proveedor de IA no está disponible. Intenta de nuevo o consulta Búsqueda.';
