export const DOCUMENT_PAGE_LIMIT = 20;
export const MAX_DOCUMENT_TITLE_LENGTH = 180;
export const MIN_DOCUMENT_TITLE_LENGTH = 1;
export const MAX_TEXT_DOCUMENT_CHARACTERS = 100_000;
export const MAX_TEXT_DOCUMENT_UTF8_BYTES = 102_400; // 100 KiB
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MiB
export const MAX_FILE_BYTES = MAX_UPLOAD_BYTES;

export const DOCUMENT_VISIBILITIES = ['private', 'tenant'] as const;
