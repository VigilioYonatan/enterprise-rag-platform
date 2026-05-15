# Planes de ejecución, dependencias y locks verificables — Vigilio 2026

**Estado:** especificación de arquitectura **TARGET**, no prueba de un runner productivo. **Owner:** `platform-runtime/`. **Origen:** se rescata la distinción Prompt Builder ≠ Execution Runner y la máquina de estados del Master Software Factory histórico. **Scope:** features de complejidad media/alta y cambios federados; no imponer un DAG persistido a un CRUD trivial.

## Inventario CURRENT / TARGET / GAP

| Capacidad | Situación comprobable en el paquete Docs+Skills | Estado |
|---|---|---|
| Skill `vigilio-auto-senior`, catálogos y routing de recomendaciones | Skill/rutas/scripts offline distribuidos | CURRENT (capacidad local limitada) |
| Carga efectiva de otras skills dentro del modelo | Depende del host; leer logs/trazas reales | GAP hasta E2E del agente |
| Prompt Builder que compile packs y locks verificables | Master histórico describía diseño; no se certifica implementación en este paquete | TARGET |
| Execution Runner con transiciones persistentes/reanudación | Necesita código, adapters, tests y evidencia en runtime externo | TARGET |
| PR required checks / production gate | Requiere reglas en los repositorios consumidores | GAP operativo |
| Plan y estados definidos aquí | Documento disponible para guiar implementación | SPEC, **no** ejecución |

No confundir «script de routing emitió `PROPOSED_NOT_LOADED`» con «skill leída». No prometer «una orden = producto en producción» con solo este documento. **Requisitos del proyecto consumidor** y versión real del agente prevalecen al decidir implementación.

## Casos que justifican un plan persistente

Activar cuando hay varios repositorios/consumidores, contratos incompatibles, migración gradual de DB, pasos potencialmente destructivos, autoría paralela o tareas largas reanudables. Un pequeño cambio local puede utilizar checklist efímero y evidencia de tests sin overhead. El usuario sigue pudiendo pedir cualquier feature **sin nombrar la skill** si el host carga sus instrucciones persistentes.

## Contratos mínimos de un plan

Cada plan registra explícitamente *qué* debe hacerse, *sobre qué* puede escribir y *cómo* se demuestra el resultado:

```json
{
  "schema_version": 1,
  "plan_id": "endorsement-rrll-001",
  "revision": 1,
  "objective": "Registrar endosos RRLL conservando contrato y tenant",
  "base": { "repo": "backend", "commit": "<git-sha-real>" },
  "steps": [
    { "id": "schema", "kind": "migration", "depends_on": [],
      "allowed_paths": ["src/modules/endorsements/**", "drizzle/**"],
      "forbidden_paths": ["src/modules/payments/**"],
      "gates": ["postgres-migration", "tenant-fk", "migration-review"] },
    { "id": "api", "kind": "feature", "depends_on": ["schema"],
      "allowed_paths": ["src/modules/endorsements/**", "tests/**"],
      "gates": ["typecheck", "contract", "authz", "review"] }
  ]
}
```

Los valores ficticios (`<git-sha-real>`) no deben copiarse como evidencia. `depends_on` **ordena ejecución**, mientras `inherits` solo comparte referencias/estándares; confundirlos puede crear ciclos o saltar gates. El DAG debe ser acíclico y toda dependencia debe apuntar a un paso existente. Los scopes de rutas no sustituyen `git diff --name-only` ni verificaciones contra paths simbólicos.

## Context lock: procedencia de cada input material

El **lock conceptual** incluye identificador del repositorio/commit, reglas/ADR/OpenSpec relevantes, hashes SHA-256 de cada fuente cargada, descripción y versión real de la skill, lockfile de dependencias, versión de contratos y outputs previos que constituyen precondiciones. **No** guardar secretos, tokens, payloads PII ni dumps de DB; un hash no convierte información sensible en inocua si el paquete conserva el original en claro.

```json
{
  "step_id": "api",
  "plan_revision": 1,
  "git_head": "<verified-sha>",
  "sources": [
    { "path": "docs/rules/endorsements.md", "sha256": "<computed-hash>" },
    { "path": "contracts/openapi.yaml", "sha256": "<computed-hash>" },
    { "path": "skills/node-nest-build-feature/SKILL.md", "sha256": "<computed-hash>" }
  ],
  "skills_loaded": ["node-nest-build-feature"],
  "resolved_dependencies": ["@nestjs/core@<installed-version>"],
  "created_from": "real-agent-read-trace"
}
```

Validación: normalizar rutas **dentro del workspace autorizado** y comparar contenido real contra lock antes de ejecutar cada fase; verificar también que la traza de lectura proviene del host, no de un texto autodeclarado. Si falta el soporte de trazas, registrar `NOT_VERIFIED`. Los hashes solo demuestran bytes, no validez arquitectónica ni compatibilidad.

## Máquina de estados y garantías de transición

```text
PENDING ──(deps+lock+authority OK)──> READY ──(claim)──> RUNNING
    │                                  │                   │
    └──> BLOCKED_BY_DEPENDENCIES       └──> STALE         ├──> VERIFYING
                                                        │      ├──> REVIEWING ──> COMPLETE
                                                        │      └──> QUALITY_FAILED ──> FIXING
                                                        └──> NEEDS_HUMAN_REVIEW
```

