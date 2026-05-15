# Adaptación DDD pragmática · Laravel

```text
app/Knowledge/
  Domain/{Ports,Entities,Types,Const}/
  Application/UseCases/{IngestDocument,AnswerQuestion,EvaluateRetrieval}/
  Infrastructure/{Embeddings,PostgresVector,LLM,Telemetry,Jobs}/
  Http/{Controllers,Requests,Resources}/
```

**Hacer:** Form Requests y Policies para autorización, services/contracts por interfaces, Jobs con idempotencia, Queues + Horizon cuando convenga, Laravel AI SDK como adaptador y migrations para pgvector.

**No hacer:** lógica RAG dentro de controllers/models Eloquent, usar roles privilegiados en queries de usuarios, exponer documentos sin Policy o crear un agente para un pipeline lineal.

**Test mínimos:** Feature tests de Policies/RLS, rollback de job, integridad de citas, capacidad de abstenerse y presupuesto.

## Ajustes Vigilio Laravel

- Utilizar Form Requests, Policies, Resource/DTO, Use Cases semánticos, Eloquent adapters y migraciones versionadas; no copiar Zod a PHP.
- Usar contrato interoperable OpenAPI/Scalar y conformidad en CI; `readonly`, PHP Enums, `Constants/` y `Types/` solo cuando lo exija el dominio.
- Jobs de ingesta idempotentes y transacciones adecuadas; Redis/Horizon **solo** si el driver de cola es Redis, no SQS.
- No ejecutar la query como propietario/superusuario de PostgreSQL, ni exponer `tenant_id` del request sin comprobación.

❌ No poner RAG, SQL y la llamada al LLM dentro de Controller; `foreach` es válido cuando el recorrido tiene efectos y Collections cuando simplifican transformaciones.

## Ejemplo de límites entre aplicación e infraestructura

✅ **Correcto:** `AnswerQuestion::answerQuestion($query, $actor)` coordina autorización, recuperación permitida, presupuesto y construcción de una respuesta con referencias. Una Policy valida el recurso; el adaptador Eloquent/pgvector aplica **también** los permisos de documento en SQL con un rol limitado. El Controller delega y el Resource proyecta campos públicos. `readonly DTO` transporta resultados sin mezclar HTTP con dominio.

❌ **Incorrecto:** `AnswerQuestionController` compone SQL/vector, acepta `tenant_id` del body como autoridad y pasa chunks sin validar al generador. Tampoco es seguro confiar únicamente en `ProductPolicy` si la búsqueda SQL devuelve fragmentos ajenos.

```php
// Esquema ilustrativo de limites (no backend Laravel ejecutable).
public function answerQuestion(QuestionInput $input, ActorContext $actor): AnswerResult
{
    $this->budgets->authorize($actor);
    $chunks = $this->retriever->searchAuthorized($input->query, $actor);
    return $this->generator->answerWithVerifiedCitations($input, $chunks);
}
```

**Verificar antes de release:** Feature tests de `403`, roles SQL efectivos, ACL de usuarios del mismo tenant, persistencia idempotente, trazas sin prompts/PII, coste máximo y conformidad OpenAPI. El fragmento ilustra una interfaz; no afirma que sus adaptadores estén implementados.

## Cobertura de implementación y evidencia (ampliación)

Estas comprobaciones concretan el tema de esta guía; aplicar solo las pertinentes al sistema consumidor y documentar exclusiones justificadas.

1. **Implementación concreta:** Controller delega a use-case semántico; Repository port devuelve modelo de dominio/read model, Eloquent queda fuera de dominio.
2. **Contratos:** Form Request valida entrada; API Resource proyecta salida y OpenAPI documenta el contrato.
3. **Seguridad:** Policy por acción y recurso con filtros por tenant/documento; incluir test anónimo y cross-tenant.
4. **Transacciones:** Probar DB real, rollback, outbox y colas con retry/deduplicación según caso.
5. **Operación:** Observar logs estructurados, traces, jobs y N+1 con consultas reales.
6. **Testing:** Probar Unit/Pest, Feature HTTP y E2E real sin confundir fakes con infraestructura ejecutada.

✅ **Correcto:** conservar el flujo funcional y demostrar criterios de aceptación con tests, trazas, revisión de contratos o un plan reproducible según el riesgo.

❌ **Incorrecto:** sustituir las reglas de negocio por un resumen, copiar implementaciones de otro framework, declarar cobertura sin evidencia o presentar `NOT_RUN` como `PASS`.

**Salida mínima:** responsable del control, riesgo cubierto, evidencia verificable y estado `PASS | FAIL | NOT_RUN | BLOCKED`. Los comandos de ejemplo son ilustrativos salvo que se adjunte ejecución real.

## Integración Hybrid RAG 2026 (norma compartida por enlace)

- [Seleccionar SQL/tool, Hybrid, Agentic, GraphRAG o contexto largo](../../../foundations/ai/seleccion-arquitectura-2026.md).
- [Recuperación híbrida FTS+vector+RRF y contrato ACL](../../../standards/ai/hybrid-rag-postgresql.md).
- [Reranking medido](../../../standards/ai/reranking.md), [evaluación](../../../standards/ai/evaluacion-calidad.md) y [modelo/versionado](../../../standards/ai/model-lifecycle.md).

El código de esta guía implementa **solo el adaptador del framework**: controller delgado, caso de uso semántico `answerQuestion()`, permisos por documento, puertos `KnowledgeRetriever` y `AnswerGenerator`, transacción/cola y telemetría. No copiar aquí código SQL compartido ni recetas de SDK de otro stack.

✅ **Correcto:** recuperar contenido autorizado antes de pasarlo al reranker/generador, verificar `document_id`, `source_version` y citas. ❌ **Incorrecto:** autorizar solo por tenant, asumir que el SQL de referencia aplica ACL de documentos, o mezclar código PHP con NestJS.
