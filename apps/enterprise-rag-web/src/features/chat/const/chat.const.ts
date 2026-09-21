export const QUERY_MIN_LENGTH = 2;
export const QUERY_MAX_LENGTH = 2000;

export const CHAT_PROGRESS_STAGES: Record<string, string> = {
  authorized: 'Autorización y presupuesto confirmados',
  retrieval: 'Recuperando fragmentos autorizados (FTS + Vector + Reranker)',
  generation: 'Generando respuesta sustentada',
  authorization: 'Revalidando permisos sobre las citas',
};
