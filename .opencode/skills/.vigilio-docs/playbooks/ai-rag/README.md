# Playbooks RAG · operación y release

- [Go / No-Go](go-no-go.md)
- [Pruebas CI según cambio](ci-regression.md)
- [Incidentes](incidentes.md)
- [Casos JSONL ficticios](casos-evaluacion.jsonl)

Evals/ACL/presupuesto/pgvector reales: **NOT_RUN** hasta ejecutar suites y obtener evidencia. Los ejemplos no forman un runner.

## Política de uso de estos playbooks

✅ **Correcto:** ejecutar los pasos de [Go/No-Go](go-no-go.md) y las regresiones de [CI](ci-regression.md), adjuntar resultados reales por commit/modelo/índice y registrar `NOT_RUN` cuando no existe un ejecutor.

❌ **Incorrecto:** interpretar los casos de muestra JSONL como evaluaciones aprobadas o marcar todas las casillas sin evidencias de pruebas automáticas y revisión responsable.

**Salida exigida:** versión evaluada, entorno, comandos, evidencia reproducible, fallos abiertos, propietario y decisión de release.

## Validación de Hybrid RAG y cambios de modelo (2026)

[Elección de arquitectura](../../foundations/ai/seleccion-arquitectura-2026.md) → [Hybrid SQL](../../standards/ai/hybrid-rag-postgresql.md) → [reranking](../../standards/ai/reranking.md) → [evaluación](../../standards/ai/evaluacion-calidad.md) → [go/no-go](go-no-go.md) → [incidentes](incidentes.md).

✅ **Correcto:** publicar un benchmark con corpus, identidad, métricas, p95 y presupuesto. ❌ **Incorrecto:** declarar que los fixtures JSONL sin runner prueban el RAG.