Estados adicionales permitidos: `INVALIDATED`, `CANCELLED`; la fase de producción es separada. **Solo** `COMPLETE` desbloquea consumidores cuando todos los gates obligatorios están `PASS`, la revisión no contiene hallazgos bloqueantes y existen artefactos evidenciales. `BUILD_COMPLETE` **no** implica `PRODUCTION_HEALTHY`.

### Reglas de transición importantes

- `RUNNING` solo con `READY`, dependencias completas, autoridad y contexto vigente.
- Si cambian contrato, OpenSpec, esquema, ADR o permisos materiales, el step y su subgrafo dependiente pasan a `STALE`/`INVALIDATED`; no continuar con inputs anteriores.
- `QUALITY_FAILED` no se disfraza de warning ni permite desbloquear dependientes. `FIXING` modifica solo el scope autorizado y **retorna a VERIFY/REVIEW**.
- `REVIEWING` es lectura pura; los cambios se hacen en otra fase y repiten gates afectados.
- Reintentos limitados y clasificados por causa: un error de red/transitorio puede repetirse con backoff; un error de negocio, corrupción de datos o autorización requiere aclaración o reparación, no retry ciego.
- Una operación externa (migración, publicación, borrado, despliegue) exige idempotencia o comprobación del efecto anterior para evitar doble ejecución al reanudar.

## Reanudación y replan incremental

1. Capturar evento con `run_id`, `step_id`, estado anterior/nuevo, motivo, revisión, timestamp UTC y enlace/hash a la evidencia.
2. En cada reanudación, recargar plan y verificar locks, commit y scopes antes de escribir.
3. Si cambia una entrada material, crear una nueva `plan_revision`; conservar historia inmutable y marcar únicamente los pasos afectados y consumidores transitivos.
4. Reusar un step `COMPLETE` solo si inputs, outputs, contrato y hashes **siguen siendo válidos**. El criterio no es «su test pasó ayer».
5. No borrar logs/evidencia anterior por regenerar prompts. Los resultados `NOT_RUN`, `BLOCKED` y `FAIL` mantienen sus estados.

**Ejemplo:** se añade `organization_id` a la identidad del usuario mientras un frontend consume login. Auth, contratos y UI dependientes requieren evaluación; la migración de pagos no se invalida por intuición si no existe relación real. La herramienta declara **impacto confirmado** frente a **impacto por investigar**.

## Paralelismo seguro

Dos steps en el mismo nivel del DAG **no** son automáticamente independientes. Requieren deps completas, scopes de escritura no superpuestos (tras normalizar paths/symlinks), ausencia de migration locks compartidos, ausencia de contratos o OpenSpec escritos en común, y política de conflictos entre repositorios. Si no se puede demostrar, serializar.

Para DB: solo un migrador autorizado por ambiente o lock global verificable; los workers no aplican DDL concurrentemente por «startup». Para repositorios federados, coordinar versiones de contrato, desplegar backend backward-compatible y luego actualizar consumidores; no inventar transacción distribuida entre GitHub, DB y clientes.

## Evidencia mínima por step

```json
{
  "run_id": "<actual-run>", "step_id": "api", "result": "BLOCKED",
  "source_lock": "<sha256>",
  "diff": { "base": "<base>", "head": "<head>" },
  "checks": {
    "typecheck": { "status": "PASS", "command": "<actual-command>", "exit_code": 0 },
    "contract": { "status": "NOT_RUN", "reason": "missing-consumer-contract" },
    "review": { "status": "BLOCKED", "reason": "missing-contract-evidence" }
  },
  "review_findings": [], "approved_for_production": false
}
```

Todos los campos de comandos, SHAs y outputs deben provenir de invocaciones reales y timestamped. No tratar este JSON de ejemplo como evidencia generada.

## Gates de aceptación para construir un Runner real

| Evaluación ejecutable | Debe demostrar |
|---|---|
| DAG con ciclos o dependencia inexistente | Rechazo antes de escrituras |
| Source lock cambia después del PLAN | Step `STALE` sin ejecución de comandos |
| Step bloqueado con dependiente | Nunca desbloquear por existencia del commit |
| Scope prohibido/symlink escapando workspace | Rechazar escritura |
| Reintento de migración/acción externa | No repite side effect |
| Dos workers en step concurrente | Claim atómico o solo uno ejecuta |
| Fallo de contrato con frontend pendiente | No se publica estado COMPLETE |
| Reinicio con estado previo | Timeline consistente, sin doble ejecución |
| Host no ofrece traza de lectura de skill | No afirmar que se cargó: `NOT_VERIFIED` |
| Producción no desplegada | BUILD_COMPLETE posible, PRODUCTION_HEALTHY no |

**Implementación obligatoria antes de anunciar el Runner como CURRENT:** código real, storage transaccional de estado, atomicidad de claims, adaptadores agent/CI, tests negativos, manejo de secrets, límites de permisos, telemetry y responsable de operación. Ver [trazabilidad de capacidades](3-capability-traceability.md) y [orquestación](../standards/ai/skill-orchestration-policy.md).

✅ **Correcto:** especificar máquina de estados e indicadores falsables, mantener TARGET hasta demostrar un runner.

❌ **Incorrecto:** decir «Auto-Senior ejecuta un DAG persistente» porque existe una guía Markdown o un router heurístico.
