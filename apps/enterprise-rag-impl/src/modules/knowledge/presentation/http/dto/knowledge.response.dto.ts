import { z } from 'zod';
import { createPaginatorDto } from '../../../../../shared/http/dto/paginator.dto';
import { actorProfileSchema } from '../../../domain/schemas/actor-profile.schema';
import { answerCitationSchema } from '../../../domain/schemas/answer-citation.schema';
import { answerResultSchema } from '../../../domain/schemas/answer-result.schema';
import { documentStatusSchema, documentSummarySchema } from '../../../domain/schemas/document.schema';
import { knowledgeBaseSchema } from '../../../domain/schemas/knowledge-base.schema';
import { searchHitSchema } from '../../../domain/schemas/search-hit.schema';
import { tenantSchema } from '../../../domain/schemas/tenant.schema';

export const meResponseDto = actorProfileSchema.pick({
  sub: true,
  email: true,
});

export const tenantResponseDto = tenantSchema.pick({
  id: true,
  name: true,
});

export const knowledgeBaseResponseDto = knowledgeBaseSchema.pick({
  id: true,
  tenant_id: true,
  name: true,
});

export const documentSummaryResponseDto = documentSummarySchema.pick({
  id: true,
  title: true,
  visibility: true,
  status: true,
  created_at: true,
});

export const documentStatusResponseDto = documentStatusSchema.pick({
  id: true,
  status: true,
});

export const deletedKnowledgeBaseResponseDto = z.object({
  deleted: z.boolean(),
});

export const searchHitResponseDto = searchHitSchema.pick({
  chunk_id: true,
  document_id: true,
  document_version: true,
  title: true,
  content: true,
  score: true,
});

export const answerCitationResponseDto = answerCitationSchema.pick({
  index: true,
  document_id: true,
  chunk_id: true,
  document_version: true,
  title: true,
});

export const answerResponseDto = answerResultSchema.pick({
  answer: true,
  abstained: true,
  citations: true,
});

export const paginatedTenantsResponseDto = createPaginatorDto(tenantResponseDto);
export const paginatedKnowledgeBasesResponseDto = createPaginatorDto(knowledgeBaseResponseDto);
export const paginatedDocumentsResponseDto = createPaginatorDto(documentSummaryResponseDto);

export type MeResponseDto = z.output<typeof meResponseDto>;
export type TenantResponseDto = z.output<typeof tenantResponseDto>;
export type KnowledgeBaseResponseDto = z.output<typeof knowledgeBaseResponseDto>;
export type DocumentSummaryResponseDto = z.output<typeof documentSummaryResponseDto>;
export type DocumentStatusResponseDto = z.output<typeof documentStatusResponseDto>;
export type DeletedKnowledgeBaseResponseDto = z.output<typeof deletedKnowledgeBaseResponseDto>;
export type SearchHitResponseDto = z.output<typeof searchHitResponseDto>;
export type AnswerCitationResponseDto = z.output<typeof answerCitationResponseDto>;
export type AnswerResponseDto = z.output<typeof answerResponseDto>;
export type PaginatedTenantsResponseDto = z.output<typeof paginatedTenantsResponseDto>;
export type PaginatedKnowledgeBasesResponseDto = z.output<typeof paginatedKnowledgeBasesResponseDto>;
export type PaginatedDocumentsResponseDto = z.output<typeof paginatedDocumentsResponseDto>;
