# Roadmap 10/10 Production Ready - `bus-impl`

Estado verificado en repositorio: **baseline backend fuerte**. La preparacion productiva completa no
se puede puntuar solo desde Git porque depende de GitHub Environments, AWS desplegado, alarmas,
restore/rollback drills y operacion real.

Este roadmap fue actualizado contra `bus-impl` y `vigilio-platform-actions`: CI/CD, CDK,
PostgreSQL integration tests, Floci, Cucumber, OpenAPI diff, Pino, `.npmrc`, governance,
evidencia operacional, packages compartidos y workflows por stage.

## Lo Que Ya Esta Fuerte

- DDD pragmatico por feature sin obligar entities, mappers ni presenters donde no aportan.
- DTOs Zod para request/query/response y OpenAPI/Scalar como documentacion de API.
- Drizzle + PostgreSQL con migrations/checks y tests de repositorios reales.
- Vitest para unit/integration, Playwright para API/browser smoke y Cucumber para BDD critico.
- Seeders en infraestructura como clases idempotentes, no dominio.
- Pino/NestJS logger con redaction documentada.
- Configuracion de ambientes validada con Zod.
- CI por impacto con `changes`, cache, governance, lint, typecheck, unit, integration, AWS local, BDD, OpenAPI, e2e, CDK synth, build y security.
- Tooling compartido por paquetes: `vigilio-governance`, `vigilio-evidence`, `vigilio-node` y
  `vigilio-skills`, sin copiar validadores entre proyectos.
- GitHub Actions usa OIDC para AWS deploy, environments, cache, artifact attestation y SBOM.
- Security baseline: Gitleaks, `pnpm audit`, CodeQL cuando esta disponible, Trivy, Semgrep,
  package manager policy y GitHub Actions policy. Dependency Review queda condicionado a GHAS.
- CDK tiene stacks reales, `cdk-nag`, stages, IAM least privilege, logs, alarms y deploy por environment.
- Docs cubren cache, costos AWS, authz, data governance, resilience/events, migrations, observability, DR, ADR/threat model y Bedrock AI chat.

## Contras Reales

- Observabilidad todavia debe conectarse a dashboards/alertas reales de AWS, no quedarse solo en docs/logger.
- Falta demostrar correlation id extremo a extremo: HTTP, DB, eventos, Bedrock, S3 y logs CloudWatch.
- OpenAPI diff existe, pero el siguiente nivel es publicar baseline versionado por release y notificar breaking changes al PR.
- Rate limit e idempotency deben pasar de guia a implementacion en endpoints mutables criticos.
- AuthZ debe crecer de RBAC simple a policies por accion/tenant cuando el dominio lo requiera.
- RDS Proxy, Aurora Serverless o pool tuning deben decidirse con metricas reales de concurrencia, no por moda.
- Outbox/inbox/event replay esta documentado, pero falta implementarlo cuando existan eventos de negocio reales.
- FinOps existe en docs; falta IaC/politica de budgets, anomaly detection y log retention por cuenta/stage.
- DR esta documentado; falta restore drill ejecutado y evidencia.
- Threat model debe ser gate obligatorio para cambios sensibles: auth, uploads, IA, CDK, S3, SQS/SNS, secrets y datos personales.
- `bus-impl` todavia mantiene workflows locales extensos aunque el hub ya ofrece reusable workflows;
  la migracion requiere paridad demostrada antes de retirar YAML.

## Mejoras Prioridad Alta

1. Implementar correlation id middleware/interceptor y propagarlo a logs, errors, DB calls, AWS SDK y responses.
2. Agregar dashboards CloudWatch/SLO como CDK: latencia p95/p99, 5xx, DB connections, throttling, Bedrock latency/cost y S3 errors.
3. Implementar rate limiting por IP/usuario/tenant para endpoints publicos o sensibles.
4. Implementar idempotency key para `store/update` criticos que puedan duplicar dinero, polizas, uploads o eventos.
5. Versionar OpenAPI por release y publicar artefacto consumible por MFE.
6. Convertir threat model en checklist obligatorio de PR para cambios de alto riesgo.
7. Agregar budgets/anomaly detection y retention CloudWatch como IaC.
8. Ejecutar restore drill documentado para PostgreSQL y S3.

## Mejoras Prioridad Media

- Agregar contract tests de eventos cuando exista outbox/SQS/SNS/EventBridge real.
- Agregar pruebas de redaction para asegurar que tokens, passwords, refresh tokens y PII no salen en logs.
- Agregar DAST contra staging si la API queda publica.
- Agregar k6/NBOMber o smoke de performance para rutas criticas antes de production.
- Documentar runbooks por alarma: DB down, 5xx spike, Bedrock throttling, S3 upload failures, queue DLQ.
- Decidir RDS Proxy solo si metricas de pool/concurrencia lo justifican.

## Mejoras Prioridad Baja

- Agregar feature flags backend solo si hay rollout gradual de reglas riesgosas.
- Agregar multi-region solo si RTO/RPO del negocio lo exige.
- Agregar tracing distribuido completo cuando haya varios servicios o workers reales.
- Agregar policy-as-code mas estricta si el equipo ya puede operar excepciones sin bloquearse.

## Reglas Para No Sobreingenierizar

- No meter cache sin metrica de lectura repetida, latencia o costo.
- No usar eventos para un CRUD simple que puede resolverse transaccionalmente.
- No meter RDS Proxy por defecto; primero medir conexiones.
- No ejecutar e2e completo en cada PR si el cambio es docs-only o unit-only; usar CI por impacto.
- No usar seeders para datos productivos sensibles.
- No poner secretos en `.env.example`, logs, cache ni fixtures.
- No promover a production un artefacto distinto al que paso preflight.

## Definition Of Done 10/10

`bus-impl` llega a 10/10 cuando:

- observabilidad esta implementada en CDK con dashboards, alarms y runbooks;
- correlation id viaja de HTTP a logs, DB y AWS SDK;
- OpenAPI queda versionado y consumible por clientes;
- rate limit e idempotency existen en endpoints criticos;
- threat model es obligatorio para cambios sensibles;
- restore drill y rollback estan probados, no solo documentados;
- FinOps tiene budgets/anomaly detection aplicados;
- eventos usan outbox/inbox cuando el dominio lo necesite;
- production despliega con approval, smoke, rollback y evidencia.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../../../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Roadmap 10/10 Production Ready - `bus-impl`

✅ **Correcto:** Para **Roadmap 10/10 Production Ready - `bus-impl`**, ligar alertas a SLI/SLO y pruebas de recuperación verificables.

❌ **Incorrecto:** En **Roadmap 10/10 Production Ready - `bus-impl`**, declarar recuperabilidad porque existe un backup que nunca se restauró.
