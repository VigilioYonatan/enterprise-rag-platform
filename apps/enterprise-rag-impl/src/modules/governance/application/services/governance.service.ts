import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PaginationWindow } from '~/shared/types/pagination.type';
import type { DlqSourceSchema } from '../../domain/schemas/dlq-item.schema';
import type { TenantRoleSchema } from '../../domain/schemas/tenant-member.schema';
import { PostgresGovernanceRepository } from '../../infrastructure/persistence/governance.repository';
import { GOVERNANCE_REPOSITORY, type GovernanceRepositoryPort } from '../ports/governance-repository.port';

@Injectable()
export class GovernanceService {
  private readonly repository: GovernanceRepositoryPort;

  constructor(@Optional() @Inject(GOVERNANCE_REPOSITORY) repository?: GovernanceRepositoryPort) {
    this.repository = repository ?? new PostgresGovernanceRepository();
  }

  listMembers(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.repository.listMembers(actor_sub, tenant_id, pagination);
  }

  /** Backward compatibility alias */
  members(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.listMembers(actor_sub, tenant_id, pagination);
  }

  changeMemberRole(actor_sub: string, tenant_id: string, user_sub: string, role: TenantRoleSchema) {
    return this.repository.changeMemberRole(actor_sub, tenant_id, user_sub, role);
  }

  /** Backward compatibility alias */
  changeRole(actor_sub: string, tenant_id: string, user_sub: string, role: TenantRoleSchema) {
    return this.changeMemberRole(actor_sub, tenant_id, user_sub, role);
  }

  removeMember(actor_sub: string, tenant_id: string, user_sub: string) {
    return this.repository.removeMember(actor_sub, tenant_id, user_sub);
  }

  getDocumentDetail(actor_sub: string, document_id: string) {
    return this.repository.getDocumentDetail(actor_sub, document_id);
  }

  /** Backward compatibility alias */
  document(actor_sub: string, document_id: string) {
    return this.getDocumentDetail(actor_sub, document_id);
  }

  listDocumentVersions(actor_sub: string, document_id: string, pagination?: PaginationWindow) {
    return this.repository.listDocumentVersions(actor_sub, document_id, pagination);
  }

  /** Backward compatibility alias */
  versions(actor_sub: string, document_id: string, pagination?: PaginationWindow) {
    return this.listDocumentVersions(actor_sub, document_id, pagination);
  }

  listDocumentChunks(actor_sub: string, document_id: string, pagination?: PaginationWindow) {
    return this.repository.listDocumentChunks(actor_sub, document_id, pagination);
  }

  /** Backward compatibility alias */
  documentChunks(actor_sub: string, document_id: string, pagination?: PaginationWindow) {
    return this.listDocumentChunks(actor_sub, document_id, pagination);
  }

  listDocumentGrants(actor_sub: string, document_id: string) {
    return this.repository.listDocumentGrants(actor_sub, document_id);
  }

  /** Backward compatibility alias */
  grants(actor_sub: string, document_id: string) {
    return this.listDocumentGrants(actor_sub, document_id);
  }

  replaceDocumentGrants(actor_sub: string, document_id: string, user_subs: string[]) {
    return this.repository.replaceDocumentGrants(actor_sub, document_id, user_subs);
  }

  /** Backward compatibility alias */
  replaceGrants(actor_sub: string, document_id: string, user_subs: string[]) {
    return this.replaceDocumentGrants(actor_sub, document_id, user_subs);
  }

  deleteDocument(actor_sub: string, document_id: string) {
    return this.repository.deleteDocument(actor_sub, document_id);
  }

  getIngestionJob(actor_sub: string, job_id: string) {
    return this.repository.getIngestionJob(actor_sub, job_id);
  }

  /** Backward compatibility alias */
  jobs(actor_sub: string, job_id: string) {
    return this.getIngestionJob(actor_sub, job_id);
  }

  retryIngestionJob(actor_sub: string, job_id: string) {
    return this.repository.retryIngestionJob(actor_sub, job_id);
  }

  /** Backward compatibility alias */
  retryJob(actor_sub: string, job_id: string) {
    return this.retryIngestionJob(actor_sub, job_id);
  }

