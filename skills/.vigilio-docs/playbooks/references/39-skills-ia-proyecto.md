# Skills IA del Proyecto

La fuente editable de skills vive en `vigilio-platform-actions/skills/`. Los proyectos consumidores
reciben copias gestionadas por `@vigilioyonatan/vigilio-skills`.

Destinos:

```text
.opencode/skills/ -> OpenCode
.agents/skills/   -> Codex y runtimes compatibles
```

No se editan manualmente las copias sincronizadas. El manifest SHA-256 permite detectar conflictos
y retirar solamente archivos previamente gestionados por el paquete.

## Jerarquia de fuentes

Cuando una skill trabaja sobre un proyecto:

1. lee codigo, tests, CDK, configuracion y workflows ejecutables;
2. aplica policies, actions, CLIs y tooling ejecutable de `vigilio-platform-actions`;
3. lee las practicas, decisiones y ejemplos canonicos de `vigilio-docs` enlazados por la skill;
4. usa la skill como adaptador de seleccion, secuencia y gates, no como copia de esas practicas;
5. si hay contradiccion, reporta y alinea la documentacion con la implementacion verificada.

Las skills no operan solamente sobre `docs/`.

## Perfiles actuales

### `core`

- `shared-technologies`
- `commit-ai-change`
- `coderabbit-compliance`
- `codebase-context-efficiency`
- `diagnosing-bugs`
- `grill-me`
- `improve-codebase-architecture`
- `architecture-traceability`
- `review-code-change`
- `token-context-compression`

### `node-nest`

- `backend-engineering-quality`
- `node-nest-technologies`
- `node-nest-build-feature`
- `node-nest-realtime`
- `node-nest-async-workers`
- `node-nest-persistence`
- `node-nest-security-aws`
- `platform-observability-sre`
- `node-nest-testing`

`backend-engineering-quality` enlaza las guias transversales de contratos, testing por riesgo y SQL;
las skills Node/Nest resuelven implementacion, librerias y comandos concretos. Observabilidad, Pino,
CloudWatch, SLO y runbooks se cubren con `platform-observability-sre`, `node-nest-security-aws` y
`node-nest-testing`. No se documentan skills que no existan en el perfil fuente validado.

### `openspec`

- `openspec-explore`
- `openspec-propose`
- `openspec-apply-change`
- `openspec-update-change`
- `openspec-sync-specs`
- `openspec-archive-change`

El perfil fuente actual se obtiene de `skill-profiles.json` en `vigilio-platform-actions`; no duplicar
en este documento una version de paquete o cantidad de skills que pueda quedar obsoleta. Cada release
actualiza primero la fuente, luego el paquete y finalmente los consumidores mediante `skills:sync`.

## Sincronizacion

En `bus-impl`:

```bash
pnpm skills:sync
pnpm skills:check
```

Equivalente explicito:

```bash
pnpm exec vigilio-skills sync --profile core --profile node-nest --profile openspec
pnpm exec vigilio-skills sync --target .agents/skills --profile core --profile node-nest --profile openspec
pnpm exec vigilio-skills check --profile core --profile node-nest --profile openspec
pnpm exec vigilio-skills check --target .agents/skills --profile core --profile node-nest --profile openspec
```

La instalacion del paquete no escribe en el consumidor. La sincronizacion siempre es explicita.

## Uso diario

Ejemplos:

```text
Usa $node-nest-build-feature para agregar un caso de uso protegido.
Usa $node-nest-build-feature + $node-nest-testing para evolucionar DTOs y OpenAPI sin romper consumidores.
Usa $node-nest-security-aws + $node-nest-testing para instrumentar logs, CloudWatch, SLO, alertas y runbooks.
Usa $node-nest-persistence para revisar transaccion, constraints y cache-aside.
Usa $node-nest-testing para cubrir un bug con unit, integration y E2E por riesgo.
Usa $node-nest-security-aws para revisar JWT, IAM, secretos y CDK.
Usa $openspec-propose para preparar un cambio antes de implementarlo.
```

El nombre de negocio es intercambiable. `product`, `renovacion`, `product` o `user` pueden aparecer
en ejemplos; la skill aplica el patron al modulo real del proyecto.

## Cobertura

- DDD pragmatico y capas proporcionales;
- Zod, DTOs request/response y OpenAPI;
- repository ports, Drizzle, PostgreSQL y migraciones;
- cache-aside, idempotencia, outbox e inbox;
- unit, integration, BDD, Playwright, contratos y quality gates;
- AuthN/AuthZ, secretos, IAM, AWS, CDK y observabilidad;
- OpenSpec para propuesta, aplicacion, sincronizacion y archivo de cambios;
- reduccion de logs y contexto sin perder la fuente original.

## Mantenimiento

- cambiar primero codigo/tests o ADR cuando cambia comportamiento o arquitectura;
- actualizar `vigilio-docs` una sola vez cuando cambia una practica o ejemplo reutilizable;
- actualizar la skill solo si cambia routing, secuencia, limites operativos o gates;
- enlazar la fuente canonica y evitar copiar su contenido dentro de la skill;
- publicar una version nueva de `@vigilioyonatan/vigilio-skills`;
- actualizar la version exacta en consumidores;
- ejecutar `pnpm skills:sync` y `pnpm skills:check`;
- no usar junctions o symlinks como mecanismo de produccion;
- no usar `--force` sin revisar previamente el conflicto.

## ✅ Correcto / ❌ Incorrecto: revisión 2026

- ✅ **Correcto:** Leer contexto real, seguir normas canónicas y documentar precondiciones, ejemplos, contraejemplos y verificación.
- ❌ **Incorrecto:** Copiar snippets sin imports, asumir versiones instaladas o declarar pruebas `PASS` sin ejecutarlas.
- **Al recibir código existente:** primero caracterizar el comportamiento, después refactorizar en pasos comprobables. [Guía canónica de modernización](../../standards/engineering/refactoring-existing-code.md).

> **Referencia histórica completa, migrada sin recortes de contenido técnico.** La norma vigente corresponde a `foundations/` y `standards/`; las especializaciones NestJS están en `stacks/backend/nestjs/`. Ante contradicciones, seguir documentación canónica y pruebas del proyecto. Los enlaces relativos se actualizaron para mantener la navegación.

✅ **Correcto:** aplicar la normativa compartida y adaptar estos ejemplos tras comprobar versiones.

❌ **Incorrecto:** copiar ciegamente un fragmento histórico o imponer reglas de NestJS a Laravel.
