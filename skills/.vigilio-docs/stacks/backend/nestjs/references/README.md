# Documentacion Arquitectonica - `bus-impl` 2026

Este directorio contiene la documentacion de arquitectura del `bus-impl` actualizado a 2026:

- DDD pragmatico por modulo, sin entities obligatorias en CRUD simple.
- NestJS como framework principal.
- Zod en lugar de Joi.
- Swagger/OpenAPI generado desde Nest usando DTOs Zod + Scalar como UI de documentacion.
- Drizzle ORM + PostgreSQL.
- Vitest + Playwright.
- Biome en lugar de ESLint + Prettier.
- pnpm + GitHub Actions + AWS CDK.

Para la vision transversal de seguridad, escalamiento, testing y costos entre todos los proyectos,
revisar los documentos globales del repositorio raiz (`docs/01-escalamiento-seguridad-testing-2026.md`),
que no forman parte de este sitio publicado.

La fuente de verdad ejecutable para versiones es
`@vigilioyonatan/devsecops-governance/policies/platform/node-backend-2026.json`, publicada desde
`vigilio-platform-actions`. Cada backend valida ese baseline con
`vigilio-governance validate-platform-baseline`; este repositorio explica las decisiones, pero no
reemplaza la politica central.

Fuentes de verdad por responsabilidad:

1. codigo, tests y configuracion ejecutable prueban el comportamiento del consumidor;
2. policies, CLIs, actions y reusable workflows de `vigilio-platform-actions` gobiernan controles
   ejecutables y versiones;
3. ADRs y `vigilio-docs` gobiernan decisiones, practicas y ejemplos reutilizables;
4. las skills de `vigilio-platform-actions` enlazan esas fuentes y ordenan el trabajo sin duplicarlas.

En `bus-impl`, los modulos actuales del template son `auth`, `user`, `product`, `health`, `upload`
y `ai-chat`.
Los nombres `product`, `renovacion`, `emision`, `constancia` y `learn-aws` se conservan en algunos
documentos como ejemplos referenciales de negocio o aprendizaje. No son modulos obligatorios ni
implican que existan en el codigo actual.

## Indice

