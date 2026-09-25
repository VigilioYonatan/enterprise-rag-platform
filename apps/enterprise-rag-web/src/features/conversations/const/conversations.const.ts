export const CONVERSATION_TITLE_MIN_LENGTH = 1;
export const CONVERSATION_TITLE_MAX_LENGTH = 140;

export const CONVERSATION_STAGE_NAMES: Record<string, string> = {
  authorized: 'Autorización confirmada',
  retrieval: 'Recuperando fuentes con ACL',
  generation: 'Generando respuesta',
  authorization: 'Revalidando permisos de las citas',
};
