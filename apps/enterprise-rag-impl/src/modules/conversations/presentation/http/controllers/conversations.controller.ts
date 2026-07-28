import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { z } from 'zod';
import { ConversationsService } from '@/conversations/application/services/conversations.service';
import {
  conversationDetailResponseDto,
  conversationSummaryResponseDto,
  conversationTurnResponseDto,
  createConversationRequestDto,
  deletedConversationResponseDto,
  listConversationsQueryDto,
  paginatedConversationsResponseDto,
  resolvedCitationResponseDto,
  sendConversationMessageRequestDto,
} from '@/conversations/presentation/http/dto/conversations.dto';
import {
  ApiZodBody,
  ApiZodCreated,
  ApiZodOk,
  ApiZodQuery,
  ApiZodStandardErrors,
} from '~/openapi/zod-decorators';
import { type Actor, CurrentActor } from '~/security/actor';
import { JwtGuard } from '~/security/jwt.guard';
import { buildPaginatedPayload } from '~/shared/http/dto/paginator.dto';
import { ZodPipe } from '~/shared/validation.pipe';

@ApiTags('Conversations')
@ApiBearerAuth()
@ApiZodStandardErrors()
@UseGuards(JwtGuard)
@Controller('api/v1/conversations')
export class ConversationsController {
  constructor(
    @Inject(ConversationsService)
    private readonly conversationsService: ConversationsService,
  ) {}

