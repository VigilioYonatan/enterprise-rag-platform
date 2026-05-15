# Análisis de impacto, code review independiente y gates de PR — Vigilio 2026

**Owner:** `standards/engineering/`. **Estado:** norma propuesta; no confundir la plantilla con un gate activado en GitHub.

## Antes de cambiar

- Inspeccionar diff inicial (`git status`, base/head comprobados), imports, call sites, tests vecinos, contratos OpenAPI, eventos, consumidores web/mobile, esquemas y migraciones.
- Proteger cambios preexistentes y mantener el cambio mínimo; documentar riesgos y compatibilidad.
- No aceptar una revisión que solamente mire el archivo modificado sin comprobar consumidores pertinentes.

## Verificación independiente

1. Ejecutar checks deterministas pertinentes: formatter/linter, typecheck, unit/integration/E2E, OpenAPI diff, SAST, migraciones y smoke tests.
2. `review-code-change` lee la evidencia y el diff, no modifica fuentes; genera hallazgos con ubicación, causa, impacto, severidad y corrección mínima.
3. Reparar en fase `FIX` separada, repetir gates afectados y volver a `REVIEW`.
4. `APPROVE` solo con evidencia de todos los controles obligatorios. `REQUEST_CHANGES` con defectos corregibles. `BLOCK` con autoridad/evidencia crítica ausente o riesgo sin resolver.
5. El repositorio consumidor debe configurar **required status checks / branch protection / CODEOWNERS**. Una skill no obliga a revisiones de PR por sí sola.

## Matriz de riesgos

| Cambio | Controles imprescindibles |
|---|---|
| Auth o tenancy | pruebas de autorización negativas, BOLA/IDOR, protección sesiones/secretos |
| DTO / OpenAPI | diff de contrato y consumidores; request/response efectivas |
| SQL | aislamiento tenant, migración segura, índices solo con evidencia |
| Pagos / eventos | idempotencia, concurrencia, outbox cuando haga falta |
| Frontend | rutas, formularios, accesibilidad y consumidores API |
| Integraciones | timeouts, mocks/contracts, entorno preflight, secretos redactados |

Nunca atribuir un problema de rendimiento a una falta de índice sin plan real. No imponer límites de líneas, `toStrictEqual` o 1 test por archivo como dogmas universales. No automatizar un rechazo de PR basado únicamente en la opinión no determinista de un modelo.

✅ Correcto: PR externo que no usó Vigilio igual pasa por los checks y la skill de revisión. ❌ Incorrecto: marcar `PASS` porque el autor dice «lo probé».

## Integración del Master histórico modernizado

**Riesgos de datos estructurales:** al cambiar una relación polimórfica, inspeccionar si la FK desaparece, el `tenant_id` se verifica en DB, qué pasa en borrado, cuál es el dueño del contrato y si los consumidores están versionados. Ver [relaciones polimórficas](../data/polymorphic-relations.md).

**Trazabilidad por riesgo:** utilizar [matriz de casos de uso](use-case-traceability.md) para analizar negocio → API → SQL → UI → tests, sin imponer documentos por cada archivo. Un hallazgo de `review-code-change` se basa en diff y evidencia causal, no en que falta `class.md`.

**Cambio concurrente o de varios repositorios:** modelar contratos y dependencias; si se usa plan/reanudación, consultar [execution plans y locks](../../platform-runtime/5-execution-plans-and-context-locks.md). Mientras el runner sea TARGET, el CI real y CODEOWNERS mantienen la autoridad de merge.

**Gate anti-humo:** una revisión de migración con checks `NOT_RUN` no equivale a migración validada, aunque el `script` compila. Un `PASS` de backend no declara frontend `PASS`.
