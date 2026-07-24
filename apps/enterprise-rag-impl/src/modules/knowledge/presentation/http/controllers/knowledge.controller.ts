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
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { AnswerService } from '@/knowledge/application/services/answer.service';
import { KnowledgeService } from '@/knowledge/application/services/knowledge.service';
import { RetrievalService } from '@/knowledge/application/services/retrieval.service';
import {
  answerResponseDto,
  askQuestionRequestDto,
  createKnowledgeBaseRequestDto,
  createTenantRequestDto,
  createTextDocumentRequestDto,
  deletedKnowledgeBaseResponseDto,
  documentStatusResponseDto,
  knowledgeBaseResponseDto,
  listKnowledgeBasesQueryDto,
  meResponseDto,
  paginatedDocumentsResponseDto,
  paginatedKnowledgeBasesResponseDto,
  paginatedTenantsResponseDto,
  searchHitResponseDto,
  searchKnowledgeRequestDto,
  tenantResponseDto,
  updateKnowledgeBaseRequestDto,
  uuidParamDto,
} from '@/knowledge/presentation/http/dto/knowledge.dto';
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

@ApiTags('Enterprise RAG')
@ApiBearerAuth()
@ApiZodStandardErrors()
@UseGuards(JwtGuard)
@Controller('api/v1')
export class KnowledgeController {
  constructor(
    @Inject(KnowledgeService) private readonly knowledgeService: KnowledgeService,
    @Inject(RetrievalService) private readonly retrievalService: RetrievalService,
    @Inject(AnswerService) private readonly answerService: AnswerService,
  ) {}

  @Get('me')
  @ApiOperation({
    operationId: 'getActorProfile',
    summary: 'Return authenticated OIDC actor profile',
    description: `📦 Proceso: Identidad y sesión OIDC
🔧 Funcionalidad: Inspecciona el token RS256 de Keycloak y devuelve los claims normalizados del actor, tenants y roles.`,
  })
  @ApiZodOk(meResponseDto)
  getActorProfile(@CurrentActor() actor: Actor) {
    const method = this.knowledgeService.getActorProfile ?? this.knowledgeService.me;
    return method.call(this.knowledgeService, actor);
  }

