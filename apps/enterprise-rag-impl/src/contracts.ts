/**
 * AUTO-GENERATED / CANONICAL CONTRACT BARREL
 * Public contracts owned by apps/enterprise-rag-impl:
 * Browser-safe Zod schemas, DTOs, responses, and inferred types.
 * NestJS decorators and backend runtime dependencies are strictly excluded.
 */

// --- Conversations ---
export * from './modules/conversations/const/conversations.const';
export * from './modules/conversations/domain/schemas/conversation.schema';
export * from './modules/conversations/domain/schemas/conversation-citation.schema';
export * from './modules/conversations/domain/schemas/conversation-message.schema';
export * from './modules/conversations/presentation/http/dto/conversations.dto';

// --- Evaluations ---
export * from './modules/evaluations/const/evaluations.const';
export * from './modules/evaluations/domain/schemas/evaluation-case.schema';
export * from './modules/evaluations/domain/schemas/evaluation-case-result.schema';
export * from './modules/evaluations/domain/schemas/evaluation-dataset.schema';
export * from './modules/evaluations/domain/schemas/evaluation-run.schema';
export * from './modules/evaluations/presentation/http/dto/evaluations.dto';
export * from './modules/evaluations/types/evaluations.type';

// --- Governance ---
export * from './modules/governance/const/governance.const';
export * from './modules/governance/domain/schemas/access-group.schema';
export * from './modules/governance/domain/schemas/access-group-member.schema';
export * from './modules/governance/domain/schemas/audit-event.schema';
export * from './modules/governance/domain/schemas/dlq-item.schema';
export * from './modules/governance/domain/schemas/document-chunk.schema';
export * from './modules/governance/domain/schemas/document-detail.schema';
export * from './modules/governance/domain/schemas/document-grant.schema';
export * from './modules/governance/domain/schemas/document-version.schema';
export * from './modules/governance/domain/schemas/ingestion-job.schema';
export * from './modules/governance/domain/schemas/tenant-budget.schema';
export * from './modules/governance/domain/schemas/tenant-member.schema';
export * from './modules/governance/domain/schemas/usage-summary.schema';
export * from './modules/governance/presentation/http/dto/governance.dto';
export * from './modules/governance/presentation/http/dto/groups.dto';

// --- Knowledge ---
export {
  ABSTENTION_MESSAGE,
  AI_PROVIDER_UNAVAILABLE_MESSAGE,
  MAX_ANSWER_CHARACTERS,
  MAX_CHUNK_EXCERPT_CHARACTERS,
  MAX_QUESTION_LENGTH,
  MAX_TEXT_DOCUMENT_CHARACTERS,
  MAX_TEXT_DOCUMENT_UTF8_BYTES,
  MIN_QUESTION_LENGTH,
  RETRIEVAL_TOP_K,
  SUPPORTED_EMBEDDING_DIMENSIONS,
} from './modules/knowledge/const/knowledge.const';
export * from './modules/knowledge/domain/schemas/actor-profile.schema';
export * from './modules/knowledge/domain/schemas/answer-citation.schema';
export * from './modules/knowledge/domain/schemas/answer-result.schema';
export * from './modules/knowledge/domain/schemas/document.schema';
export * from './modules/knowledge/domain/schemas/knowledge.schema';
export * from './modules/knowledge/domain/schemas/knowledge-base.schema';
export * from './modules/knowledge/domain/schemas/search-hit.schema';
export * from './modules/knowledge/domain/schemas/tenant.schema';
export * from './modules/knowledge/presentation/http/dto/knowledge.dto';

// --- Uploads ---
export {
  ALLOWED_UPLOAD_EXTENSIONS,
  MAX_DOCUMENT_TITLE_LENGTH,
  MAX_ORIGINAL_FILENAME_LENGTH,
  MAX_TEXT_DOCUMENT_CHARACTERS as MAX_UPLOAD_TEXT_DOCUMENT_CHARACTERS,
  MAX_TEXT_DOCUMENT_UTF8_BYTES as MAX_UPLOAD_TEXT_DOCUMENT_UTF8_BYTES,
  MAX_UPLOAD_BYTES,
} from './modules/uploads/const/uploads.const';
export * from './modules/uploads/domain/schemas/upload-document.schema';
export * from './modules/uploads/presentation/http/dto/uploads.dto';
export * from './modules/uploads/types/uploads.type';

// --- Shared ---
export * from './shared/const/pagination.const';
export * from './shared/http/dto/offset-pagination-query.dto';
export * from './shared/http/dto/paginator.dto';
export * from './shared/types/pagination.type';