  getUsageSummary(actor_sub: string, tenant_id: string) {
    return this.repository.getUsageSummary(actor_sub, tenant_id);
  }

  /** Backward compatibility alias */
  usage(actor_sub: string, tenant_id: string) {
    return this.getUsageSummary(actor_sub, tenant_id);
  }

  getTenantBudget(actor_sub: string, tenant_id: string) {
    return this.repository.getTenantBudget(actor_sub, tenant_id);
  }

  /** Backward compatibility alias */
  budget(actor_sub: string, tenant_id: string) {
    return this.getTenantBudget(actor_sub, tenant_id);
  }

  updateTenantBudget(actor_sub: string, tenant_id: string, limit: number, cost_limit?: number) {
    return this.repository.updateTenantBudget(actor_sub, tenant_id, limit, cost_limit);
  }

  /** Backward compatibility alias */
  updateBudget(actor_sub: string, tenant_id: string, limit: number, cost_limit?: number) {
    return this.updateTenantBudget(actor_sub, tenant_id, limit, cost_limit);
  }

  listAuditEvents(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.repository.listAuditEvents(actor_sub, tenant_id, pagination);
  }

  /** Backward compatibility alias */
  audit(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.listAuditEvents(actor_sub, tenant_id, pagination);
  }

  addMember(actor_sub: string, tenant_id: string, email: string, role: Exclude<TenantRoleSchema, 'owner'>) {
    return this.repository.addMember(actor_sub, tenant_id, email, role);
  }

  listAccessGroups(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.repository.listAccessGroups(actor_sub, tenant_id, pagination);
  }

  /** Backward compatibility alias */
  groups(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.listAccessGroups(actor_sub, tenant_id, pagination);
  }

  createAccessGroup(actor_sub: string, tenant_id: string, name: string) {
    return this.repository.createAccessGroup(actor_sub, tenant_id, name);
  }

  /** Backward compatibility alias */
  createGroup(actor_sub: string, tenant_id: string, name: string) {
    return this.createAccessGroup(actor_sub, tenant_id, name);
  }

  deleteAccessGroup(actor_sub: string, group_id: string) {
    return this.repository.deleteAccessGroup(actor_sub, group_id);
  }

  /** Backward compatibility alias */
  deleteGroup(actor_sub: string, group_id: string) {
    return this.deleteAccessGroup(actor_sub, group_id);
  }

  listGroupMembers(actor_sub: string, group_id: string, pagination?: PaginationWindow) {
    return this.repository.listGroupMembers(actor_sub, group_id, pagination);
  }

  /** Backward compatibility alias */
  groupMembers(actor_sub: string, group_id: string, pagination?: PaginationWindow) {
    return this.listGroupMembers(actor_sub, group_id, pagination);
  }

  addGroupMember(actor_sub: string, group_id: string, user_sub: string) {
    return this.repository.addGroupMember(actor_sub, group_id, user_sub);
  }

  removeGroupMember(actor_sub: string, group_id: string, user_sub: string) {
    return this.repository.removeGroupMember(actor_sub, group_id, user_sub);
  }

  listDocumentGroupGrants(actor_sub: string, document_id: string) {
    return this.repository.listDocumentGroupGrants(actor_sub, document_id);
  }

  /** Backward compatibility alias */
  groupGrants(actor_sub: string, document_id: string) {
    return this.listDocumentGroupGrants(actor_sub, document_id);
  }

  replaceDocumentGroupGrants(actor_sub: string, document_id: string, group_ids: string[]) {
    return this.repository.replaceDocumentGroupGrants(actor_sub, document_id, group_ids);
  }

  /** Backward compatibility alias */
  replaceGroupGrants(actor_sub: string, document_id: string, group_ids: string[]) {
    return this.replaceDocumentGroupGrants(actor_sub, document_id, group_ids);
  }

  listDlq(actor_sub: string, tenant_id: string, pagination?: PaginationWindow) {
    return this.repository.listDlq(actor_sub, tenant_id, pagination);
  }

  replayDlq(actor_sub: string, dlq_id: string, source: DlqSourceSchema) {
    return this.repository.replayDlq(actor_sub, dlq_id, source);
  }
}
