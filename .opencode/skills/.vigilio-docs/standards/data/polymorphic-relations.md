# Relaciones polimórficas y modelado relacional seguro — Vigilio Senior/Staff 2026

**Estado:** estándar canónico. **Owner:** `standards/data/`. **Aplica a:** PostgreSQL, NestJS/Drizzle, Laravel/Eloquent y cambios de esquema que permitan asociar diferentes tipos de entidad a un registro. **Origen histórico:** capítulo de relaciones del Master Software Factory 2026, modernizado; el master ya no es autoridad activa.

## Decisión inicial: ¿hace falta polimorfismo?

Una relación de varios tipos de negocio no implica automáticamente `target_type + target_id`. **Primero** inspeccionar tablas existentes, ownership, bounded context, integridad, consultas, ciclo de vida y políticas tenant. **Después** escoger el patrón más simple que preserve invariantes verificables.

| Situación comprobada | Preferir | Integridad y coste |
|---|---|---|
| Un origen y un destino conocido | FK normal 1:N o 1:1 | FK nativa, simple, mejor default |
| Varios destinos con identidad y ciclo de vida realmente compartidos | Supertipo `resources`/`endorsements` + subtipos | FK única al supertipo; exige disciplina de ciclo de vida |
| Dos o tres tipos cerrados, sin supertipo coherente | FKs alternativas anulables + CHECK exactamente una | FK nativa por destino; crece al añadir tipos |
| Asociación N:M entre tipos del mismo dominio | Tabla pivote por relación, o pivote al supertipo | FKs reales, UNIQUE compuestas, mejor rastreo |
| Tipos extensibles no controlados, relación débil y posible inconsistencia aceptada | `target_type` + `target_id` **solo por excepción aprobada** | PostgreSQL no impone FK estándar hacia varias tablas; requiere controles compensatorios |
| Auditoría de recursos de múltiples dominios | Evento/snapshot de identidad opaca con contrato, no una pseudo-FK | Evitar acoplar escrituras de bounded contexts diferentes |

**Condición de arquitectura:** preferir polimorfismo *dentro del mismo bounded context con un owner inequívoco*. El contexto común no legitima una relación insegura: permisos, tenant, borrado e integridad siguen siendo obligatorios. Entre bounded contexts, utilizar contratos públicos y referencia opaca explícita cuando aplique; no escribir joins cruzados como dependencia privada permanente.

## Ejemplo 1 — FK normal, suficiente para endosos RRLL

Si cada documento pertenece exclusivamente a un endoso RRLL:

```sql
CREATE TABLE rrll_endorsement_documents (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  rrll_endorsement_id uuid NOT NULL,
  object_key text NOT NULL,
  UNIQUE (tenant_id, id),
  FOREIGN KEY (tenant_id, rrll_endorsement_id)
    REFERENCES rrll_endorsements (tenant_id, id)
);
```

**Precondición:** `rrll_endorsements` ya tiene `UNIQUE (tenant_id, id)` o clave compuesta referenciable. Escribir `tenant_id` sin FK compuesta deja abierta una referencia a un objeto de otro tenant si el repositorio comete un error.

## Ejemplo 2 — FKs alternativas con exclusividad garantizada

Cuando un adjunto pertenece a **uno y solo uno** de dos tipos conocidos del mismo contexto y no existe un supertipo válido:

```sql
CREATE TABLE endorsement_attachments (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  rrll_endorsement_id uuid NULL,
  vehicle_endorsement_id uuid NULL,
  object_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attachment_exactly_one_owner CHECK (
    num_nonnulls(rrll_endorsement_id, vehicle_endorsement_id) = 1
  ),
  CONSTRAINT attachment_rrll_tenant_fk
    FOREIGN KEY (tenant_id, rrll_endorsement_id)
      REFERENCES rrll_endorsements(tenant_id, id),
  CONSTRAINT attachment_vehicle_tenant_fk
    FOREIGN KEY (tenant_id, vehicle_endorsement_id)
      REFERENCES vehicle_endorsements(tenant_id, id)
);

-- Elegir índices observando patrones reales de lectura; no indexar todo.
CREATE INDEX attachment_by_rrll
  ON endorsement_attachments (tenant_id, rrll_endorsement_id)
  WHERE rrll_endorsement_id IS NOT NULL;
```

