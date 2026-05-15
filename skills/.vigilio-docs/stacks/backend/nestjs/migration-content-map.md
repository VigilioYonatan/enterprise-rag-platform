# Correspondencia documental de NestJS — migración por responsabilidad

**Estado:** migración física finalizada. No existe la carpeta `backend-node-nest/` en la distribución activa. Cada capítulo fue reubicado por **responsabilidad** sin resumir sus ejemplos, procedimientos o explicaciones. Los enlaces relativos internos se reescribieron para la nueva ubicación; el contenido técnico se conservó. Los SHA-256 siguientes identifican el archivo original *anterior* a adaptar sus enlaces y adjuntar el aviso de referencia histórica.

- **Normas reutilizables:** `foundations/`, `standards/`, `technology/` y `platform/` son la referencia normativa que comparte Laravel.
- **Implementaciones de NestJS:** `stacks/backend/nestjs/` contiene controllers, DTOs Zod, services semánticos, Drizzle, Valkey, seguridad, observabilidad y testing.
- **Referencias completas:** las carpetas `references/` distribuyen los capítulos anteriores en el área responsable. No son otra fuente de política vigente.
- **Compatibilidad:** los enlaces y skills consumen las nuevas rutas; no se mantiene una carpeta antigua vacía.

✅ **Correcto:** aplicar primero estándares compartidos y después ejemplos específicos de NestJS; migrar código legado con pruebas de regresión.

❌ **Incorrecto:** borrar capítulos porque su título suena repetitivo o considerar que un índice de 20 líneas sustituye un manual de cientos de líneas.

## Inventario verificable