  @Get()
  @ApiOperation({
    operationId: 'listConversations',
    summary: 'List caller conversations with pagination',
    description: `📦 Proceso: Conversaciones y sesiones de chat multi-turno
🔧 Funcionalidad: Devuelve lista paginada de hilos conversacionales accesibles por el actor autenticado, filtrados opcionalmente por base de conocimiento.`,
  })
  @ApiZodQuery(listConversationsQueryDto)
  @ApiZodOk(paginatedConversationsResponseDto)
  async listConversations(@CurrentActor() actor: Actor, @Query() rawQuery: Record<string, unknown>) {
    const parsed = listConversationsQueryDto.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException('Invalid conversation query parameters');
    }
    const { knowledge_base_id, limit, offset } = parsed.data;
    const method = this.conversationsService.listConversations ?? this.conversationsService.list;
    const page = await method.call(this.conversationsService, actor.sub, knowledge_base_id, {
      limit,
      offset,
    });
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit,
      offset,
      path: '/api/v1/conversations',
      extraQuery: { knowledge_base_id },
    });
  }

  @Post()
  @ApiOperation({
    operationId: 'createConversation',
    summary: 'Create a new conversation bound to a knowledge base',
    description: `📦 Proceso: Creación y vinculación de sesiones conversacionales
🔧 Funcionalidad: Registra un nuevo hilo conversacional con scoping estricto al tenant y base de conocimiento indicada.`,
  })
  @ApiZodBody(createConversationRequestDto)
  @ApiZodCreated(conversationSummaryResponseDto)
  createConversation(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createConversationRequestDto))
    dto: z.output<typeof createConversationRequestDto>,
  ) {
    const method = this.conversationsService.createConversation ?? this.conversationsService.create;
    return method.call(this.conversationsService, actor.sub, dto.knowledge_base_id, dto.title);
  }

  @Get(':id')
  @ApiOperation({
    operationId: 'getConversation',
    summary: 'Retrieve conversation messages with live ACL revocation redaction',
    description: `📦 Proceso: Historial y auditoría de turnos conversacionales
🔧 Funcionalidad: Recupera el historial completo de mensajes y turnos redactando evidencias de documentos cuyo permiso haya sido revocado en tiempo real.`,
  })
  @ApiZodOk(conversationDetailResponseDto)
  getConversation(@CurrentActor() actor: Actor, @Param('id', new ZodPipe(z.uuid())) conversationId: string) {
    const method = this.conversationsService.getConversation ?? this.conversationsService.get;
    return method.call(this.conversationsService, actor.sub, conversationId);
  }

  @Delete(':id')
  @ApiOperation({
    operationId: 'deleteConversation',
    summary: 'Soft-delete a conversation owned by the caller',
    description: `📦 Proceso: Gestión de ciclo de vida conversacional
🔧 Funcionalidad: Marca como archivada/borrada la conversación verificando titularidad del usuario llamante.`,
  })
  @ApiZodOk(deletedConversationResponseDto)
  deleteConversation(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) conversationId: string,
  ) {
    const method = this.conversationsService.deleteConversation ?? this.conversationsService.delete;
    return method.call(this.conversationsService, actor.sub, conversationId);
  }

  @Post(':id/messages')
  @ApiOperation({
    operationId: 'askConversationMessage',
    summary: 'Send a question inside a conversation and persist reauthorized citations',
    description: `📦 Proceso: Inferencia RAG síncrona en hilo conversacional
🔧 Funcionalidad: Ejecuta pipeline RAG con historial conversacional contextual, validando cuota finops y guardando turnos con citaciones verificadas.`,
  })
  @ApiZodBody(sendConversationMessageRequestDto)
  @ApiZodCreated(conversationTurnResponseDto)
  askConversationQuestion(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) conversationId: string,
    @Body(new ZodPipe(sendConversationMessageRequestDto))
    dto: z.output<typeof sendConversationMessageRequestDto>,
  ) {
    const method = this.conversationsService.askConversationQuestion ?? this.conversationsService.ask;
    return method.call(this.conversationsService, actor.sub, conversationId, dto.question);
  }

  @Post(':id/messages/stream')
  @HttpCode(200)
  @ApiOperation({
    operationId: 'streamConversationTurn',
    summary: 'Stream SSE lifecycle stages and persisted conversational turn',
    description: `📦 Proceso: Streaming reactivo SSE para conversación asistida
🔧 Funcionalidad: Emite eventos de ciclo de vida (authorized, retrieval, generation, authorization) y entrega el turno final persistido garantizando zero-leakage.`,
  })
  @ApiProduces('text/event-stream')
  @ApiZodBody(sendConversationMessageRequestDto)
  @ApiOkResponse({
    description:
      'SSE stream emitting status (`authorized`, `retrieval`, `generation`, `authorization`) and `complete`',
    content: {
      'text/event-stream': {
        schema: { type: 'string' },
      },
    },
  })
  async streamConversationQuestion(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) conversationId: string,
    @Body(new ZodPipe(sendConversationMessageRequestDto))
    dto: z.output<typeof sendConversationMessageRequestDto>,
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
      const method = this.conversationsService.askConversationQuestion ?? this.conversationsService.ask;
      const turn = await method.call(this.conversationsService, actor.sub, conversationId, dto.question, {
        signal: controller.signal,
        onPhase: (phase: string) => emit('status', { phase }),
      });
      if (!controller.signal.aborted) {
        emit('complete', turn);
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
          code: status === 429 ? 'BUDGET_EXHAUSTED' : status === 404 ? 'NOT_FOUND' : 'ANSWER_UNAVAILABLE',
        });
      }
    } finally {
      if (!res.destroyed) {
        res.end();
      }
    }
  }

  @Get(':id/citations/:citationId')
  @ApiOperation({
    operationId: 'resolveConversationCitation',
    summary: 'Resolve citation excerpt if document version and ACL remain valid',
    description: `📦 Proceso: Verificación y consulta puntual de evidencias citadas
🔧 Funcionalidad: Inspecciona la fuente y fragmento exacto de una citación revalidando versión activa del documento y permisos vigentes del actor.`,
  })
  @ApiZodOk(resolvedCitationResponseDto)
  resolveConversationCitation(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) conversationId: string,
    @Param('citationId', new ZodPipe(z.uuid())) citationId: string,
  ) {
    const method =
      this.conversationsService.resolveConversationCitation ?? this.conversationsService.resolveCitation;
    return method.call(this.conversationsService, actor.sub, conversationId, citationId);
  }

  // --- Backward compatibility aliases ---
  list(actor: Actor, rawQuery: Record<string, unknown>) {
    return this.listConversations(actor, rawQuery);
  }
  create(actor: Actor, dto: z.output<typeof createConversationRequestDto>) {
    return this.createConversation(actor, dto);
  }
  get(actor: Actor, conversationId: string) {
    return this.getConversation(actor, conversationId);
  }
  remove(actor: Actor, conversationId: string) {
    return this.deleteConversation(actor, conversationId);
  }
  ask(actor: Actor, conversationId: string, dto: z.output<typeof sendConversationMessageRequestDto>) {
    return this.askConversationQuestion(actor, conversationId, dto);
  }
  streamAsk(
    actor: Actor,
    conversationId: string,
    dto: z.output<typeof sendConversationMessageRequestDto>,
    res: Response,
  ) {
    return this.streamConversationQuestion(actor, conversationId, dto, res);
  }
  resolve(actor: Actor, conversationId: string, citationId: string) {
    return this.resolveConversationCitation(actor, conversationId, citationId);
  }
}