**Supuestos:** las tablas destino y claves candidatas compuestas ya existen. Las columnas FK opcionales permiten `NULL`, pero el CHECK prohíbe cero o dos dueños; la FK compuesta valida referencias no nulas. Definir `ON DELETE` según retención y negocio (no asumir CASCADE). Si crecen los tipos, esta solución deja de ser adecuada.

### Drizzle — declarar restricciones verificables

Usar `pgTable`, `foreignKey`, `check`, `index` y `sql` siguiendo **la API de la versión instalada**, no copiar imports basándose solo en este ejemplo. Un fragmento ilustrativo:

```ts
check('attachment_exactly_one_owner',
  sql`num_nonnulls(${table.rrllEndorsementId}, ${table.vehicleEndorsementId}) = 1`)
```

Las definiciones Drizzle son **fuente de esquema**, pero la garantía se comprueba contra el **SQL de migración y PostgreSQL real**. No confundir `relations()` (facilita consultas) con FKs de integridad.

## Ejemplo 3 — Supertipo con subtipos

Si RRLL y vehículo comparten identidad, ownership y ciclo de vida *de endoso*:

```sql
CREATE TABLE endorsements (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('RRLL', 'VEHICLE')),
  policy_id uuid NOT NULL,
  UNIQUE (tenant_id, id),
  UNIQUE (tenant_id, id, kind),
  FOREIGN KEY (tenant_id, policy_id) REFERENCES policies(tenant_id, id)
);
CREATE TABLE rrll_endorsements (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'RRLL' CHECK (kind = 'RRLL'),
  FOREIGN KEY (tenant_id, id, kind)
    REFERENCES endorsements(tenant_id, id, kind)
);
CREATE TABLE endorsement_attachments (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  endorsement_id uuid NOT NULL,
  FOREIGN KEY (tenant_id, endorsement_id)
    REFERENCES endorsements(tenant_id, id)
);
```

**Advertencia:** el ejemplo valida que un subtipo enlazado declare el discriminante correcto; **no garantiza por sí solo** que cada fila de `endorsements` tenga exactamente un subtipo. Eso requiere transacción/caso de uso y tests, o un mecanismo DB adicional bien justificado. No elegir un supertipo únicamente para evitar dos FKs: solo si su semántica de negocio es real.

## Patrón riesgoso — `type/id` sin FK

```text
# ❌ Antipatrón por defecto
attachments(target_type, target_id, tenant_id)
# target_type = POLICY | RRLL_ENDORSEMENT | USER
```

La DB no comprueba por una FK convencional que `target_id` exista en la tabla correcta. Además, una fila válida puede quedar huérfana tras borrado, cambio de tipo o migración. Laravel `morphTo`/`morphMany` resuelve *asociaciones del ORM*, no arregla automáticamente esa carencia relacional; Drizzle tampoco crea una FK multi-tabla a partir de un discriminante.

Si una decisión excepcional acepta esa deuda:

1. Registrar ADR con motivo, dueños, tipos **permitidos** y plan de evolución.
2. Rechazar valores arbitrarios para `target_type`; catálogo controlado y validado.
3. Garantizar `tenant_id` desde identidad autenticada, autorización del objeto destino y comprobación de existencia en operación transaccional cuando sea viable.
4. Diseñar borrados/retención, consistencia concurrente, reconciliación periódica y métrica de huérfanos; no prometer atomicidad entre servicios.
5. Documentar índices en `(tenant_id, target_type, target_id)` según workload y probar plan real.
6. Si se usan triggers de validación, auditar su concurrencia, bloqueos y evolución de tipos; **no presumir** equivalencia a FK estándar.