| Capítulo de origen | Ruta final con contenido íntegro | SHA-256 de origen |
|---|---|---|
| `1-estructura-archivos.md` | [stacks/backend/nestjs/architecture/references/1-estructura-archivos.md](architecture/references/1-estructura-archivos.md) | `7cbc0d555eb3922741d0c73c7364f09d1f73167d077f4b58a19df5c5d46c8615` |
| `10-optimizacion-costos-recursos-aws.md` | [platform/aws/references/10-optimizacion-costos-recursos-aws.md](../../../platform/aws/references/10-optimizacion-costos-recursos-aws.md) | `7b36ae0038e77df1e624a264ac1858374beaee10fbf5a46fee2a6fa4ca4d3567` |
| `11-logging-pino.md` | [stacks/backend/nestjs/runtime/references/11-logging-pino.md](runtime/references/11-logging-pino.md) | `381acb5a6db518e4f27b5a96a58f0ca219e4a748b46a0f1a35eb69be7c033c2e` |
| `12-authz-security.md` | [stacks/backend/nestjs/security/references/12-authz-security.md](security/references/12-authz-security.md) | `c2086e917755903016e93c1bc342775152c60e9c92cbd32d647c65b217df27fb` |
| `13-data-governance.md` | [standards/data/references/13-data-governance.md](../../../standards/data/references/13-data-governance.md) | `7fab9ebf0d8db44d4d8411b33fe4118f543e2491a2447dcb7206a1e32ae7bb3b` |
| `14-resilience-events.md` | [standards/messaging/references/14-resilience-events.md](../../../standards/messaging/references/14-resilience-events.md) | `c72dee8594e7d8b06fdf46488ec7acd2a9cbdcc119dafe70d6c8d4999488db5d` |
| `15-migrations-db.md` | [stacks/backend/nestjs/persistence/references/15-migrations-db.md](persistence/references/15-migrations-db.md) | `8a09ca668674339ae96a9e07c940a42dd15f63c635786e8ce9f6b8e95beaabd4` |
| `16-observability-slo.md` | [standards/observability/references/16-observability-slo.md](../../../standards/observability/references/16-observability-slo.md) | `934bdcb6b83a4b986a486bb086b60ba0ed1b4e02cd645365e7fec4dd913fa061` |
| `17-backup-restore-dr.md` | [standards/data/references/17-backup-restore-dr.md](../../../standards/data/references/17-backup-restore-dr.md) | `1b11f9d4f326c86cbeffd30374dab82bf9f79a04d30156b59d928f716ad270e4` |
| `18-adr-threat-model.md` | [platform/sre/references/18-adr-threat-model.md](../../../platform/sre/references/18-adr-threat-model.md) | `9a5da07c58c0bf9a395abecb6ea11179833ff47a3e3bcc1ce1b19a69553eeb31` |
| `19-evidencia-operacional.md` | [platform/sre/references/19-evidencia-operacional.md](../../../platform/sre/references/19-evidencia-operacional.md) | `31ec67618f7d9c89a0dc7748732f1e105cd8382dda7d8d295e91bd9b002b72ed` |
| `2-arquitectura.md` | [stacks/backend/nestjs/architecture/references/2-arquitectura.md](architecture/references/2-arquitectura.md) | `36a589c283a18a8a4f0dfb5be4ce9a79467a6ba41caa41623a8c4f714829f036` |
| `20-reglas-senior-codigo.md` | [stacks/backend/nestjs/quality/references/20-reglas-senior-codigo.md](quality/references/20-reglas-senior-codigo.md) | `8d14415832ca02336cc030b31a5f5da731038eb879153b8fb0cb98970cc94433` |
| `21-golden-path-feature.md` | [stacks/backend/nestjs/architecture/references/21-golden-path-feature.md](architecture/references/21-golden-path-feature.md) | `2623cce8f81bf4abec33de7b7c7a464234e996a274d7516d1578e929b116bd97` |
| `22-cucumber-bdd.md` | [standards/testing/references/22-cucumber-bdd.md](../../../standards/testing/references/22-cucumber-bdd.md) | `d594cd7126a69e6a33d1ca35ba1dca588c8a7938c0110333adbdb5cad18b5e4e` |
| `23-seguridad-hardening.md` | [stacks/backend/nestjs/security/references/23-seguridad-hardening.md](security/references/23-seguridad-hardening.md) | `9cc196984366278911c1990f92cc2cc348935b7bdd0bf34217ee96107b8b324c` |
| `24-roadmap-10-10.md` | [platform/sre/references/24-roadmap-10-10.md](../../../platform/sre/references/24-roadmap-10-10.md) | `c2e0a245b9aa344eb1a0f7053a6a2e2849c857222682c0e85dc208e6a3a2239e` |
| `25-cdk-iac-aws.md` | [platform/iac/references/25-cdk-iac-aws.md](../../../platform/iac/references/25-cdk-iac-aws.md) | `ffc353960c92e13a49e9ec324b7be0c03b5e73a466c5ecd14434e2ebfdd617cc` |
| `26-seeders-ddd.md` | [stacks/backend/nestjs/persistence/references/26-seeders-ddd.md](persistence/references/26-seeders-ddd.md) | `e65f4b45cd37a90374de725e9620185e095fc40f24423aedac48c5ae7a05315a` |
| `27-dtos-request-response.md` | [stacks/backend/nestjs/http/references/27-dtos-request-response.md](http/references/27-dtos-request-response.md) | `6abcc97494b3071d4dd91fa8b4d49ad25f54ec4288e9effda1bc682ae24800dc` |
| `28-cicd-aws-stages-observability.md` | [platform/cicd/references/28-cicd-aws-stages-observability.md](../../../platform/cicd/references/28-cicd-aws-stages-observability.md) | `b46031788b3ae5f2523ef59b8d318bef1bc1637e601959751871e0ccd6582217` |
| `29-config-nest-zod-aws.md` | [stacks/backend/nestjs/runtime/references/29-config-nest-zod-aws.md](runtime/references/29-config-nest-zod-aws.md) | `671652c2b0d19485a58b7aa160f4c34ecbf216d99c7a3d7de5abbef6ad33e230` |
| `3-ambientes-trabajo.md` | [platform/cicd/references/3-ambientes-trabajo.md](../../../platform/cicd/references/3-ambientes-trabajo.md) | `631bfc1e14ba6ae4464f6cc73e75556ad9a361c5c50d853cf24d77a7e32445cd` |
| `30-learn-aws-finops.md` | [platform/aws/references/30-learn-aws-finops.md](../../../platform/aws/references/30-learn-aws-finops.md) | `e47b9053943455cd68c5931e080c25d07c1e1b664ffa2339403a96adfb0ad7a7` |
| `31-ai-chat-bedrock-ddd.md` | [stacks/backend/nestjs/ai/references/31-ai-chat-bedrock-ddd.md](ai/references/31-ai-chat-bedrock-ddd.md) | `1413a7afc2b8dd63a42978f95aff40dbe758b69ced51d09682d8bb81b5593930` |
| `32-uploads-s3-presigned.md` | [stacks/backend/nestjs/http/references/32-uploads-s3-presigned.md](http/references/32-uploads-s3-presigned.md) | `dbd033d741e41269e48b6279e022847a9a207b9defb9e7c8c263d753379e964e` |
| `33-guia-github-jira-aws-cicd-2026.md` | [platform/cicd/references/33-guia-github-jira-aws-cicd-2026.md](../../../platform/cicd/references/33-guia-github-jira-aws-cicd-2026.md) | `9574d33030a346610cce38fcf4ac7dfefc07924a653875956efe553a3023ba6b` |
| `34-gestion-configuracion-hibrida-2026.md` | [stacks/backend/nestjs/runtime/references/34-gestion-configuracion-hibrida-2026.md](runtime/references/34-gestion-configuracion-hibrida-2026.md) | `fcedec2356520203e4b1dbd8d7c96bf4de1a5374d2b0ee50c219b8d5d728c224` |
| `35-versionamiento-basado-en-commits-2026.md` | [standards/engineering/references/35-versionamiento-basado-en-commits-2026.md](../../../standards/engineering/references/35-versionamiento-basado-en-commits-2026.md) | `5146be0d4a25e911398e2769628f34ebdfcffe61a7e45d89908c93b3b6086aef` |
| `36-deuda-tecnica.md` | [stacks/backend/nestjs/quality/references/36-deuda-tecnica.md](quality/references/36-deuda-tecnica.md) | `33acd6381a151842a43310eb67a2c3f3c99956eeda88b9cd6c2de6216370c191` |
| `37-cicd-jobs-resumen.md` | [platform/cicd/references/37-cicd-jobs-resumen.md](../../../platform/cicd/references/37-cicd-jobs-resumen.md) | `a114f5f3c58c57568e71aa67ca52b0f52d4ff71ef76e4ddb9c5ccea4644aaf55` |
| `38-estrategia-testing-2026.md` | [stacks/backend/nestjs/testing/references/38-estrategia-testing-2026.md](testing/references/38-estrategia-testing-2026.md) | `cce7e43789e5e06e58deba30ea86d76c5504e209fcbc0a1dc28a92b82e74aaa1` |
| `39-skills-ia-proyecto.md` | [playbooks/references/39-skills-ia-proyecto.md](../../../playbooks/references/39-skills-ia-proyecto.md) | `ade977dd0fcb677f84674d2da85d46979912c51ea31a054cf5a6f3cfac769184` |
| `4-devsecops.md` | [platform/cicd/references/4-devsecops.md](../../../platform/cicd/references/4-devsecops.md) | `49e1357654bd4bc8cae0870913d7f1431cbdea71245b0310dea6e6625c580bbe` |
| `40-operacion-produccion.md` | [stacks/backend/nestjs/runtime/references/40-operacion-produccion.md](runtime/references/40-operacion-produccion.md) | `cca43af9414db651dce3acf78ed2c9d5525e367adbf9809a5954c0b71f6e867b` |
| `41-dependabot-repository-policy.md` | [platform/cicd/references/41-dependabot-repository-policy.md](../../../platform/cicd/references/41-dependabot-repository-policy.md) | `f547a7c7bbf180717c9730800333bada378331cac515d5632a2b998fb0f9f17d` |
| `42-branching-release-flow-2026.md` | [platform/cicd/references/42-branching-release-flow-2026.md](../../../platform/cicd/references/42-branching-release-flow-2026.md) | `6b943e85c919da5d7f7e0e23e0117ab7ffbbf32effbcc29be87838dcbab4879e` |
| `43-backend-technologies-skill-2026.md` | [technology/catalog/references/43-backend-technologies-skill-2026.md](../../../technology/catalog/references/43-backend-technologies-skill-2026.md) | `a268db1431e9af185d835ed019985ff4a7c4faff01a9bd20ba32f86a5e305282` |
| `44-realtime-websocket-sse.md` | [stacks/backend/nestjs/messaging/references/44-realtime-websocket-sse.md](messaging/references/44-realtime-websocket-sse.md) | `f7552b744ddbdd05f0152e3fa72ff825fc0801c0121a4c8299a4fe6ef534ad7f` |
| `45-workers-outbox-sqs.md` | [stacks/backend/nestjs/messaging/references/45-workers-outbox-sqs.md](messaging/references/45-workers-outbox-sqs.md) | `c7dd5d47215269e33ab352508c608246caec19b08f41d36ff04cc530fdaff149` |
| `46-zod-query-ddd-versiones-2026.md` | [stacks/backend/nestjs/http/references/46-zod-query-ddd-versiones-2026.md](http/references/46-zod-query-ddd-versiones-2026.md) | `4beb2c8ab6b42ff5c818fa36efb22779f86bf6b1efe2e859780be8b799783695` |
| `5-buenas-practicas.md` | [stacks/backend/nestjs/quality/references/5-buenas-practicas.md](quality/references/5-buenas-practicas.md) | `6b1eb6bb8bedf801d696388005f6e1a7b2008d0df22ef6a775eb2c7409751bc0` |
| `6-ejemplos-codigo.md` | [stacks/backend/nestjs/http/references/6-ejemplos-codigo.md](http/references/6-ejemplos-codigo.md) | `2ff770432ba0af79f67a6119bdbf1b561754c2757e1392359e835616520eb6e0` |
| `7-pruebas-vitest-playwright.md` | [stacks/backend/nestjs/testing/references/7-pruebas-vitest-playwright.md](testing/references/7-pruebas-vitest-playwright.md) | `325fcbad5b827f3cab6063389fdadc522e21fdcc776440558cc80f80c64c1af6` |
| `8-bootstrap-http-workers.md` | [stacks/backend/nestjs/runtime/references/8-bootstrap-http-workers.md](runtime/references/8-bootstrap-http-workers.md) | `f5d1667718791c9eb4944054a28f5b8c38dc3aa5ca4e54977c4e8a670d4400a7` |
| `9-cache.md` | [stacks/backend/nestjs/persistence/references/9-cache.md](persistence/references/9-cache.md) | `3230453094a559a3befa469da611c7b3321c29c09eff27fb49fa74bf56d23cac` |
| `README.md` | [stacks/backend/nestjs/references/README.md](references/README.md) | `e9e6659e0f605b8c83ffae085f8543649a0b15176b9eb086416488a6bcdb968d` |
| `agent-stack-guide.md` | [stacks/backend/nestjs/references/agent-stack-guide.md](references/agent-stack-guide.md) | `b94a24ef03085e51eca376ea33e8152a05bd6ac1da6fbde03a2fdf9745dbd459` |
| `shared-technologies-skill-2026.md` | [technology/catalog/references/shared-technologies-skill-2026.md](../../../technology/catalog/references/shared-technologies-skill-2026.md) | `1846df793c05ff9bbd1dab82f56a2f376d3784a5fc98c623e5f559745e1dfef1` |

## Comprobación obligatoria

1. Confirmar que aparecen los 49 destinos anteriores y se puede navegar a ellos desde el menú.
2. Verificar cada par original/destino con el manifiesto de migración para detectar cambios que no sean enlaces o avisos de procedencia.
3. Ejecutar los validadores documentales, regenerar `_site/` y regenerar el snapshot `vigilio-skills/assets/docs/`.
4. Instalar las skills en un consumidor aislado y verificar sus enlaces y hashes.
5. No declarar pruebas de integración NestJS/Laravel realizadas si el proyecto de referencia y servicios no están disponibles.
