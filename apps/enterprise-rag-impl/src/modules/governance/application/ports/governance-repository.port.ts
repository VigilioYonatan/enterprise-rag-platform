import type { CountedRows, PaginationWindow } from '../../../../shared/types/pagination.type';
import type { DlqSourceSchema } from '../../domain/schemas/dlq-item.schema';
import type { TenantMemberSchema, TenantRoleSchema } from '../../domain/schemas/tenant-member.schema';
import type {
  AuditEventItemResponseDto,
  DlqItemResponseDto,
  DocumentChunkResponseDto,
  DocumentDetailResponseDto,
  DocumentVersionResponseDto,
  IngestionJobResponseDto,
  MemberResponseDto,
  TenantBudgetResponseDto,
  UsageSummaryItemResponseDto,
} from '../../presentation/http/dto/governance.dto';

export interface GovernanceRepositoryPort {
  listMembers(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<MemberResponseDto>>;
  members(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<MemberResponseDto>>;

  changeMemberRole(
    actor_sub: string,
    tenant_id: string,
    user_sub: string,
    role: TenantRoleSchema,
  ): Promise<{ user_sub: string; role: TenantRoleSchema }>;
  changeRole(
    actor_sub: string,
    tenant_id: string,
    user_sub: string,
    role: TenantRoleSchema,
  ): Promise<{ user_sub: string; role: TenantRoleSchema }>;

  removeMember(actor_sub: string, tenant_id: string, user_sub: string): Promise<{ removed: boolean }>;

  getDocumentDetail(actor_sub: string, document_id: string): Promise<DocumentDetailResponseDto>;
  document(actor_sub: string, document_id: string): Promise<DocumentDetailResponseDto>;

  listDocumentVersions(
    actor_sub: string,
    document_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DocumentVersionResponseDto>>;
  versions(
    actor_sub: string,
    document_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DocumentVersionResponseDto>>;

  listDocumentChunks(
    actor_sub: string,
    document_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DocumentChunkResponseDto>>;
  documentChunks(
    actor_sub: string,
    document_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DocumentChunkResponseDto>>;

  listDocumentGrants(
    actor_sub: string,
    document_id: string,
  ): Promise<Array<{ user_sub: string; email: string | null; created_at: Date }>>;
  grants(
    actor_sub: string,
    document_id: string,
  ): Promise<Array<{ user_sub: string; email: string | null; created_at: Date }>>;

  replaceDocumentGrants(
    actor_sub: string,
    document_id: string,
    user_subs: string[],
  ): Promise<{ document_id: string; granted_users: number }>;
  replaceGrants(
    actor_sub: string,
    document_id: string,
    user_subs: string[],
  ): Promise<{ document_id: string; granted_users: number }>;

  deleteDocument(actor_sub: string, document_id: string): Promise<{ deleted: boolean }>;

  getIngestionJob(actor_sub: string, job_id: string): Promise<IngestionJobResponseDto>;
  jobs(actor_sub: string, job_id: string): Promise<IngestionJobResponseDto>;

  retryIngestionJob(actor_sub: string, job_id: string): Promise<{ id: string; status: string }>;
  retryJob(actor_sub: string, job_id: string): Promise<{ id: string; status: string }>;

  getUsageSummary(actor_sub: string, tenant_id: string): Promise<UsageSummaryItemResponseDto[]>;
  usage(actor_sub: string, tenant_id: string): Promise<UsageSummaryItemResponseDto[]>;

  getTenantBudget(actor_sub: string, tenant_id: string): Promise<TenantBudgetResponseDto>;
  budget(actor_sub: string, tenant_id: string): Promise<TenantBudgetResponseDto>;

  updateTenantBudget(
    actor_sub: string,
    tenant_id: string,
    limit: number,
    cost_limit?: number,
  ): Promise<TenantBudgetResponseDto>;
  updateBudget(
    actor_sub: string,
    tenant_id: string,
    limit: number,
    cost_limit?: number,
  ): Promise<TenantBudgetResponseDto>;

  listAuditEvents(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<AuditEventItemResponseDto>>;
  audit(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<AuditEventItemResponseDto>>;

  addMember(
    actor_sub: string,
    tenant_id: string,
    email: string,
    role: Exclude<TenantRoleSchema, 'owner'>,
  ): Promise<Pick<TenantMemberSchema, 'user_sub' | 'role'>>;

  listAccessGroups(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<{ id: string; name: string; member_count: number }>>;
  groups(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<{ id: string; name: string; member_count: number }>>;

  createAccessGroup(
    actor_sub: string,
    tenant_id: string,
    name: string,
  ): Promise<{ id: string; tenant_id: string; name: string }>;
  createGroup(
    actor_sub: string,
    tenant_id: string,
    name: string,
  ): Promise<{ id: string; tenant_id: string; name: string }>;

  deleteAccessGroup(actor_sub: string, group_id: string): Promise<{ removed: boolean }>;
  deleteGroup(actor_sub: string, group_id: string): Promise<{ removed: boolean }>;

  listGroupMembers(
    actor_sub: string,
    group_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<{ user_sub: string; email: string | null }>>;
  groupMembers(
    actor_sub: string,
    group_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<{ user_sub: string; email: string | null }>>;

  addGroupMember(actor_sub: string, group_id: string, user_sub: string): Promise<{ user_sub: string }>;
  removeGroupMember(actor_sub: string, group_id: string, user_sub: string): Promise<{ removed: boolean }>;

  listDocumentGroupGrants(actor_sub: string, document_id: string): Promise<Array<{ group_id: string }>>;
  groupGrants(actor_sub: string, document_id: string): Promise<Array<{ group_id: string }>>;

  replaceDocumentGroupGrants(
    actor_sub: string,
    document_id: string,
    group_ids: string[],
  ): Promise<{ document_id: string; group_count: number }>;
  replaceGroupGrants(
    actor_sub: string,
    document_id: string,
    group_ids: string[],
  ): Promise<{ document_id: string; group_count: number }>;

  listDlq(
    actor_sub: string,
    tenant_id: string,
    pagination?: PaginationWindow,
  ): Promise<CountedRows<DlqItemResponseDto>>;
  replayDlq(
    actor_sub: string,
    dlq_id: string,
    source: DlqSourceSchema,
  ): Promise<{ id: string; source: DlqSourceSchema; status: string }>;
}

export const GOVERNANCE_REPOSITORY = Symbol('GOVERNANCE_REPOSITORY');
