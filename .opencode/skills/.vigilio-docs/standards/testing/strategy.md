# Testing por riesgo, no por cuotas arbitrarias

- Unit: reglas del dominio, objetos de valor, casos de uso con dobles de puertos.
- Integration: PostgreSQL y Redis/Valkey reales con aislamiento, migraciones y limpieza; no llamar integración a un repositorio falso.
- Feature/E2E: endpoint, autenticación, autorización, validación de parámetros, 401/403/404/422 y proyección JSON.
- Contract: OpenAPI generado desde Zod vs JSON PHP/NestJS, incluyendo ejemplos de paginación, errores y compatibilidad de clientes.
- Concurrencia: versión optimista o bloqueo, jobs con reintentos, transacción más outbox e invalidación de caché tras commit.
- Observabilidad: probar sin registrar PII y propagación de trace context donde aplique.

**Gate:** comandos ejecutados y evidencia concreta; si no se dispone de DB/Composer, indicar `NOT_RUN` y no afirmar que pasó. Priorizar falsos positivos cero sobre falsa cobertura.

[Testing NestJS](../../stacks/backend/nestjs/testing/references/38-estrategia-testing-2026.md) · [Laravel testing](../../stacks/backend/laravel/testing/testing-strategy.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Probar invariantes, guards/Policies, query Zod/FormRequest, contrato OpenAPI y DB/Redis real donde aplique.
- ❌ **Incorrecto:** Confundir mocks con integración, afirmar cobertura por porcentaje o ignorar comportamiento existente y casos negativos.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../engineering/refactoring-existing-code.md).

## Matriz mínima por tipo de cambio

| Cambio | Tests exigibles |
|---|---|
| Zod query/FormRequest | vacío, `0`, negativos, máximo, float, texto inválido; defaults y salida tipada |
| DDD | transición válida e inválida, concurrencia, errores del dominio |
| DB/ORM | PostgreSQL real, migración forward, constraint, N+1 y tenant isolation |
| Caché | hit/miss, TTL, invalidación después del commit, fallo Redis y carreras |
| Controller | 200/201, 401/403/404/422, docs OpenAPI y proyección JSON |
| Worker | reintentos, idempotencia, DLQ, outbox y correlación |
| CI/Infra | manifiestos validados, permisos mínimos, rollback, health probes |

**Ejemplo de evidencia**: `unit: PASS (82 tests)`, `postgres: NOT_RUN (no hay servicio)`, `composer audit: BLOCKED (no hay vendor)`. No transformar un `NOT_RUN` en verde.

## Mejoras técnicas verificables — 2026

**10. Tests de comportamiento anterior.** ✅ Congelar contratos/autorización y casos negativos antes de refactorizar, además de integración con DB real donde importa. ❌ Considerar lint o `php -l` una prueba funcional de transacciones y caché.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

## Pirámide de evidencias por riesgo

| Cambio | Unit | Integración | Contrato/E2E |
| --- | --- | --- | --- |
| Regla `OrderEntity.cancel()` | Transiciones e idempotencia | Conflicto concurrente DB | Código HTTP 409 |
| Query multitenant | Filtros internos | PostgreSQL real y aislamiento | 401/403 y `count` correcto |
| DTO HTTP | Zod parse/transform | Pipe/controller | OpenAPI/consumidor |
| Worker con outbox | Handler idempotente | DB + broker | Replay y DLQ |
| Cache | Key builder | Valkey real cuando cambia algoritmo | Invalidación tras mutation |

✅ **Correcto:** reportar pruebas ejecutadas con comando, commit, versión de runtime, datos representativos y resultado.

❌ **Incorrecto:** usar solamente mocks que ocultan constraints SQL, presentar `php -l` como prueba funcional, omitir escenarios negativos por alcanzar coverage alto.

Las suites concretas pertenecen a [NestJS](../../stacks/backend/nestjs/testing-observability.md) y [Laravel](../../stacks/backend/laravel/testing/testing-strategy.md).
