# Matriz De Trazabilidad De Capacidades

## Propósito

Relaciona decisiones, implementación, ejecución y evidencia.

Evita duplicar reglas entre documentación, OpenSpec y skills.

## Matriz

| Campo | Significado |
|---|---|
| `capability` | Identificador estable |
| `canonical_doc` | Decisión y reglas vigentes |
| `implementation` | Código o configuración ejecutable |
| `openspec` | Cambio o delta activo |
| `skill` | Procedimiento reutilizable |
| `status` | adopted, optional, planned o rejected |
| `version` | Versión o SHA verificado |
| `owner` | Equipo responsable |
| `evidence` | Test, pipeline, dashboard o despliegue |

## Ejemplo Correcto

```yaml
capability: async.order-events
canonical_doc: stacks/backend/nestjs/messaging/references/45-workers-outbox-sqs.md
implementation: apps/bus-impl-v2/src/outbox
openspec: openspec/changes/add-compact-ecommerce
skill: node-nest-async-workers
status: adopted
version: 2026.6.0
owner: backend-platform
evidence: pnpm verify:all
```

## Ejemplo Incorrecto

```yaml
capability: observability
tools: everything
status: done
```

## Reglas

- Mantén lógica estable en documentación canónica.
- Mantén deltas temporales en OpenSpec.
- Mantén ejecución repetible en skills y tooling.
- Mantén evidencia en código, pruebas y pipelines.
- Actualiza la matriz durante el mismo cambio.
- No marques `adopted` sin evidencia.
- No copies lógica de negocio hacia skills compartidas.
- Fija versiones o SHAs verificables.
- Declara propietario y fecha de revisión.

## Revisión De Drift

- Detecta rutas inexistentes.
- Detecta skills no publicadas.
- Detecta OpenSpec archivado todavía referenciado.
- Detecta versiones incompatibles.
- Detecta capacidades sin propietario.
- Detecta estados sin evidencia.

> Fuente única para **Correcto / Incorrecto: revisión 2026**: [abrir documento canónico](../governance/documentation-dry-and-ownership.md).

### ✅ Correcto / ❌ Incorrecto — Matriz De Trazabilidad De Capacidades

✅ **Correcto:** Para **Matriz De Trazabilidad De Capacidades**, separar configuración y secretos por ambiente, probar arranque y healthchecks.

❌ **Incorrecto:** En **Matriz De Trazabilidad De Capacidades**, hardcodear secretos o prometer despliegue sin pruebas en runtime.
