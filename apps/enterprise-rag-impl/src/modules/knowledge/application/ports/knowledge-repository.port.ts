import type { Actor } from '../../../../security/actor';
import type { CountedRows, PaginationWindow } from '../../../../shared/types/pagination.type';
import type { DocumentVisibilitySchema } from '../../domain/schemas/document.schema';
import type {
  DocumentStatusResponseDto,
  DocumentSummaryResponseDto,
  KnowledgeBaseResponseDto,
  TenantResponseDto,
} from '../../presentation/http/dto/knowledge.dto';

export type { CountedRows, PaginationWindow };

/** Application-owned persistence contract; Drizzle, pg and HTTP never enter its API. */
export interface KnowledgeRepositoryPort {
  getActorProfile(actor: Actor): Promise<Actor>;
  me(actor: Actor): Promise<Actor>;

  listTenants(actor_sub: string, pagination?: PaginationWindow): Promise<CountedRows<TenantResponseDto>>;
  tenants(actor_sub: string, pagination?: PaginationWindow): Promise<CountedRows<TenantResponseDto>>;

  createTenant(actor_sub: string, name: string): Promise<TenantResponseDto>;

  listKnowledgeBases(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<KnowledgeBaseResponseDto>>;
  knowledgeBases(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<KnowledgeBaseResponseDto>>;

  createKnowledgeBase(actor_sub: string, tenant_id: string, name: string): Promise<KnowledgeBaseResponseDto>;

  updateKnowledgeBase(
    actor_sub: string,
    knowledge_base_id: string,
    name: string,
  ): Promise<KnowledgeBaseResponseDto>;

  deleteKnowledgeBase(actor_sub: string, knowledge_base_id: string): Promise<{ deleted: boolean }>;

  listDocuments(
    actor_sub: string,
    knowledge_base_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DocumentSummaryResponseDto>>;
  documents(
    actor_sub: string,
    knowledge_base_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DocumentSummaryResponseDto>>;

  createTextDocument(
    actor_sub: string,
    knowledge_base_id: string,
    title: string,
    text: string,
    visibility: DocumentVisibilitySchema,
  ): Promise<DocumentStatusResponseDto>;
  createDocument(
    actor_sub: string,
    knowledge_base_id: string,
    title: string,
    text: string,
    visibility: DocumentVisibilitySchema,
  ): Promise<DocumentStatusResponseDto>;
}

export const KNOWLEDGE_REPOSITORY = Symbol('KNOWLEDGE_REPOSITORY');
