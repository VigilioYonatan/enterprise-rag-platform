# Node.js y NestJS — compatibilidad y criterios de actualización

> **Versiones centralizadas:** consultar [technology/versions.md](../versions.md). Los números que aparecen en ejemplos anteriores son históricos, no el baseline activo.

- Elegir la línea LTS aprobada consultando [versions.md](../versions.md); no confundir una rama Current con una línea LTS soportada.
- Para proyectos **nuevos**, comprobar la versión estable de NestJS declarada en [versions.md](../versions.md) y compatibilidad real con Zod, `nestjs-zod`, OpenAPI/Scalar, Drizzle, instrumentación y tests.
- `vigilio-docs/COMPATIBILITY.md` conserva el snapshot del consumidor existente (Node 24.16.0, ecosistema heredado); esta página no afirma que ya se haya migrado.
- Mantener `pnpm-lock.yaml`, engines, tests de integraciones, `@nestjs/swagger`, versionado de OpenAPI y auth antes de aprobar un upgrade mayor.
- Reglas de contratos: Zod 4 con `z.uuid()`, `.pick()`, `createPaginatorDto()`, `z.infer` y validación HTTP query string→number; no hacer `.parse()` de salida por obligación cuando solo se tipa.

Fuentes: [Node releases](https://github.com/nodejs/node/releases) y [Nest releases](https://github.com/nestjs/nest/releases).

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../governance/documentation-dry-and-ownership.md).


## Baseline operativo NestJS y Node.js

Validar `node --version`, lockfile del administrador de paquetes y `pnpm why` para `@nestjs/*`, Zod, `nestjs-zod`, Drizzle, Pino y OpenTelemetry. Node 24 LTS y NestJS 12 pueden ser objetivo, **no** motivo para actualizar un proyecto NestJS 11 que no pasa compatibilidad de plugins.

✅ Probar guardias, inyección, DTOs Zod, generación OpenAPI, driver PostgreSQL y auto-instrumentación OTel con dependencias resueltas. ❌ Instalar todo con `latest` o mezclar releases candidate con producción sin gate aprobado.

**Reproducibilidad:** CI restaura deps con lock estricto; ejecutar `pnpm install --frozen-lockfile`, typecheck, Vitest y contrato OpenAPI. Crear ADR para incompatibilidades de drivers.

> Fuente única para **Cobertura de implementación y evidencia (ampliación)**: [abrir documento canónico](../../governance/complete-work-coverage-policy.md).

