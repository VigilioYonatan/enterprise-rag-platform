import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Actor } from '../../../../security/actor';
import type { DocumentVisibilitySchema } from '../../domain/schemas/document.schema';
import type {
  DocumentStatusResponseDto,
  DocumentSummaryResponseDto,
  KnowledgeBaseResponseDto,
  TenantResponseDto,
} from '../../presentation/http/dto/knowledge.dto';
import {
  type CountedRows,
  KNOWLEDGE_REPOSITORY,
  type KnowledgeRepositoryPort,
  type PaginationWindow,
} from '../ports/knowledge-repository.port';

/** Application service owns use-case boundaries; repository executes tenant-scoped persistence. */
@Injectable()
export class KnowledgeService {
  constructor(@Inject(KNOWLEDGE_REPOSITORY) private readonly repository: KnowledgeRepositoryPort) {}

  getActorProfile(actor: Actor): Promise<Actor> {
    const method = this.repository.getActorProfile ?? this.repository.me;
    return method.call(this.repository, actor);
  }

  /** Backward compatibility alias */
  me(actor: Actor): Promise<Actor> {
    return this.getActorProfile(actor);
  }

  listTenants(actor_sub: string, pagination?: PaginationWindow): Promise<CountedRows<TenantResponseDto>> {
    const method = this.repository.listTenants ?? this.repository.tenants;
    return method.call(this.repository, actor_sub, pagination);
  }

  /** Backward compatibility alias */
  tenants(actor_sub: string, pagination?: PaginationWindow): Promise<CountedRows<TenantResponseDto>> {
    return this.listTenants(actor_sub, pagination);
  }

  createTenant(actor_sub: string, name: string): Promise<TenantResponseDto> {
    return this.repository.createTenant(actor_sub, name);
  }

  listKnowledgeBases(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<KnowledgeBaseResponseDto>> {
    const method = this.repository.listKnowledgeBases ?? this.repository.knowledgeBases;
    return method.call(this.repository, actor_sub, tenant_id, pagination);
  }

  /** Backward compatibility alias */
  knowledgeBases(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<KnowledgeBaseResponseDto>> {
    return this.listKnowledgeBases(actor_sub, tenant_id, pagination);
  }

  createKnowledgeBase(actor_sub: string, tenant_id: string, name: string): Promise<KnowledgeBaseResponseDto> {
    return this.repository.createKnowledgeBase(actor_sub, tenant_id, name);
  }

  updateKnowledgeBase(
    actor_sub: string,
    knowledge_base_id: string,
    name: string,
  ): Promise<KnowledgeBaseResponseDto> {
    if (!this.repository.updateKnowledgeBase) {
      throw new BadRequestException('Update operation unavailable');
    }
    return this.repository.updateKnowledgeBase(actor_sub, knowledge_base_id, name);
  }

  deleteKnowledgeBase(actor_sub: string, knowledge_base_id: string): Promise<{ deleted: boolean }> {
    if (!this.repository.deleteKnowledgeBase) {
      throw new NotFoundException('Knowledge base not found');
    }
    return this.repository.deleteKnowledgeBase(actor_sub, knowledge_base_id);
  }

  listDocuments(
    actor_sub: string,
    knowledge_base_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DocumentSummaryResponseDto>> {
    const method = this.repository.listDocuments ?? this.repository.documents;
    return method.call(this.repository, actor_sub, knowledge_base_id, pagination);
  }

  /** Backward compatibility alias */
  documents(
    actor_sub: string,
    knowledge_base_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DocumentSummaryResponseDto>> {
    return this.listDocuments(actor_sub, knowledge_base_id, pagination);
  }

  createTextDocument(
    actor_sub: string,
    knowledge_base_id: string,
    title: string,
    text: string,
    visibility: DocumentVisibilitySchema,
  ): Promise<DocumentStatusResponseDto> {
    const method = this.repository.createTextDocument ?? this.repository.createDocument;
    return method.call(this.repository, actor_sub, knowledge_base_id, title, text, visibility);
  }

  /** Backward compatibility alias */
  createDocument(
    actor_sub: string,
    knowledge_base_id: string,
    title: string,
    text: string,
    visibility: DocumentVisibilitySchema,
  ): Promise<DocumentStatusResponseDto> {
    return this.createTextDocument(actor_sub, knowledge_base_id, title, text, visibility);
  }
}
