import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { GovernanceService } from '@/governance/application/services/governance.service';
import {
  deletedDocumentResponseDto,
  dlqReplayResponseDto,
  documentDetailResponseDto,
  documentGrantResponseDto,
  ingestionJobResponseDto,
  modifyRoleRequestDto,
  paginatedAuditEventsResponseDto,
  paginatedChunksResponseDto,
  paginatedDlqResponseDto,
  paginatedMembersResponseDto,
  paginatedVersionsResponseDto,
  removedResponseDto,
  replaceAccessRequestDto,
  replaceAccessResponseDto,
  replayDlqRequestDto,
  retryJobResponseDto,
  roleChangedResponseDto,
  tenantBudgetResponseDto,
  tenantScopedPaginationDto,
  updateBudgetRequestDto,
  usageSummaryItemResponseDto,
} from '@/governance/presentation/http/dto/governance.dto';
import {
  createdGroupResponseDto,
  createGroupRequestDto,
  groupGrantResponseDto,
  groupGrantsRequestDto,
  groupMemberRequestDto,
  groupMemberResponseDto,
  inviteMemberRequestDto,
  paginatedGroupMembersResponseDto,
  paginatedGroupsResponseDto,
  replaceGroupGrantsResponseDto,
} from '@/governance/presentation/http/dto/groups.dto';
import {
  ApiZodBody,
  ApiZodCreated,
  ApiZodOk,
  ApiZodQuery,
  ApiZodStandardErrors,
} from '~/openapi/zod-decorators';
import { type Actor, CurrentActor } from '~/security/actor';
import { JwtGuard } from '~/security/jwt.guard';
import { offsetPaginationQueryDto } from '~/shared/http/dto/offset-pagination-query.dto';
import { buildPaginatedPayload } from '~/shared/http/dto/paginator.dto';
import { ZodPipe } from '~/shared/validation.pipe';

@ApiTags('Governance')
@ApiBearerAuth()
@ApiZodStandardErrors()
@UseGuards(JwtGuard)
@Controller('api/v1')
export class GovernanceController {
  constructor(
    @Inject(GovernanceService)
    private readonly governanceService: GovernanceService,
  ) {}

