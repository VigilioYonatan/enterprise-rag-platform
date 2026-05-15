# NestJS: catálogo de tecnologías y compatibilidad

> **Versiones centralizadas:** consultar [technology/versions.md](../versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

Este documento describe familias tecnológicas; **no sustituye** el lockfile ni aprueba una migración de Node/NestJS automáticamente. El proyecto consumidor determina versiones instaladas, compatibilidad de plugins e instrumentaciones y el CI ejecuta las pruebas.

| Responsabilidad | Tecnología de referencia | Comprobación |
| --- | --- | --- |
| Runtime | Node.js LTS aprobado | `node -v`, engines, lockfile, despliegue |
| Framework | NestJS 11/12 según baseline compatible | módulos, Swagger, guards, DI, testing |
| Contratos | Zod 4 y OpenAPI | una fuente, `z.infer`, client y diff |
| DB | PostgreSQL + Drizzle | migrations, typed queries, transactions |
| Caché | Valkey/Redis según contrato | invalidación, authz, TTL y seguridad |
| Logs/traces | Pino y OpenTelemetry | instrumentation, redaction, context |

NestJS 12 expone integración Standard Schema; validar compatibilidad de `nestjs-zod` y decidir un único modo de OpenAPI sin validación redundante.

✅ Correcto: verificar release estable en proveedor, lockfile, tests de integración y matriz de compatibilidad antes de subir major.

❌ Incorrecto: copiar versiones recientes a todo `.md` o forzar la última minor solo por fecha.

[Baseline propuesto](../baselines/backend-nestjs-2026.md), [documento histórico extensivo](references/43-backend-technologies-skill-2026.md), [NestJS oficial](https://docs.nestjs.com/).

## Procedencia documental preservada

- [Capítulo heredado: 43-backend-technologies-skill-2026.md](references/43-backend-technologies-skill-2026.md) — contenido íntegro conservado.
- [Capítulo heredado: shared-technologies-skill-2026.md](references/shared-technologies-skill-2026.md) — contenido íntegro conservado.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

