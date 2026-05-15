# Estándares transversales Vigilio

Normas que comparten NestJS, Laravel y futuros stacks: [API](api/contracts.md), [seguridad](security/authorization.md), [testing](testing/strategy.md), [cache](caching/cache-aside.md), [datos](data/transactions.md), [DevSecOps](devsecops/cicd.md), [observabilidad](observability/otel.md), [mensajería](messaging/reliability.md).

Los documentos del framework implementan estas políticas sin copiarlas. Los playbooks agregan pasos y evidencia sin reemplazar la norma.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](engineering/refactoring-existing-code.md).

## Guías canónicas incorporadas en la migración NestJS 2026

Normas nuevas: [contratos/paginación](api/http-errors-and-pagination.md), [tenancy](security/tenant-isolation.md), [invalidación de caché](caching/invalidation.md), [testing de contratos](testing/contract-and-bdd.md), [outbox](messaging/outbox-idempotency.md).

✅ Correcto: enlazar el propietario único de cada decisión. ❌ Incorrecto: duplicar una norma universal en cada framework.

## Cobertura completa y navegación por escenario

- [Matriz aplicable de prácticas, riesgos y aceptación](testing/e2e-quality-gates.md) — seleccionar todas las pertinentes; una guía breve o un índice no equivalen a una implementación terminada.

✅ Correcto: seguir el estándar y registrar evidencia. ❌ Incorrecto: detenerse en los primeros tres ejemplos.

## Extensión Auto-Senior — octubre 2026

- [Orquestación automática y fuentes obligatorias](ai/skill-orchestration-policy.md)
- [Detección de regresiones y PR gates](engineering/change-impact-and-review-gates.md)
- [Preflight de servicios y E2E](testing/environment-preflight-and-e2e.md)
- [Convención compacta Swagger/Scalar](api/openapi-operation-documentation.md)

## Migración del Master histórico de Software Factory

- [Relaciones polimórficas e integridad relacional](data/polymorphic-relations.md)
- [Casos de uso y trazabilidad proporcional](engineering/use-case-traceability.md)
- [Planes DAG, context locks y recuperación — TARGET](../platform-runtime/5-execution-plans-and-context-locks.md)

Estas rutas sustituyen las reglas reutilizables del master obsoleto; no reintroducir operaciones `index/show/store` como norma vigente.
