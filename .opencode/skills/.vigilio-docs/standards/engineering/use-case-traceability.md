# Trazabilidad proporcional de casos de uso — Vigilio Senior/Staff 2026

**Estado:** norma canónica. **Owner:** `standards/engineering/`. **Origen:** se rescata el vínculo negocio → persistencia → HTTP → UI → verificación del Master histórico, sin sus nombres CRUD heredados ni su fábrica documental obligatoria.

## Principio

Un caso de uso **expresa intención de negocio**, no un verbo SQL/HTTP ni una clase por cada operación. No exigir `class.md`, `business.md`, `pages.md`, `events.md` y `endpoints.md` por cada CRUD sencillo: exigir **capacidad de demostrar** qué invariante y qué consumidor quedan afectados. Las reglas pequeñas viven en código, tests y contrato canónico; el riesgo alto justifica OpenSpec/ADR y trazabilidad explícita.

### Nombres por intención

| No generar como convención nueva | Preferir según dominio |
|---|---|
| `products-index`, `ProductIndexService` | `listProducts` |
| `products-store`, `ProductStoreDto` | `registerProduct`, `RegisterProductRequestSchema` |
| `policies-show` | `getPolicy` o `getPolicyDetails` |
| `endorsements-update` | `changeEndorsementDetails` o `approveEndorsement` según regla |
| `destroy` genérico | `cancelEndorsement`, `archiveProduct` o eliminación real según contrato |

Un endpoint **publicado** heredado no se renombra en masa: contrato/versionado, compatibilidad y consumidores primero. La semántica externa se rige por [REST](../api/rest-endpoint-design.md) y [contratos HTTP](../api/http-dtos-and-contracts.md).

## Cuánta documentación corresponde

| Riesgo/alcance | Evidencia mínima | Artefactos adicionales solo si aportan |
|---|---|---|
| Campo simple, sin cambio de contrato | Test de comportamiento + diff + review | Ninguno |
| Feature normal con frontend/backend | Intención, aceptación, contrato real, tests y consumidores | OpenSpec breve y vista del flujo |
| Auth, dinero, tenant, concurrencia, DB destructiva | Invariantes, permisos, fallos, transaction boundary, migración, gates negativos | ADR, threat model, rollout/rollback |
| Capacidad entre repositorios | Owners, versión de contratos, rollout por consumidor, evidencia separada | Matriz federada de releases |

El proceso **no** crea documentos para simular trabajo completo. No inventar módulos, tablas ni permisos que el repositorio no contiene.

## Plantilla compacta de trazabilidad (solo si se justifica)

```yaml
capability: registerRrllEndorsement
owner: endorsements
intent: registrar un endoso a una póliza vigente dentro del tenant autorizado
actors: [policy-operator]
preconditions: [authenticated, policy-visible-and-eligible]
invariants:
  - unique-number-per-policy-and-tenant
  - no-cross-tenant-policy-reference
  - initial-status-is-draft
interfaces:
  http_operation_id: registerRrllEndorsement
  method_route: POST /rrll-endorsements
  # esquema Zod real enlazado, no duplicado aquí
persistence: [rrll_endorsements, policies]
side_effects: [] # solo añadir outbox si hay consumidor/evento real
verification: [contract, authorization-negative, fk-tenant, unique-race, integration]
```

Es **ejemplo de producto**, no contrato empresarial de RRLL universal; vigencia de póliza, estado inicial, unicidad y permisos deben confirmarse contra reglas del consumidor. Los IDs `UC-*`, `BR-*`, `EP-*`, `SEC-*`, `OBS-*` pueden ayudar en proyectos regulados, pero **no son obligatorios** si nombres/rutas/tests permiten rastrear sin ambigüedad.

## Las seis preguntas que evitan implementaciones ingenuas

1. **Ownership:** ¿quién puede cambiar esta regla? ¿el módulo escribe tablas que no posee?
2. **Invariantes y estados:** ¿qué transición es legal? ¿quién decide si una póliza puede recibir un endoso?
3. **Concurrencia:** ¿`exists()` seguido de `insert()` puede correr dos veces? ¿qué `UNIQUE`, CAS/version, lock o idempotency key evita el doble efecto?
4. **Datos:** ¿qué FK, nullability, snapshot, precisión `numeric` para dinero, retención y migración debe existir realmente?
5. **Consumidores:** ¿quién consume HTTP, evento, columna, job, frontend/mobile? ¿qué se rompe en despliegues escalonados?
6. **Verificación:** ¿qué test negativo demuestra reglas de permisos, tenant y error? ¿qué evidencia falta?