  @Get('tenants')
  @ApiOperation({
    operationId: 'listTenants',
    summary: 'List tenants accessible by authenticated actor',
    description: `📦 Proceso: Multi-tenancy y control de organizaciones
🔧 Funcionalidad: Retorna el conjunto de tenants donde el usuario mantiene membresía activa conforme a las políticas PostgreSQL RLS.`,
  })
  @ApiZodQuery(offsetPaginationQueryDto)
  @ApiZodOk(paginatedTenantsResponseDto)
  async listTenants(
    @CurrentActor() actor: Actor,
    @Query(new ZodPipe(offsetPaginationQueryDto))
    query: z.output<typeof offsetPaginationQueryDto>,
  ) {
    const method = this.knowledgeService.listTenants ?? this.knowledgeService.tenants;
    const page = await method.call(this.knowledgeService, actor.sub, query);
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit: query.limit,
      offset: query.offset,
      path: '/api/v1/tenants',
    });
  }

  @Post('tenants')
  @ApiOperation({
    operationId: 'createTenant',
    summary: 'Provision a new isolated tenant with caller as owner',
    description: `📦 Proceso: Aprovisionamiento de inquilinos
🔧 Funcionalidad: Crea un nuevo espacio aislado asignando automáticamente la membresía de propietario al actor creador.`,
  })
  @ApiZodBody(createTenantRequestDto)
  @ApiZodCreated(tenantResponseDto)
  createTenant(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createTenantRequestDto))
    dto: z.output<typeof createTenantRequestDto>,
  ) {
    return this.knowledgeService.createTenant(actor.sub, dto.name);
  }

  @Get('knowledge-bases')
  @ApiOperation({
    operationId: 'listKnowledgeBases',
    summary: 'List knowledge bases for a tenant',
    description: `📦 Proceso: Gestión de repositorios documentales
🔧 Funcionalidad: Enumera los repositorios documentales asignados a un tenant verificando membresía obligatoria del actor.`,
  })
  @ApiZodQuery(listKnowledgeBasesQueryDto)
  @ApiZodOk(paginatedKnowledgeBasesResponseDto)
  async listKnowledgeBases(@CurrentActor() actor: Actor, @Query() rawQuery: Record<string, unknown>) {
    const parsed = listKnowledgeBasesQueryDto.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException('Invalid tenant UUID or pagination query');
    }
    const { tenant_id, limit, offset } = parsed.data;
    const method = this.knowledgeService.listKnowledgeBases ?? this.knowledgeService.knowledgeBases;
    const page = await method.call(this.knowledgeService, actor.sub, tenant_id, {
      limit,
      offset,
    });
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit,
      offset,
      path: '/api/v1/knowledge-bases',
      extraQuery: { tenant_id },
    });
  }

  @Post('knowledge-bases')
  @ApiOperation({
    operationId: 'createKnowledgeBase',
    summary: 'Create a knowledge base within a tenant',
    description: `📦 Proceso: Creación de base documental
🔧 Funcionalidad: Instancia un nuevo catálogo documental dentro del tenant autorizado vinculando al propietario.`,
  })
  @ApiZodBody(createKnowledgeBaseRequestDto)
  @ApiZodCreated(knowledgeBaseResponseDto)
  createKnowledgeBase(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createKnowledgeBaseRequestDto))
    dto: z.output<typeof createKnowledgeBaseRequestDto>,
  ) {
    return this.knowledgeService.createKnowledgeBase(actor.sub, dto.tenant_id, dto.name);
  }

  @Patch('knowledge-bases/:id')
  @ApiOperation({
    operationId: 'updateKnowledgeBase',
    summary: 'Rename a knowledge base (owner/admin only)',
    description: `📦 Proceso: Modificación de metadatos de repositorio
🔧 Funcionalidad: Actualiza la denominación de la base de conocimiento exigiendo rol de administrador o propietario.`,
  })
  @ApiZodBody(updateKnowledgeBaseRequestDto)
  @ApiZodOk(knowledgeBaseResponseDto)
  updateKnowledgeBase(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(uuidParamDto.shape.id)) knowledgeBaseId: string,
    @Body(new ZodPipe(updateKnowledgeBaseRequestDto))
    dto: z.output<typeof updateKnowledgeBaseRequestDto>,
  ) {
    return this.knowledgeService.updateKnowledgeBase(actor.sub, knowledgeBaseId, dto.name);
  }

  @Delete('knowledge-bases/:id')
  @ApiOperation({
    operationId: 'deleteKnowledgeBase',
    summary: 'Delete a knowledge base and schedule erasure of its objects (owner/admin only)',
    description: `📦 Proceso: Eliminación y purga de repositorio
🔧 Funcionalidad: Marca el catálogo como eliminado y programa la purga de embeddings, chunks y archivos asociados.`,
  })
  @ApiZodOk(deletedKnowledgeBaseResponseDto)
  deleteKnowledgeBase(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(uuidParamDto.shape.id)) knowledgeBaseId: string,
  ) {
    return this.knowledgeService.deleteKnowledgeBase(actor.sub, knowledgeBaseId);
  }

  @Get('knowledge-bases/:id/documents')
  @ApiOperation({
    operationId: 'listDocuments',
    summary: 'List authorized documents in a knowledge base',
    description: `📦 Proceso: Exploración documental con ACL estricto
🔧 Funcionalidad: Lista los documentos y versiones activas a los que el actor tiene permiso directo, grupal o de tenant.`,
  })
  @ApiZodQuery(offsetPaginationQueryDto)
  @ApiZodOk(paginatedDocumentsResponseDto)
  async listDocuments(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(uuidParamDto.shape.id)) knowledgeBaseId: string,
    @Query(new ZodPipe(offsetPaginationQueryDto))
    query: z.output<typeof offsetPaginationQueryDto>,
  ) {
    const method = this.knowledgeService.listDocuments ?? this.knowledgeService.documents;
    const page = await method.call(this.knowledgeService, actor.sub, knowledgeBaseId, query);
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit: query.limit,
      offset: query.offset,
      path: `/api/v1/knowledge-bases/${knowledgeBaseId}/documents`,
    });
  }

  @Post('knowledge-bases/:id/documents')
  @ApiOperation({
    operationId: 'createTextDocument',
    summary: 'Create a text document and queue async ingestion',
    description: `📦 Proceso: Ingesta de texto plano y orquestación
🔧 Funcionalidad: Persiste el documento de texto, genera el outbox job y activa el pipeline asíncrono de chunking y vectorización.`,
  })
  @ApiZodBody(createTextDocumentRequestDto)
  @ApiZodCreated(documentStatusResponseDto)
  createTextDocument(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(uuidParamDto.shape.id)) knowledgeBaseId: string,
    @Body(new ZodPipe(createTextDocumentRequestDto))
    dto: z.output<typeof createTextDocumentRequestDto>,
  ) {
    const method = this.knowledgeService.createTextDocument ?? this.knowledgeService.createDocument;
    return method.call(
      this.knowledgeService,
      actor.sub,
      knowledgeBaseId,
      dto.title,
      dto.text,
      dto.visibility,
    );
  }

  @Post('retrieval/search')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'searchKnowledge',
    summary: 'Hybrid FTS + vector + optional reranker authorized chunk retrieval',
    description: `📦 Proceso: Recuperación híbrida de conocimiento
🔧 Funcionalidad: Ejecuta búsqueda vectorial densa con pgvector combinada con FTS y re-clasificación cross-encoder con filtro RLS.`,
  })
  @ApiZodBody(searchKnowledgeRequestDto)
  @ApiZodOk(z.array(searchHitResponseDto))
  searchKnowledge(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(searchKnowledgeRequestDto))
    dto: z.output<typeof searchKnowledgeRequestDto>,
  ) {
    return this.retrievalService.search(actor.sub, dto.knowledge_base_id, dto.query);
  }

  @Post('answers')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'askAnswer',
    summary: 'Generate grounded answer with post-generation ACL reauthorization',
    description: `📦 Proceso: Síntesis de respuestas fundadas y seguras
🔧 Funcionalidad: Orquesta recuperación, contexto de LLM local Ollama y re-validación estricta de evidencias previniendo fugas.`,
  })
  @ApiZodBody(askQuestionRequestDto)
  @ApiZodOk(answerResponseDto)
  askQuestion(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(askQuestionRequestDto)) dto: z.output<typeof askQuestionRequestDto>,
  ) {
    const method = this.answerService.askQuestion ?? this.answerService.answer;
    return method.call(this.answerService, actor.sub, dto.knowledge_base_id, dto.question);
  }

  @Post('answers/stream')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'streamAnswer',
    summary: 'Stream SSE lifecycle stages and grounded answer after ACL reauthorization',
    description: `📦 Proceso: Streaming reactivo SSE para inferencia RAG
🔧 Funcionalidad: Transmite fases de inferencia y respuesta final validada protegiendo cuota finops y aislamiento tenant.`,
  })
  @ApiProduces('text/event-stream')
  @ApiZodBody(askQuestionRequestDto)
  @ApiOkResponse({
    description:
      'SSE stream emitting status (`authorized`, `retrieval`, `generation`, `authorization`) and `complete`',
    content: {
      'text/event-stream': {
        schema: { type: 'string' },
      },
    },
  })
  async streamQuestionAnswer(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(askQuestionRequestDto)) dto: z.output<typeof askQuestionRequestDto>,
    @Res() res: Response,
  ) {
    const controller = new AbortController();
    res.on('close', () => controller.abort());
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const emit = (event: string, data: unknown) => {
      if (!res.destroyed) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };
    try {
      const response = await this.answerService.answerWithEvidence(
        actor.sub,
        dto.knowledge_base_id,
        dto.question,
        {
          signal: controller.signal,
          onPhase: (phase: string) => emit('status', { phase }),
        },
      );
      if (!controller.signal.aborted) {
        emit('complete', response.result);
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        const status =
          typeof error === 'object' &&
          error !== null &&
          'getStatus' in error &&
          typeof error.getStatus === 'function'
            ? error.getStatus()
            : 503;
        emit('error', {
          code:
            status === 429
              ? 'BUDGET_EXHAUSTED'
              : status === 404
                ? 'NOT_FOUND'
                : status === 403
                  ? 'FORBIDDEN'
                  : 'ANSWER_UNAVAILABLE',
        });
      }
    } finally {
      if (!res.destroyed) {
        res.end();
      }
    }
  }

  // --- Backward compatibility aliases ---
  me(actor: Actor) {
    return this.getActorProfile(actor);
  }
  tenants(actor: Actor, query: z.output<typeof offsetPaginationQueryDto>) {
    return this.listTenants(actor, query);
  }
  knowledgeBases(actor: Actor, rawQuery: Record<string, unknown>) {
    return this.listKnowledgeBases(actor, rawQuery);
  }
  documents(actor: Actor, knowledgeBaseId: string, query: z.output<typeof offsetPaginationQueryDto>) {
    return this.listDocuments(actor, knowledgeBaseId, query);
  }
  createDocument(actor: Actor, knowledgeBaseId: string, dto: z.output<typeof createTextDocumentRequestDto>) {
    return this.createTextDocument(actor, knowledgeBaseId, dto);
  }
  search(actor: Actor, dto: z.output<typeof searchKnowledgeRequestDto>) {
    return this.searchKnowledge(actor, dto);
  }
  answer(actor: Actor, dto: z.output<typeof askQuestionRequestDto>) {
    return this.askQuestion(actor, dto);
  }
  streamAnswer(actor: Actor, dto: z.output<typeof askQuestionRequestDto>, res: Response) {
    return this.streamQuestionAnswer(actor, dto, res);
  }
}