  @Get('tenants/:id/members')
  @ApiOperation({
    operationId: 'listMembers',
    summary: 'List tenant members and roles',
    description: `- 📦 **Proceso:** Directorio de miembros y control de acceso RBAC.
- 🔧 **Funcionalidad:** Lista membresías del tenant con paginación determinista y roles asignados.`,
  })
  @ApiZodQuery(offsetPaginationQueryDto)
  @ApiZodOk(paginatedMembersResponseDto)
  async listMembers(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) tenantId: string,
    @Query(new ZodPipe(offsetPaginationQueryDto))
    query: z.output<typeof offsetPaginationQueryDto>,
  ) {
    const method = this.governanceService.listMembers ?? this.governanceService.members;
    const page = await method.call(this.governanceService, actor.sub, tenantId, query);
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit: query.limit,
      offset: query.offset,
      path: `/api/v1/tenants/${tenantId}/members`,
    });
  }

  @Post('tenants/:id/members')
  @ApiOperation({
    operationId: 'addMember',
    summary: 'Add an existing OIDC user to tenant by email',
    description: `- 📦 **Proceso:** Aprovisionamiento de identidades corporativas.
- 🔧 **Funcionalidad:** Vincula un usuario autenticado por Keycloak al tenant bajo rol especificado.`,
  })
  @ApiZodBody(inviteMemberRequestDto)
  @ApiZodCreated(roleChangedResponseDto)
  addMember(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) tenantId: string,
    @Body(new ZodPipe(inviteMemberRequestDto))
    dto: z.output<typeof inviteMemberRequestDto>,
  ) {
    return this.governanceService.addMember(actor.sub, tenantId, dto.email, dto.role);
  }

  @Patch('tenants/:id/members/:user')
  @ApiOperation({
    operationId: 'changeMemberRole',
    summary: 'Modify tenant member role (owner only)',
    description: `- 📦 **Proceso:** Elevación o revocación de privilegios RBAC.
- 🔧 **Funcionalidad:** Actualiza el rol de un miembro garantizando que exista al menos un owner activo.`,
  })
  @ApiZodBody(modifyRoleRequestDto)
  @ApiZodOk(roleChangedResponseDto)
  changeMemberRole(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) tenantId: string,
    @Param('user', new ZodPipe(groupMemberRequestDto.shape.user_sub)) userSub: string,
    @Body(new ZodPipe(modifyRoleRequestDto)) body: z.output<typeof modifyRoleRequestDto>,
  ) {
    const method = this.governanceService.changeMemberRole ?? this.governanceService.changeRole;
    return method.call(this.governanceService, actor.sub, tenantId, userSub, body.role);
  }

  @Delete('tenants/:id/members/:user')
  @ApiOperation({
    operationId: 'removeMember',
    summary: 'Remove member from tenant and revoke all their grants in the tenant',
    description: `- 📦 **Proceso:** Baja segura de usuario en tenant (Offboarding).
- 🔧 **Funcionalidad:** Expulsa al miembro del tenant y purga de inmediato sus membresías de grupo y ACLs de documentos.`,
  })
  @ApiZodOk(removedResponseDto)
  removeMember(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) tenantId: string,
    @Param('user', new ZodPipe(groupMemberRequestDto.shape.user_sub)) userSub: string,
  ) {
    return this.governanceService.removeMember(actor.sub, tenantId, userSub);
  }

  @Get('documents/:id')
  @ApiOperation({
    operationId: 'getDocumentDetail',
    summary: 'Get authorized document metadata',
    description: `- 📦 **Proceso:** Inspección documental Zero-Trust.
- 🔧 **Funcionalidad:** Obtiene metadatos de un documento validado bajo RLS y aislamiento multi-tenant.`,
  })
  @ApiZodOk(documentDetailResponseDto)
  getDocumentDetail(@CurrentActor() actor: Actor, @Param('id', new ZodPipe(z.uuid())) documentId: string) {
    const method = this.governanceService.getDocumentDetail ?? this.governanceService.document;
    return method.call(this.governanceService, actor.sub, documentId);
  }

  @Get('documents/:id/versions')
  @ApiOperation({
    operationId: 'listDocumentVersions',
    summary: 'List indexed document versions',
    description: `- 📦 **Proceso:** Versionamiento inmutable y trazabilidad SHA-256.
- 🔧 **Funcionalidad:** Lista versiones históricas asociadas a un documento registrado.`,
  })
  @ApiZodQuery(offsetPaginationQueryDto)
  @ApiZodOk(paginatedVersionsResponseDto)
  async listDocumentVersions(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) documentId: string,
    @Query(new ZodPipe(offsetPaginationQueryDto))
    query: z.output<typeof offsetPaginationQueryDto>,
  ) {
    const method = this.governanceService.listDocumentVersions ?? this.governanceService.versions;
    const page = await method.call(this.governanceService, actor.sub, documentId, query);
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit: query.limit,
      offset: query.offset,
      path: `/api/v1/documents/${documentId}/versions`,
    });
  }

  @Get('documents/:id/chunks')
  @ApiOperation({
    operationId: 'listDocumentChunks',
    summary: 'List authorized document chunks',
    description: `- 📦 **Proceso:** Auditoría de segmentación documental.
- 🔧 **Funcionalidad:** Lista los fragmentos indexados autorizados para el actor bajo RLS.`,
  })
  @ApiZodQuery(offsetPaginationQueryDto)
  @ApiZodOk(paginatedChunksResponseDto)
  async listDocumentChunks(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) documentId: string,
    @Query(new ZodPipe(offsetPaginationQueryDto))
    query: z.output<typeof offsetPaginationQueryDto>,
  ) {
    const method = this.governanceService.listDocumentChunks ?? this.governanceService.documentChunks;
    const page = await method.call(this.governanceService, actor.sub, documentId, query);
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit: query.limit,
      offset: query.offset,
      path: `/api/v1/documents/${documentId}/chunks`,
    });
  }

  @Get('documents/:id/access')
  @ApiOperation({
    operationId: 'listDocumentGrants',
    summary: 'List explicit user ACL grants on document',
    description: `- 📦 **Proceso:** Control de accesos discretos (ACLs directas).
- 🔧 **Funcionalidad:** Lista usuarios con permisos directos de lectura sobre un documento privado.`,
  })
  @ApiZodOk(z.array(documentGrantResponseDto))
  listDocumentGrants(@CurrentActor() actor: Actor, @Param('id', new ZodPipe(z.uuid())) documentId: string) {
    const method = this.governanceService.listDocumentGrants ?? this.governanceService.grants;
    return method.call(this.governanceService, actor.sub, documentId);
  }

  @Put('documents/:id/access')
  @ApiOperation({
    operationId: 'replaceDocumentGrants',
    summary: 'Replace explicit user ACL grants on document',
    description: `- 📦 **Proceso:** Actualización atómica de permisos individuales.
- 🔧 **Funcionalidad:** Sobrescribe la lista de usuarios autorizados para acceder al documento privado.`,
  })
  @ApiZodBody(replaceAccessRequestDto)
  @ApiZodOk(replaceAccessResponseDto)
  replaceDocumentGrants(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) documentId: string,
    @Body(new ZodPipe(replaceAccessRequestDto))
    dto: z.output<typeof replaceAccessRequestDto>,
  ) {
    const method = this.governanceService.replaceDocumentGrants ?? this.governanceService.replaceGrants;
    return method.call(this.governanceService, actor.sub, documentId, dto.user_subs);
  }

  @Delete('documents/:id')
  @ApiOperation({
    operationId: 'deleteDocument',
    summary: 'Soft-delete document, purge chunks immediately and schedule object erasure',
    description: `- 📦 **Proceso:** Destrucción segura y purga criptográfica documental.
- 🔧 **Funcionalidad:** Marca el documento como eliminado, borra fragmentos RAG y encola borrado de almacenamiento S3/RustFS.`,
  })
  @ApiZodOk(deletedDocumentResponseDto)
  deleteDocument(@CurrentActor() actor: Actor, @Param('id', new ZodPipe(z.uuid())) documentId: string) {
    return this.governanceService.deleteDocument(actor.sub, documentId);
  }

  @Get('documents/:id/ingestion')
  @ApiOperation({
    operationId: 'getIngestionJob',
    summary: 'Get latest ingestion job state for document',
    description: `- 📦 **Proceso:** Monitoreo del pipeline asíncrono de ingesta.
- 🔧 **Funcionalidad:** Retorna el estado actual, etapa de procesamiento y errores del job de ingesta.`,
  })
  @ApiZodOk(ingestionJobResponseDto)
  getIngestionJob(@CurrentActor() actor: Actor, @Param('id', new ZodPipe(z.uuid())) documentId: string) {
    const method = this.governanceService.getIngestionJob ?? this.governanceService.jobs;
    return method.call(this.governanceService, actor.sub, documentId);
  }

  @Post('documents/:id/ingestion/retry')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'retryIngestionJob',
    summary: 'Retry a failed ingestion job',
    description: `- 📦 **Proceso:** Recuperación de fallas en pipeline de ingesta.
- 🔧 **Funcionalidad:** Reinicia un job fallido reseteando contadores de reintento y emitiendo evento outbox.`,
  })
  @ApiZodOk(retryJobResponseDto)
  retryIngestionJob(@CurrentActor() actor: Actor, @Param('id', new ZodPipe(z.uuid())) documentId: string) {
    const method = this.governanceService.retryIngestionJob ?? this.governanceService.retryJob;
    return method.call(this.governanceService, actor.sub, documentId);
  }

  @Get('usage/summary')
  @ApiOperation({
    operationId: 'getUsageSummary',
    summary: 'Get 30-day FinOps usage & latency summary for tenant',
    description: `- 📦 **Proceso:** Telemetría FinOps y control de consumo LLM.
- 🔧 **Funcionalidad:** Agrupa tokens, latencias y costos monetarios de los últimos 30 días por categoría.`,
  })
  @ApiZodQuery(z.object({ tenant_id: z.uuid() }))
  @ApiZodOk(z.array(usageSummaryItemResponseDto))
  getUsageSummary(@CurrentActor() actor: Actor, @Query('tenant_id', new ZodPipe(z.uuid())) tenantId: string) {
    const method = this.governanceService.getUsageSummary ?? this.governanceService.usage;
    return method.call(this.governanceService, actor.sub, tenantId);
  }

  @Get('usage/budget')
  @ApiOperation({
    operationId: 'getTenantBudget',
    summary: 'Get daily answer & monetary FinOps budget for tenant',
    description: `- 📦 **Proceso:** Control presupuestario y cuotas diarias.
- 🔧 **Funcionalidad:** Consulta el límite diario de respuestas y presupuesto monetario asignado al tenant.`,
  })
  @ApiZodQuery(z.object({ tenant_id: z.uuid() }))
  @ApiZodOk(tenantBudgetResponseDto)
  getTenantBudget(@CurrentActor() actor: Actor, @Query('tenant_id', new ZodPipe(z.uuid())) tenantId: string) {
    const method = this.governanceService.getTenantBudget ?? this.governanceService.budget;
    return method.call(this.governanceService, actor.sub, tenantId);
  }

  @Put('usage/budget/:id')
  @ApiOperation({
    operationId: 'updateTenantBudget',
    summary: 'Update daily answer & monetary FinOps budget for tenant',
    description: `- 📦 **Proceso:** Gobernanza de límites de gasto FinOps.
- 🔧 **Funcionalidad:** Actualiza las cuotas máximas de respuestas y costo diario en dólares de un tenant.`,
  })
  @ApiZodBody(updateBudgetRequestDto)
  @ApiZodOk(tenantBudgetResponseDto)
  updateTenantBudget(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) budgetId: string,
    @Body(new ZodPipe(updateBudgetRequestDto))
    dto: z.output<typeof updateBudgetRequestDto>,
  ) {
    const method = this.governanceService.updateTenantBudget ?? this.governanceService.updateBudget;
    return method.call(
      this.governanceService,
      actor.sub,
      budgetId,
      dto.daily_answer_limit,
      dto.daily_cost_limit_usd,
    );
  }

  @Get('audit/events')
  @ApiOperation({
    operationId: 'listAuditEvents',
    summary: 'List immutable security & governance audit trail for tenant',
    description: `- 📦 **Proceso:** Trazabilidad forense y auditoría inmutable.
- 🔧 **Funcionalidad:** Lista cronológicamente las acciones de seguridad, cambios de roles y accesos en el tenant.`,
  })
  @ApiZodQuery(tenantScopedPaginationDto)
  @ApiZodOk(paginatedAuditEventsResponseDto)
  async listAuditEvents(@CurrentActor() actor: Actor, @Query() rawQuery: Record<string, unknown>) {
    const parsed = tenantScopedPaginationDto.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException('Invalid tenant UUID or pagination query');
    }
    const { tenant_id, limit, offset } = parsed.data;
    const method = this.governanceService.listAuditEvents ?? this.governanceService.audit;
    const page = await method.call(this.governanceService, actor.sub, tenant_id, {
      limit,
      offset,
    });
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit,
      offset,
      path: '/api/v1/audit/events',
      extraQuery: { tenant_id },
    });
  }

  @Get('tenants/:id/groups')
  @ApiOperation({
    operationId: 'listAccessGroups',
    summary: 'List access groups in tenant',
    description: `- 📦 **Proceso:** Gestión de grupos de seguridad y compartición grupal.
- 🔧 **Funcionalidad:** Lista los grupos de acceso configurados con el recuento de sus miembros.`,
  })
  @ApiZodQuery(offsetPaginationQueryDto)
  @ApiZodOk(paginatedGroupsResponseDto)
  async listAccessGroups(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) tenantId: string,
    @Query(new ZodPipe(offsetPaginationQueryDto))
    query: z.output<typeof offsetPaginationQueryDto>,
  ) {
    const method = this.governanceService.listAccessGroups ?? this.governanceService.groups;
    const page = await method.call(this.governanceService, actor.sub, tenantId, query);
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit: query.limit,
      offset: query.offset,
      path: `/api/v1/tenants/${tenantId}/groups`,
    });
  }

  @Post('groups')
  @ApiOperation({
    operationId: 'createAccessGroup',
    summary: 'Create a tenant access group',
    description: `- 📦 **Proceso:** Creación de grupos de acceso seguro.
- 🔧 **Funcionalidad:** Crea un nuevo grupo de acceso para concesión colectiva de permisos documentales.`,
  })
  @ApiZodBody(createGroupRequestDto)
  @ApiZodCreated(createdGroupResponseDto)
  createAccessGroup(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createGroupRequestDto))
    dto: z.output<typeof createGroupRequestDto>,
  ) {
    const method = this.governanceService.createAccessGroup ?? this.governanceService.createGroup;
    return method.call(this.governanceService, actor.sub, dto.tenant_id, dto.name);
  }

  @Delete('groups/:id')
  @ApiOperation({
    operationId: 'deleteAccessGroup',
    summary: 'Delete access group and revoke its document grants immediately',
    description: `- 📦 **Proceso:** Revocación de grupos de seguridad.
- 🔧 **Funcionalidad:** Elimina un grupo de acceso revocando en tiempo real las concesiones de documentos asociadas.`,
  })
  @ApiZodOk(removedResponseDto)
  deleteAccessGroup(@CurrentActor() actor: Actor, @Param('id', new ZodPipe(z.uuid())) groupId: string) {
    const method = this.governanceService.deleteAccessGroup ?? this.governanceService.deleteGroup;
    return method.call(this.governanceService, actor.sub, groupId);
  }

  @Get('groups/:id/members')
  @ApiOperation({
    operationId: 'listGroupMembers',
    summary: 'List members of an access group',
    description: `- 📦 **Proceso:** Auditoría de integrantes de grupo.
- 🔧 **Funcionalidad:** Lista los usuarios asignados a un grupo de acceso específico.`,
  })
  @ApiZodQuery(offsetPaginationQueryDto)
  @ApiZodOk(paginatedGroupMembersResponseDto)
  async listGroupMembers(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) groupId: string,
    @Query(new ZodPipe(offsetPaginationQueryDto))
    query: z.output<typeof offsetPaginationQueryDto>,
  ) {
    const method = this.governanceService.listGroupMembers ?? this.governanceService.groupMembers;
    const page = await method.call(this.governanceService, actor.sub, groupId, query);
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit: query.limit,
      offset: query.offset,
      path: `/api/v1/groups/${groupId}/members`,
    });
  }

  @Post('groups/:id/members')
  @ApiOperation({
    operationId: 'addGroupMember',
    summary: 'Add tenant member to access group',
    description: `- 📦 **Proceso:** Incorporación de usuarios a grupos de seguridad.
- 🔧 **Funcionalidad:** Asigna un miembro del tenant a un grupo de acceso otorgándole sus permisos asociados.`,
  })
  @ApiZodBody(groupMemberRequestDto)
  @ApiZodCreated(groupMemberResponseDto)
  addGroupMember(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) groupId: string,
    @Body(new ZodPipe(groupMemberRequestDto))
    dto: z.output<typeof groupMemberRequestDto>,
  ) {
    return this.governanceService.addGroupMember(actor.sub, groupId, dto.user_sub);
  }

  @Delete('groups/:id/members/:user')
  @ApiOperation({
    operationId: 'removeGroupMember',
    summary: 'Remove member from access group, revoking group-granted documents immediately',
    description: `- 📦 **Proceso:** Desvinculación de usuarios de grupos de seguridad.
- 🔧 **Funcionalidad:** Remueve a un miembro de un grupo de acceso revocando de inmediato su visibilidad sobre los documentos concedidos al grupo.`,
  })
  @ApiZodOk(removedResponseDto)
  removeGroupMember(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) groupId: string,
    @Param('user', new ZodPipe(groupMemberRequestDto.shape.user_sub)) userSub: string,
  ) {
    return this.governanceService.removeGroupMember(actor.sub, groupId, userSub);
  }

  @Get('documents/:id/group-access')
  @ApiOperation({
    operationId: 'listGroupGrants',
    summary: 'List group ACL grants on document',
    description: `- 📦 **Proceso:** Inspección de permisos colectivos.
- 🔧 **Funcionalidad:** Lista los identificadores de grupos autorizados para acceder a un documento privado.`,
  })
  @ApiZodOk(z.array(groupGrantResponseDto))
  listDocumentGroupGrants(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) documentId: string,
  ) {
    const method = this.governanceService.listDocumentGroupGrants ?? this.governanceService.groupGrants;
    return method.call(this.governanceService, actor.sub, documentId);
  }

  @Put('documents/:id/group-access')
  @ApiOperation({
    operationId: 'replaceGroupGrants',
    summary: 'Replace group ACL grants on document',
    description: `- 📦 **Proceso:** Actualización atómica de permisos grupales.
- 🔧 **Funcionalidad:** Reemplaza la lista completa de grupos de acceso con permisos concedidos al documento.`,
  })
  @ApiZodBody(groupGrantsRequestDto)
  @ApiZodOk(replaceGroupGrantsResponseDto)
  replaceDocumentGroupGrants(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) documentId: string,
    @Body(new ZodPipe(groupGrantsRequestDto))
    dto: z.output<typeof groupGrantsRequestDto>,
  ) {
    const method =
      this.governanceService.replaceDocumentGroupGrants ?? this.governanceService.replaceGroupGrants;
    return method.call(this.governanceService, actor.sub, documentId, dto.group_ids);
  }

  @Get('operations/dlq')
  @ApiOperation({
    operationId: 'listDlq',
    summary: 'List dead-lettered ingestion jobs and outbox events for tenant',
    description: `- 📦 **Proceso:** SRE y observabilidad de fallas operativas (Dead Letter Queue).
- 🔧 **Funcionalidad:** Lista jobs de ingesta fallidos y eventos outbox agotados pendientes de intervención.`,
  })
  @ApiZodQuery(tenantScopedPaginationDto)
  @ApiZodOk(paginatedDlqResponseDto)
  async listDlq(@CurrentActor() actor: Actor, @Query() rawQuery: Record<string, unknown>) {
    const parsed = tenantScopedPaginationDto.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException('Invalid tenant UUID or pagination query');
    }
    const { tenant_id, limit, offset } = parsed.data;
    const page = await this.governanceService.listDlq(actor.sub, tenant_id, {
      limit,
      offset,
    });
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit,
      offset,
      path: '/api/v1/operations/dlq',
      extraQuery: { tenant_id },
    });
  }

  @Post('operations/dlq/:id/replay')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'replayDlq',
    summary: 'Replay a failed DLQ ingestion job or outbox event',
    description: `- 📦 **Proceso:** Recuperación operativa y reencolamiento DLQ.
- 🔧 **Funcionalidad:** Reinicia un job o retransmite un evento outbox fallido para su reprocesamiento inmediato.`,
  })
  @ApiZodBody(replayDlqRequestDto)
  @ApiZodOk(dlqReplayResponseDto)
  replayDlq(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) dlqId: string,
    @Body(new ZodPipe(replayDlqRequestDto))
    dto: z.output<typeof replayDlqRequestDto>,
  ) {
    return this.governanceService.replayDlq(actor.sub, dlqId, dto.source);
  }

  // --- Backward compatibility aliases ---
  members(actor: Actor, tenantId: string, query: z.output<typeof offsetPaginationQueryDto>) {
    return this.listMembers(actor, tenantId, query);
  }
  change(actor: Actor, tenantId: string, userSub: string, body: z.output<typeof modifyRoleRequestDto>) {
    return this.changeMemberRole(actor, tenantId, userSub, body);
  }
  document(actor: Actor, documentId: string) {
    return this.getDocumentDetail(actor, documentId);
  }
  versions(actor: Actor, documentId: string, query: z.output<typeof offsetPaginationQueryDto>) {
    return this.listDocumentVersions(actor, documentId, query);
  }
  chunks(actor: Actor, documentId: string, query: z.output<typeof offsetPaginationQueryDto>) {
    return this.listDocumentChunks(actor, documentId, query);
  }
  access(actor: Actor, documentId: string) {
    return this.listDocumentGrants(actor, documentId);
  }
  accessReplace(actor: Actor, documentId: string, dto: z.output<typeof replaceAccessRequestDto>) {
    return this.replaceDocumentGrants(actor, documentId, dto);
  }
  deleteDoc(actor: Actor, documentId: string) {
    return this.deleteDocument(actor, documentId);
  }
  jobs(actor: Actor, documentId: string) {
    return this.getIngestionJob(actor, documentId);
  }
  retry(actor: Actor, documentId: string) {
    return this.retryIngestionJob(actor, documentId);
  }
  usage(actor: Actor, tenantId: string) {
    return this.getUsageSummary(actor, tenantId);
  }
  budget(actor: Actor, tenantId: string) {
    return this.getTenantBudget(actor, tenantId);
  }
  budgetUpdate(actor: Actor, budgetId: string, dto: z.output<typeof updateBudgetRequestDto>) {
    return this.updateTenantBudget(actor, budgetId, dto);
  }
  audit(actor: Actor, rawQuery: Record<string, unknown>) {
    return this.listAuditEvents(actor, rawQuery);
  }
  groups(actor: Actor, tenantId: string, query: z.output<typeof offsetPaginationQueryDto>) {
    return this.listAccessGroups(actor, tenantId, query);
  }
  createGroup(actor: Actor, dto: z.output<typeof createGroupRequestDto>) {
    return this.createAccessGroup(actor, dto);
  }
  deleteGroup(actor: Actor, groupId: string) {
    return this.deleteAccessGroup(actor, groupId);
  }
  groupMembers(actor: Actor, groupId: string, query: z.output<typeof offsetPaginationQueryDto>) {
    return this.listGroupMembers(actor, groupId, query);
  }
  groupGrants(actor: Actor, documentId: string) {
    return this.listDocumentGroupGrants(actor, documentId);
  }
  replaceGroupGrants(actor: Actor, documentId: string, dto: z.output<typeof groupGrantsRequestDto>) {
    return this.replaceDocumentGroupGrants(actor, documentId, dto);
  }
}