## N:M, self-reference, historial y snapshots

- N:M: declarar pivote con ambas FKs y `UNIQUE (tenant_id, left_id, right_id)`; añadir atributos/periodos a la pivote cuando el negocio los requiere, no esconderlos en JSONB.
- Self-reference: FK en la misma tabla, evitar ciclos si son inválidos mediante controles medibles; una FK simple **no** comprueba aciclicidad.
- Histórico: un snapshot inmutable de nombre, tasa o importe documenta *qué se aprobó*; no sustituye la FK si la relación activa debe existir.
- Soft delete: decidir qué ocurre con referencias, consultas históricas y reactivación; el filtrado ORM no impide por sí solo enlaces a filas borradas lógicamente.
- Datos sensibles: autorización por recurso/tenant antes de materializar respuestas, no solo UI; URLs presigned y claves de objeto no se convierten en FKs.

## Migración desde un `type/id` heredado

**Expand:** crear nuevo owner/supertipo/pivote + índices y controles, sin borrar columnas; **backfill:** mapear con checkpoint idempotente por tenant y auditar targets inexistentes; **dual-read temporal:** comparar conteos y semántica sin duplicar side effects; **contract:** migrar consumidores, medir huérfanos cero según política, retirar columnas antiguas en una release separada. Vigilar locks, WAL, lag y memoria; el plan de rollback distingue reversión de aplicación de reversión de esquema. Ver [migraciones](migrations-and-backups.md).

## Gates de integración (pruebas **reales**, no solo unit mocks)

| Caso de prueba | Criterio |
|---|---|
| FK válida | Inserción válida persiste y se lee en tenant correcto |
| Target inexistente | Inserción rechazada por constraint |
| Target de otro tenant | Rechazo por FK compuesta y por autorización |
| Cero o dos FK alternativas | CHECK rechaza ambas variantes |
| Paralelismo crear/borrar | No quedan huérfanos contra las garantías elegidas |
| Cascada o retención | Cumple norma de borrado sin pérdida inesperada |
| Migración/up-down | Expand y rollback **operativo** probados en PostgreSQL de pruebas |
| Plan de consulta | `EXPLAIN (ANALYZE, BUFFERS)` con datos representativos cuando hay riesgo |
| Laravel/Drizzle | Comprobar SQL generado: constraints existen realmente |
| API consumidora | Contrato y recursos tenant mantienen compatibilidad |

**No declarar PASS** sin evidencias; un servicio DB sin `psql` o sin migraciones verificadas es `BLOCKED`/`NOT_RUN`, no apto para cerrar gate. Para evaluar carga y preflight: [SQL performance](sql-performance.md) y [E2E preflight](../testing/environment-preflight-and-e2e.md).

## Checklist antes de recomendar polimorfismo

- ¿Cuál es la entidad propietaria? ¿Qué bounded context gobierna los cambios?
- ¿Existen tipos realmente cerrados o aparece una lista arbitraria de módulos?
- ¿Puede PostgreSQL proteger cada FK, UNIQUE, CHECK e identidad tenant?
- ¿Qué pasa con borrado, auditoría, eventos, migraciones y rollback?
- ¿Qué SQL y casos negativos prueban la integridad, no solo el ORM?
- ¿Hay una alternativa relacional más simple?

✅ **Correcto:** FK convencional o supertipo real cuando conserva integridad y simplifica consumers.

❌ **Incorrecto:** aplicar `morphTo`/`commentable_type` por defecto, perder FKs/tenant y llamar al diseño «DDD» por usar una interfaz.

**Relacionados:** [transacciones](transactions.md), [gobierno de datos](governance.md), [técnicas de migración](migrations-and-backups.md), [trazabilidad del caso de uso](../engineering/use-case-traceability.md).