1. [Estructura de archivos](../architecture/references/1-estructura-archivos.md): arbol actualizado del repo y organizacion por bounded context.
2. [Arquitectura](../architecture/references/2-arquitectura.md): DDD, NestJS, Drizzle, PostgreSQL, eventos AWS, Swagger, Scalar y versiones verificadas.
3. [Ambientes de trabajo](../../../../platform/cicd/references/3-ambientes-trabajo.md): ambientes, desarrollo local, previews de PR y despliegue por stage.
4. [DevSecOps](../../../../platform/cicd/references/4-devsecops.md): GitHub Actions, OIDC, scans, quality gates y CDK.
5. [Buenas practicas](../quality/references/5-buenas-practicas.md): reglas de arquitectura, tipado, validacion, repositorios y observabilidad.
6. [Ejemplos de codigo](../http/references/6-ejemplos-codigo.md): controller Zod + Swagger/Scalar, application service, repository port y repositorio Drizzle.
7. [Pruebas Vitest + Playwright](../testing/references/7-pruebas-vitest-playwright.md): testing 2026 con Vitest, Playwright y PostgreSQL real.
8. [Bootstrap HTTP y workers](../runtime/references/8-bootstrap-http-workers.md): bootstrap moderno para HTTP y workers async sobre AWS Lambda.
9. [Cache](../persistence/references/9-cache.md): cache de aplicacion y runtime con Lambda, Valkey/ElastiCache, TTLs e invalidacion.
10. [Optimizacion de costos AWS](../../../../platform/aws/references/10-optimizacion-costos-recursos-aws.md): ahorro de servidor, AWS, logs, DB y DevSecOps.
11. [Logging Pino](../runtime/references/11-logging-pino.md): logging estructurado con Pino, NestJS, redaction, request context y CloudWatch.
12. [AuthZ y seguridad](../security/references/12-authz-security.md): AuthN/AuthZ, RBAC/ABAC, `@Public`, permisos por endpoint y controles runtime.
13. [Data governance](../../../../standards/data/references/13-data-governance.md): PII, auditoria, retencion, masking y aislamiento por tenant.
14. [Resilience y eventos](../../../../standards/messaging/references/14-resilience-events.md): outbox, inbox, idempotencia, DLQ, replay y versionado de eventos.
15. [Migraciones DB](../persistence/references/15-migrations-db.md): migraciones PostgreSQL/Drizzle seguras, expand-contract, backfills y rollback.
16. [Observability y SLO](../../../../standards/observability/references/16-observability-slo.md): SLIs, SLOs, error budgets, dashboards, alertas y runbooks.
17. [Backup, restore y DR](../../../../standards/data/references/17-backup-restore-dr.md): RTO/RPO, backups, restore drills, DR y recuperacion operativa.
18. [ADR y threat model](../../../../platform/sre/references/18-adr-threat-model.md): ADRs, threat modeling, riesgos, excepciones y decision records.
19. [Evidencia operacional](../../../../platform/sre/references/19-evidencia-operacional.md): evidencia CI/CD antes de llamar production-ready a la arquitectura.
20. [Reglas senior de codigo](../quality/references/20-reglas-senior-codigo.md): DTOs Zod, Drizzle, cache, seeders, uploads, logger y Zod v4.
21. [Golden path feature](../architecture/references/21-golden-path-feature.md): feature CRUD copi/pega con reglas de domain, DTOs, repository, tests y PR checklist.
22. [Cucumber BDD](../../../../standards/testing/references/22-cucumber-bdd.md): acceptance tests de negocio con Gherkin, DTOs Zod y application services.
23. [Seguridad y hardening](../security/references/23-seguridad-hardening.md): checklist senior de seguridad runtime, supply chain, secrets, datos, resiliencia e incident response.
24. [Roadmap 10/10](../../../../platform/sre/references/24-roadmap-10-10.md): estado real, contras y mejoras para llegar a production-ready enterprise.
25. [CDK e IaC AWS](../../../../platform/iac/references/25-cdk-iac-aws.md): stacks CDK reales, stages, seguridad, cdk-nag, CI y reglas de deploy.
26. [Seeders en DDD](../persistence/references/26-seeders-ddd.md): ubicacion correcta, reglas, comandos e idempotencia para datos base.
27. [DTOs request/response](../http/references/27-dtos-request-response.md): convencion de 2 archivos por caso de uso, request y response.
28. [CI/CD AWS stages y observabilidad](../../../../platform/cicd/references/28-cicd-aws-stages-observability.md): deploy por environments, OIDC, canary y CloudWatch costo-eficiente.
29. [Configuracion NestJS con Zod y AWS](../runtime/references/29-config-nest-zod-aws.md): `ConfigModule`, `ConfigService`, validacion Zod y variables por stage.
30. [Referencia AWS y FinOps](../../../../platform/aws/references/30-learn-aws-finops.md): catalogo archivado de aprendizaje; no describe endpoints activos del template.
31. [AI Chat con Amazon Bedrock](../ai/references/31-ai-chat-bedrock-ddd.md): endpoint HTTP protegido para chatbot IA sin WebSockets, con DDD pragmatico, Zod, IAM y control de costos.
32. [Uploads S3 con presigned URLs](../http/references/32-uploads-s3-presigned.md): endpoint reusable para subir archivos directo a S3, con validacion Zod, cache, seguridad y ahorro de costos.
33. [Guia GitHub, Jira, AWS y CI/CD 2026](../../../../platform/cicd/references/33-guia-github-jira-aws-cicd-2026.md): setup paso a paso de repositorio, roles, branch protection, Jira, OIDC, environments, deploy y rollback.
41. [Dependabot y Repository Policy](../../../../platform/cicd/references/41-dependabot-repository-policy.md): PRs automaticos de dependencias y validacion de archivos criticos de gobierno.
34. [Gestion de configuracion hibrida](../runtime/references/34-gestion-configuracion-hibrida-2026.md): `.env` local, SSM, Secrets Manager y validacion Zod por stage.
42. [Trunk-Based + Environments Protegidos 2026](../../../../platform/cicd/references/42-branching-release-flow-2026.md): flujo `feature -> main -> staging QA -> production manual`, sin Git Flow pesado.
35. [Versionamiento basado en commits](../../../../standards/engineering/references/35-versionamiento-basado-en-commits-2026.md): tags, releases y trazabilidad desde commits validados.
36. [Deuda Tecnica DevSecOps](../quality/references/36-deuda-tecnica.md): deudas conscientes, decisiones aceptadas y plan para cerrar brechas enterprise.
37. [Resumen de jobs CI/CD](../../../../platform/cicd/references/37-cicd-jobs-resumen.md): jobs actuales de `ci.yml`, gates y artefactos.
38. [Estrategia de testing 2026](../testing/references/38-estrategia-testing-2026.md): cobertura real, suites, gates CI, seguridad negativa, flakiness y siguientes controles.
39. [Skills IA del proyecto](../../../../playbooks/references/39-skills-ia-proyecto.md): skills especializados para features, persistencia/cache, testing y seguridad/AWS.
40. [Operacion de produccion](../runtime/references/40-operacion-produccion.md): health/readiness, RBAC, migraciones, restore drill, carga, alertas y gate de release.
41. [Agent stack](agent-stack-guide.md): estado de OpenCode/OmO y diferencia frente a las skills activas.
44. [Tiempo real con WebSocket, Socket.IO y SSE](../messaging/references/44-realtime-websocket-sse.md): selección, contratos, seguridad, escalamiento y pruebas.
45. [Workers, outbox, SNS, SQS y DLQ](../messaging/references/45-workers-outbox-sqs.md): entrega, idempotencia, replay, métricas y operación.

## Contratos generados

El contrato OpenAPI vivo se genera y versiona en `docs/openapi/openapi.json` dentro de cada
servicio. `vigilio-docs` documenta la practica, pero no cachea contratos de proyectos.

## Template de proyecto

`bus-impl` es un template NestJS listo para clonar:

- Configuracion base: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `playwright.config.ts`, `drizzle.config.ts`.
- Estructura de tests: `tests/unit/`, `tests/integration/`, `tests/e2e/`, `tests/bdd/` y `tests/factories/`.
- Scripts propios del proyecto y tooling compartido publicado desde `vigilio-platform-actions`.
- Skills Vigilio sincronizados via `pnpm skills:sync`.

## Actualización incremental 2026-10-23

[46. Zod query, nombres DDD y versiones estables](../http/references/46-zod-query-ddd-versiones-2026.md):
coerción segura en queries HTTP, comandos de dominio, contratos Zod únicos,
invalidación de caché y estrategia de migración NestJS 11→12 verificada por compatibilidad.
No cambia por sí sola las dependencias de los proyectos consumidores.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