No convertir las preguntas en formulario para todo: el agente inspecciona el repositorio y **solo pregunta al usuario decisiones irreductibles**.

## Fallos, transacciones y autorización

- Validar los límites HTTP con DTOs/schemas del contrato; **Domain** protege reglas de negocio; **Infrastructure/DB** asegura restricciones y atomicidad. Una capa no sustituye las otras.
- El `tenant_id` procede del contexto autenticado; filtrar tanto lectura como escritura y proteger referencias compuestas por tenant donde se necesita integridad.
- Para actualizar estado, considerar control optimista `WHERE version = expected_version` o locking transaccional; `affected_rows=0` debe mapearse correctamente, no sobrescribirse.
- Notificaciones externas no participan automáticamente en la transacción PostgreSQL. Usar outbox **si existe un consumidor asíncrono y una necesidad real de entrega**; nunca introducirlo solo por cumplir una plantilla.
- No exigir Presenter en CRUD trivial: proyectar respuesta en HTTP/DTO; Presenter aparte únicamente ante mapeo sustancial o reutilizable.
- HTTP `count/next/previous/results` pertenece al contrato HTTP; **Repository** devuelve datos paginados, no URLs de navegación.

## Matriz de impacto antes de editar

| Cambia | Investigar además | Gate |
|---|---|---|
| Campo Zod / HTTP | Controllers, servicios, OpenAPI, tests, frontend/mobile, clientes externos | Contract diff + consumidor |
| Columna / FK / tipo SQL | Drizzle/Eloquent, migraciones, seeders, jobs, lecturas, exportadores | PostgreSQL real + integridad + rollout |
| Permiso / auth | Guards/policies, consultas tenant, rutas protegidas, UI, jobs | AuthZ/BOLA negativo |
| Evento | Publisher, consumidores, schema/versiones, dedup/retry | Contract + idempotencia |
| Regla monetaria | Decimal exacto, redondeo, snapshot, casos límite | Tabla de casos y reconciliación |

## UI/page contract solo cuando hay pantalla

La pantalla describe: ruta y permisos; origen de datos y estado de loading/empty/error/success; formulario, validación y deshabilitación durante submit; accesibilidad de error/foco/teclado; navegación; respuesta a reintentos; y al menos pruebas críticas. No imponer React Hook Form si el stack instalado no lo usa. Ver [golden path web](../../stacks/frontend/web-mfe/features/6-golden-path-feature-componentes-hooks.md).

## Ejemplo de aceptación y prueba negativa

```gherkin
Scenario: No registrar endoso en póliza de otro tenant
  Given un operador autenticado en el tenant A
  And una póliza válida que pertenece al tenant B
  When intenta registrar un endoso RRLL asociado a esa póliza
  Then se rechaza la operación según la política HTTP del producto
  And no existe un nuevo endoso para esa póliza
  And no se publican efectos externos
```

**No fijar** 403 vs 404 sin consultar política anti-enumeración del servicio. En tests de base de datos comprobar, además, que la FK compuesta rechaza la referencia cruzada cuando exista.

## Evidencia de finalización por caso de uso

```text
Contexto inspeccionado       rutas/commits realmente abiertos
Skill/es realmente leídas    SKILL.md + referencias aplicables
Normas canónicas leídas      URLs/rutas concretas
Contratos y consumidores     lista verificada y diferencias
Checks                        PASS | FAIL | BLOCKED | NOT_RUN
Revisión independiente       hallazgos y estado; solo lectura
Rollout/rollback             cuando haya riesgo operativo
Riesgo residual              explícito, no ocultado por score
```

✅ **Correcto:** «Registré el endoso», con invariantes, FK/UNIQUE, contrato, pruebas y evidencia proporcional.

❌ **Incorrecto:** «Generé siete documentos y un CRUD store/show; por eso está terminado».

**Relacionados:** [análisis de impacto](change-impact-and-review-gates.md), [polimorfismo](../data/polymorphic-relations.md), [migraciones](../data/migrations-and-backups.md), [orquestación](../ai/skill-orchestration-policy.md).
