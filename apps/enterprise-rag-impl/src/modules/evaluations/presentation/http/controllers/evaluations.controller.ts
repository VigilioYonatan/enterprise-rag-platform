import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { EvaluationsService } from '@/evaluations/application/services/evaluations.service';
import {
  caseResponseDto,
  createCaseRequestDto,
  createDatasetRequestDto,
  datasetResponseDto,
  deletedEvaluationResponseDto,
  listEvaluationsQueryDto,
  paginatedCasesResponseDto,
  paginatedDatasetsResponseDto,
  paginatedRunsResponseDto,
  runDetailResponseDto,
  runSummaryResponseDto,
  startRunRequestDto,
} from '@/evaluations/presentation/http/dto/evaluations.dto';
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

@ApiTags('LLMOps Evaluations')
@ApiBearerAuth()
@ApiZodStandardErrors()
@UseGuards(JwtGuard)
@Controller('api/v1/evaluation')
export class EvaluationsController {
  constructor(
    @Inject(EvaluationsService)
    private readonly evaluationsService: EvaluationsService,
  ) {}

  @Get('datasets')
  @ApiOperation({
    operationId: 'listDatasets',
    summary: 'List evaluation datasets for tenant',
    description: `- 📦 **Proceso:** Gestión de datasets de evaluación y ground-truth.
- 🔧 **Funcionalidad:** Lista datasets vinculados a bases de conocimiento con paginación determinista.`,
  })
  @ApiZodQuery(listEvaluationsQueryDto)
  @ApiZodOk(paginatedDatasetsResponseDto)
  async listDatasets(@CurrentActor() actor: Actor, @Query() rawQuery: Record<string, unknown>) {
    const parsed = listEvaluationsQueryDto.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException('Invalid tenant UUID or pagination query');
    }
    const { tenant_id, limit, offset } = parsed.data;
    const method = this.evaluationsService.listDatasets ?? this.evaluationsService.datasets;
    const page = await method.call(this.evaluationsService, actor.sub, tenant_id, {
      limit,
      offset,
    });
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit,
      offset,
      path: '/api/v1/evaluation/datasets',
      extraQuery: { tenant_id },
    });
  }

  @Post('datasets')
  @ApiOperation({
    operationId: 'createDataset',
    summary: 'Create an evaluation dataset bound to a knowledge base',
    description: `- 📦 **Proceso:** Aprovisionamiento de ground-truth en tenant.
- 🔧 **Funcionalidad:** Crea un dataset inmutable de evaluación vinculado a una base de conocimiento autorizada.`,
  })
  @ApiZodBody(createDatasetRequestDto)
  @ApiZodCreated(datasetResponseDto)
  createDataset(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(createDatasetRequestDto))
    dto: z.output<typeof createDatasetRequestDto>,
  ) {
    const method = this.evaluationsService.createDataset ?? this.evaluationsService.createDataset;
    return method.call(this.evaluationsService, actor.sub, dto.tenant_id, dto.knowledge_base_id, dto.name);
  }

  @Delete('datasets/:id')
  @ApiOperation({
    operationId: 'deleteDataset',
    summary: 'Delete an evaluation dataset and its cases/runs (manager only)',
    description: `- 📦 **Proceso:** Gobernanza y ciclo de vida de datasets.
- 🔧 **Funcionalidad:** Elimina un dataset de evaluación y en cascada sus casos y corridas históricas.`,
  })
  @ApiZodOk(deletedEvaluationResponseDto)
  deleteDataset(@CurrentActor() actor: Actor, @Param('id', new ZodPipe(z.uuid())) datasetId: string) {
    return this.evaluationsService.deleteDataset(actor.sub, datasetId);
  }

  @Get('datasets/:id/cases')
  @ApiOperation({
    operationId: 'listDatasetCases',
    summary: 'List ground-truth evaluation cases in dataset',
    description: `- 📦 **Proceso:** Inspección de casos de prueba de evaluación.
- 🔧 **Funcionalidad:** Lista preguntas y respuestas esperadas de un dataset bajo control de acceso.`,
  })
  @ApiZodQuery(offsetPaginationQueryDto)
  @ApiZodOk(paginatedCasesResponseDto)
  async listDatasetCases(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) datasetId: string,
    @Query(new ZodPipe(offsetPaginationQueryDto))
    query: z.output<typeof offsetPaginationQueryDto>,
  ) {
    const method = this.evaluationsService.listDatasetCases ?? this.evaluationsService.cases;
    const page = await method.call(this.evaluationsService, actor.sub, datasetId, query);
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit: query.limit,
      offset: query.offset,
      path: `/api/v1/evaluation/datasets/${datasetId}/cases`,
    });
  }

  @Post('datasets/:id/cases')
  @ApiOperation({
    operationId: 'addDatasetCase',
    summary: 'Add a positive or abstention ground-truth case to dataset',
    description: `- 📦 **Proceso:** Curaduría de casos de prueba LLMOps.
- 🔧 **Funcionalidad:** Registra una pregunta ground-truth con documentos esperados o bandera de abstención.`,
  })
  @ApiZodBody(createCaseRequestDto)
  @ApiZodCreated(caseResponseDto)
  addDatasetCase(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) datasetId: string,
    @Body(new ZodPipe(createCaseRequestDto))
    dto: z.output<typeof createCaseRequestDto>,
  ) {
    const method = this.evaluationsService.addDatasetCase ?? this.evaluationsService.addCase;
    return method.call(
      this.evaluationsService,
      actor.sub,
      datasetId,
      dto.question,
      dto.expected_document_ids,
      dto.expected_abstention,
    );
  }

  @Delete('datasets/:id/cases/:caseId')
  @ApiOperation({
    operationId: 'deleteDatasetCase',
    summary: 'Delete a ground-truth case from dataset and bump dataset revision',
    description: `- 📦 **Proceso:** Mantenimiento de benchmarks de evaluación.
- 🔧 **Funcionalidad:** Elimina un caso ground-truth e incrementa la revisión del dataset.`,
  })
  @ApiZodOk(deletedEvaluationResponseDto)
  deleteDatasetCase(
    @CurrentActor() actor: Actor,
    @Param('id', new ZodPipe(z.uuid())) datasetId: string,
    @Param('caseId', new ZodPipe(z.uuid())) caseId: string,
  ) {
    const method = this.evaluationsService.deleteDatasetCase ?? this.evaluationsService.deleteCase;
    return method.call(this.evaluationsService, actor.sub, datasetId, caseId);
  }

  @Get('runs')
  @ApiOperation({
    operationId: 'listEvaluationRuns',
    summary: 'List retrieval & abstention evaluation runs for tenant',
    description: `- 📦 **Proceso:** Auditoría de benchmarks y calidad RAG.
- 🔧 **Funcionalidad:** Lista corridas históricas con métricas Recall@6, MRR@6, NDCG@6 y tasa de abstención.`,
  })
  @ApiZodQuery(listEvaluationsQueryDto)
  @ApiZodOk(paginatedRunsResponseDto)
  async listEvaluationRuns(@CurrentActor() actor: Actor, @Query() rawQuery: Record<string, unknown>) {
    const parsed = listEvaluationsQueryDto.safeParse(rawQuery);
    if (!parsed.success) {
      throw new BadRequestException('Invalid tenant UUID or pagination query');
    }
    const { tenant_id, limit, offset } = parsed.data;
    const method = this.evaluationsService.listEvaluationRuns ?? this.evaluationsService.runs;
    const page = await method.call(this.evaluationsService, actor.sub, tenant_id, {
      limit,
      offset,
    });
    return buildPaginatedPayload({
      count: page.count,
      results: page.results,
      limit,
      offset,
      path: '/api/v1/evaluation/runs',
      extraQuery: { tenant_id },
    });
  }

  @Post('runs')
  @ApiOperation({
    operationId: 'executeEvaluationRun',
    summary: 'Execute authorized retrieval & abstention evaluation run on dataset',
    description: `- 📦 **Proceso:** Pipeline de evaluación automatizada RAG.
- 🔧 **Funcionalidad:** Ejecuta todas las consultas del dataset calculando métricas de ranking y abstención.`,
  })
  @ApiZodBody(startRunRequestDto)
  @ApiZodCreated(runSummaryResponseDto)
  executeEvaluationRun(
    @CurrentActor() actor: Actor,
    @Body(new ZodPipe(startRunRequestDto))
    dto: z.output<typeof startRunRequestDto>,
  ) {
    const method = this.evaluationsService.executeEvaluationRun ?? this.evaluationsService.run;
    return method.call(this.evaluationsService, actor.sub, dto.dataset_id);
  }

  @Get('runs/:id')
  @ApiOperation({
    operationId: 'getEvaluationRunDetail',
    summary: 'Get per-case breakdown of an evaluation run',
    description: `- 📦 **Proceso:** Diagnóstico granular de calidad RAG.
- 🔧 **Funcionalidad:** Retorna el desglose caso por caso de una corrida de evaluación finalizada.`,
  })
  @ApiZodOk(runDetailResponseDto)
  getEvaluationRunDetail(@CurrentActor() actor: Actor, @Param('id', new ZodPipe(z.uuid())) runId: string) {
    const method = this.evaluationsService.getEvaluationRunDetail ?? this.evaluationsService.getRun;
    return method.call(this.evaluationsService, actor.sub, runId);
  }

  // --- Backward compatibility aliases ---
  datasets(actor: Actor, rawQuery: Record<string, unknown>) {
    return this.listDatasets(actor, rawQuery);
  }
  create(actor: Actor, dto: z.output<typeof createDatasetRequestDto>) {
    return this.createDataset(actor, dto);
  }
  removeDataset(actor: Actor, datasetId: string) {
    return this.deleteDataset(actor, datasetId);
  }
  cases(actor: Actor, datasetId: string, query: z.output<typeof offsetPaginationQueryDto>) {
    return this.listDatasetCases(actor, datasetId, query);
  }
  add(actor: Actor, datasetId: string, dto: z.output<typeof createCaseRequestDto>) {
    return this.addDatasetCase(actor, datasetId, dto);
  }
  removeCase(actor: Actor, datasetId: string, caseId: string) {
    return this.deleteDatasetCase(actor, datasetId, caseId);
  }
  runs(actor: Actor, rawQuery: Record<string, unknown>) {
    return this.listEvaluationRuns(actor, rawQuery);
  }
  run(actor: Actor, dto: z.output<typeof startRunRequestDto>) {
    return this.executeEvaluationRun(actor, dto);
  }
  detail(actor: Actor, runId: string) {
    return this.getEvaluationRunDetail(actor, runId);
  }
}
