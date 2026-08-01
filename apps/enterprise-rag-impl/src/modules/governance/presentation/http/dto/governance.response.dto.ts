import { z } from 'zod';
import { createPaginatorDto } from '../../../../../shared/http/dto/paginator.dto';
import { accessGroupSchema } from '../../../domain/schemas/access-group.schema';
import { accessGroupMemberSchema } from '../../../domain/schemas/access-group-member.schema';
import { auditEventSchema } from '../../../domain/schemas/audit-event.schema';
import { dlqItemSchema, dlqSourceSchema } from '../../../domain/schemas/dlq-item.schema';
import { documentChunkSchema } from '../../../domain/schemas/document-chunk.schema';
import { documentDetailSchema } from '../../../domain/schemas/document-detail.schema';
import { documentGrantSchema } from '../../../domain/schemas/document-grant.schema';
import { documentVersionSchema } from '../../../domain/schemas/document-version.schema';
import { ingestionJobSchema } from '../../../domain/schemas/ingestion-job.schema';
import { tenantBudgetSchema } from '../../../domain/schemas/tenant-budget.schema';
import { tenantMemberSchema } from '../../../domain/schemas/tenant-member.schema';
import { usageSummarySchema } from '../../../domain/schemas/usage-summary.schema';

export const memberResponseDto = tenantMemberSchema.pick({
  user_sub: true,
  email: true,
  role: true,
});

export const roleChangedResponseDto = tenantMemberSchema.pick({
  user_sub: true,
  role: true,
});

export const removedResponseDto = z.object({
  removed: z.boolean(),
});

export const deletedDocumentResponseDto = z.object({
  deleted: z.boolean(),
});

export const documentDetailResponseDto = documentDetailSchema.pick({
  id: true,
  tenant_id: true,
  knowledge_base_id: true,
  title: true,
  visibility: true,
  status: true,
  version: true,
  owner_sub: true,
  created_at: true,
  media_type: true,
  original_filename: true,
  byte_size: true,
});

export const documentVersionResponseDto = documentVersionSchema.pick({
  id: true,
  version: true,
  sha256: true,
  media_type: true,
  original_filename: true,
  created_at: true,
});

export const documentChunkResponseDto = documentChunkSchema.pick({
  id: true,
  ordinal: true,
  content: true,
  document_version: true,
});

export const documentGrantResponseDto = documentGrantSchema.pick({
  user_sub: true,
  email: true,
  created_at: true,
});

export const replaceAccessResponseDto = z.object({
  document_id: z.uuid(),
  granted_users: z.number().int(),
});

export const ingestionJobResponseDto = ingestionJobSchema.pick({
  id: true,
  status: true,
  stage: true,
  attempts: true,
  created_at: true,
  updated_at: true,
  completed_at: true,
  error_message: true,
});

export const retryJobResponseDto = z.object({
  id: z.uuid(),
  status: z.string(),
});

export const usageSummaryItemResponseDto = usageSummarySchema.pick({
  category: true,
  requests: true,
  input_tokens: true,
  output_tokens: true,
  cost_usd: true,
  average_latency_ms: true,
});

export const tenantBudgetResponseDto = tenantBudgetSchema.pick({
  tenant_id: true,
  daily_answer_limit: true,
  daily_cost_limit_usd: true,
  updated_at: true,
});

export const auditEventItemResponseDto = auditEventSchema.pick({
  id: true,
  action: true,
  target_type: true,
  target_id: true,
  actor_sub: true,
  created_at: true,
});

export const dlqItemResponseDto = dlqItemSchema.pick({
  id: true,
  source: true,
  target_id: true,
  title: true,
  attempts: true,
  error_message: true,
  updated_at: true,
});

export const dlqReplayResponseDto = z.object({
  id: z.uuid(),
  source: dlqSourceSchema,
  status: z.string(),
});

// Group responses
export const groupSummaryResponseDto = accessGroupSchema.pick({
  id: true,
  name: true,
  member_count: true,
});

export const createdGroupResponseDto = accessGroupSchema.pick({
  id: true,
  tenant_id: true,
  name: true,
});

export const groupMemberResponseDto = accessGroupMemberSchema.pick({
  user_sub: true,
  email: true,
});

export const groupGrantResponseDto = z.object({
  group_id: z.uuid(),
});

export const replaceGroupGrantsResponseDto = z.object({
  document_id: z.uuid(),
  group_count: z.number().int(),
});

export const paginatedMembersResponseDto = createPaginatorDto(memberResponseDto);
export const paginatedVersionsResponseDto = createPaginatorDto(documentVersionResponseDto);
export const paginatedChunksResponseDto = createPaginatorDto(documentChunkResponseDto);
export const paginatedAuditEventsResponseDto = createPaginatorDto(auditEventItemResponseDto);
export const paginatedDlqResponseDto = createPaginatorDto(dlqItemResponseDto);
export const paginatedGroupsResponseDto = createPaginatorDto(groupSummaryResponseDto);
export const paginatedGroupMembersResponseDto = createPaginatorDto(groupMemberResponseDto);

export type MemberResponseDto = z.output<typeof memberResponseDto>;
export type RoleChangedResponseDto = z.output<typeof roleChangedResponseDto>;
export type RemovedResponseDto = z.output<typeof removedResponseDto>;
export type DeletedDocumentResponseDto = z.output<typeof deletedDocumentResponseDto>;
export type DocumentDetailResponseDto = z.output<typeof documentDetailResponseDto>;
export type DocumentVersionResponseDto = z.output<typeof documentVersionResponseDto>;
export type DocumentChunkResponseDto = z.output<typeof documentChunkResponseDto>;
export type DocumentGrantResponseDto = z.output<typeof documentGrantResponseDto>;
export type ReplaceAccessResponseDto = z.output<typeof replaceAccessResponseDto>;
export type IngestionJobResponseDto = z.output<typeof ingestionJobResponseDto>;
export type RetryJobResponseDto = z.output<typeof retryJobResponseDto>;
export type UsageSummaryItemResponseDto = z.output<typeof usageSummaryItemResponseDto>;
export type TenantBudgetResponseDto = z.output<typeof tenantBudgetResponseDto>;
export type AuditEventItemResponseDto = z.output<typeof auditEventItemResponseDto>;
export type DlqItemResponseDto = z.output<typeof dlqItemResponseDto>;
export type DlqReplayResponseDto = z.output<typeof dlqReplayResponseDto>;
export type GroupSummaryResponseDto = z.output<typeof groupSummaryResponseDto>;
export type CreatedGroupResponseDto = z.output<typeof createdGroupResponseDto>;
export type GroupMemberResponseDto = z.output<typeof groupMemberResponseDto>;
export type GroupGrantResponseDto = z.output<typeof groupGrantResponseDto>;
export type ReplaceGroupGrantsResponseDto = z.output<typeof replaceGroupGrantsResponseDto>;
export type PaginatedMembersResponseDto = z.output<typeof paginatedMembersResponseDto>;
export type PaginatedVersionsResponseDto = z.output<typeof paginatedVersionsResponseDto>;
export type PaginatedChunksResponseDto = z.output<typeof paginatedChunksResponseDto>;
export type PaginatedAuditEventsResponseDto = z.output<typeof paginatedAuditEventsResponseDto>;
export type PaginatedDlqResponseDto = z.output<typeof paginatedDlqResponseDto>;
export type PaginatedGroupsResponseDto = z.output<typeof paginatedGroupsResponseDto>;
export type PaginatedGroupMembersResponseDto = z.output<typeof paginatedGroupMembersResponseDto>;
