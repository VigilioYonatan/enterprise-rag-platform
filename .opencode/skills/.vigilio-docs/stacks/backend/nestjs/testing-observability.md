# NestJS: Vitest + OTel + runtime explicitado

Vitest unit service/domain, integración PostgreSQL real con Drizzle, E2E HTTP, controles OpenAPI y pruebas de caché invalidación. OTel/Pino transversal: HTTP spans, SQL/Redis si la instrumentación instalada lo soporta, correlación, labels sin PII. Guards/policies en cada ruta protegida.

El perfil `node-nest` no debe determinar EKS y Lambda a la vez. Ejecutable en EKS con `kubernetes-eks-delivery` o arquitectura Lambda separada con ADR y herramientas propias. Rastrear diferencias contra baseline, no cambiar versiones por aplicar skills.

[Testing completo](testing/references/38-estrategia-testing-2026.md) · [Observabilidad](../../../standards/observability/references/16-observability-slo.md).

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Probar invariantes, guards/Policies, query Zod/FormRequest, contrato OpenAPI y DB/Redis real donde aplique.
- ❌ **Incorrecto:** Confundir mocks con integración, afirmar cobertura por porcentaje o ignorar comportamiento existente y casos negativos.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../standards/engineering/refactoring-existing-code.md).

## Pruebas y trazas por feature

- Unit: invariantes del agregado y casos de uso con puertos simulados.
- Integration: Drizzle/PostgreSQL reales con migraciones y limpieza; Redis real para invalidación cuando aplica.
- E2E: `GET /products?limit=10`, entrada inválida, 401/403/404/422, tenant cruzado y JSON conforme OpenAPI.
- Observabilidad: propagar trace context desde HTTP a queries/jobs; medir duración, errores y evitar PII en labels/logs.

✅ Ejecutar pruebas y capturar comandos/salidas. ❌ Marcar `PASS` porque un documento dice `Vitest` o porque un interceptor existe sin estar registrado.

Guías existente: [NestJS](quality/refactoring-examples.md) y [operación transversal](../../../standards/observability/otel.md).

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../../governance/complete-work-coverage-policy.md).

