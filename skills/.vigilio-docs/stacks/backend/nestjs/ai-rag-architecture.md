# Adaptación DDD pragmática · NestJS

```text
src/modules/knowledge/
  domain/{ports,entities,types,const}/
  application/use-cases/{ingest-document,answer-question,evaluate-retrieval}/
  infrastructure/{embeddings,pgvector,llm,telemetry,queues}/
  presentation/controllers/
```

**Puertos**: `EmbeddingProvider`, `KnowledgeRetriever`, `DocumentRepository`, `AnswerGenerator`, `UsageLedger`, `BudgetAuthorizer`.

**Hacer:** DTO/contratos con Zod en borde; controllers delgados; contexto de tenant validado en guard; casos de uso semánticos; jobs idempotentes con BullMQ; traces/cost en adaptadores; autorización antes de recuperar chunks.

**No hacer:** `OpenAIService` usado como dominio, SQL dentro de controller, prompt definido en entidad, `tenant_id` suministrado sin validar desde body, ni duplicar schemas Zod.

**Test mínimos:** resolver `answerQuestion()` con mocks; autorización cross-tenant; DLQ/retry; presión de costos; trazas sin PII.

## Ajustes Vigilio NestJS

- Conservar `z.infer`, `schema.pick()` y DTOs compartidos; **no duplicar schemas** ni aplicar `.parse()` a cada respuesta solo para tipado. Validar el request externo.
- `answerQuestion()` coordina autorización y retrieval; los adapters de pgvector, modelo y presupuesto viven en infraestructura. El dominio mantiene invariantes propias, no SDKs ni HTTP.
- Reutilizar `node-nest-build-feature`, `node-nest-persistence`, `node-nest-testing`, `platform-observability-sre`.
- `const/` o `constants/`, `types/`, enums y value objects separados cuando aportan claridad; no obligar a crearlos vacíos.
- No incluir `tenant_id` suministrado por body como contexto confiable; debe proceder del contexto autenticado.

❌ No usar `forEach(async ...)` para ingesta: emplear workers idempotentes con concurrencia limitada; `map()` transforma y `for...of` itera cuando corresponde.

## Ejemplo de un caso de uso semántico

✅ **Correcto:** `answerQuestion()` recibe un actor autenticado del guard, consulta `KnowledgeRetriever` con permisos aplicados en aplicación y SQL, reserva presupuesto mediante port y devuelve un tipo de contrato `z.infer` sin repetir `.parse()` para tiparlo. El Controller solo valida request, aplica guards, delega y documenta OpenAPI/Scalar.

❌ **Incorrecto:** un método `index()` genérico que ejecuta SQL y llama al modelo directamente; confiar en `tenant_id` del DTO público o presentar un filtro textual del prompt como aislamiento de ACL.

```typescript
// Interfaces ilustrativas: adaptadores y clases concretas no incluidos.
async answerQuestion(
  query: AnswerQuestionInput,
  actor: AuthenticatedActor,
): Promise<AnswerQuestionResponseDto> {
  await this.budgetAuthorizer.reserve(actor, query);
  const chunks = await this.retriever.searchAuthorized(query, actor);
  return this.answerGenerator.answerWithVerifiedCitations(query, chunks);
}
```

**Validaciones:** guards + permisos en consulta de almacenamiento, pruebas cross-tenant y cross-user, control de concurrencia/presupuesto, citas contra IDs reales y trazas OTel sin contenido privado. Incluir una prueba que demuestre que un usuario no puede citar chunks de otro usuario dentro del mismo tenant.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Implementación concreta:** Respetar controller delgado → use case semántico → ports → adaptador; verificar que dominio no importa Nest.
2. **Contratos Zod:** Derivar DTO de schema canónico con .pick() y paginador reutilizable; aplicar coerce solo a entrada HTTP.
3. **Seguridad:** Pasar identidad del guard a caso de uso y filtrar tenant/ACL en repositorio; prueba cross-tenant.
4. **SQL y caché:** Probar Drizzle con DB real e invalidación después del commit; no tratar cast TS como validación runtime.
5. **Operación:** Correlacionar Pino/OTel entre controller y worker, y probar fallos de dependencia.
6. **Testing:** Ejecutar test de borde, contrato, E2E y test de invariantes según riesgo; clasificar NOT_RUN.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Integración Hybrid RAG 2026 (norma compartida por enlace)

- [Seleccionar SQL/tool, Hybrid, Agentic, GraphRAG o contexto largo](../../../foundations/ai/seleccion-arquitectura-2026.md).
- [Recuperación híbrida FTS+vector+RRF y contrato ACL](../../../standards/ai/hybrid-rag-postgresql.md).
- [Reranking medido](../../../standards/ai/reranking.md), [evaluación](../../../standards/ai/evaluacion-calidad.md) y [modelo/versionado](../../../standards/ai/model-lifecycle.md).

El código de esta guía implementa **solo el adaptador del framework**: controller delgado, caso de uso semántico `answerQuestion()`, permisos por documento, puertos `KnowledgeRetriever` y `AnswerGenerator`, transacción/cola y telemetría. No copiar aquí código SQL compartido ni recetas de SDK de otro stack.

✅ **Correcto:** recuperar contenido autorizado antes de pasarlo al reranker/generador, verificar `document_id`, `source_version` y citas. ❌ **Incorrecto:** autorizar solo por tenant, asumir que el SQL de referencia aplica ACL de documentos, o mezclar código PHP con NestJS.
